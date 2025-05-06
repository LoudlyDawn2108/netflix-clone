import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TokenCacheService } from '../../../core/cache/token-cache.service';
import { ComplianceAuditService } from './compliance-audit.service';
import { EventsService } from '../../events/events.service';
import { UserSession } from '../entities/user-session.entity';
import { User } from '../../users/entities/user.entity';
import { AuditEventType } from './compliance-audit.service';

export interface SessionPolicy {
  maxConcurrentSessions: number;
  sessionDuration: number; // In seconds
  inactivityTimeout: number; // In seconds
  requireMfaForExtension: boolean;
  enforceSingleSession: boolean;
  restrictByIpRange: boolean;
  allowedIpRanges: string[];
  sessionSyncEnabled: boolean;
  crossDeviceLogout: boolean;
  absoluteSessionTimeout: number; // In seconds
}

export interface SessionInfo {
  id: string;
  userId: string;
  username: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  location?: string;
  appId?: string;
  mfaCompleted?: boolean;
  source?: string;
  active: boolean;
}

@Injectable()
export class SessionManagementService {
  private readonly logger = new Logger(SessionManagementService.name);
  private readonly defaultPolicy: SessionPolicy = {
    maxConcurrentSessions: 5,
    sessionDuration: 86400, // 24 hours
    inactivityTimeout: 3600, // 1 hour
    requireMfaForExtension: false,
    enforceSingleSession: false,
    restrictByIpRange: false,
    allowedIpRanges: [],
    sessionSyncEnabled: true,
    crossDeviceLogout: true,
    absoluteSessionTimeout: 604800, // 7 days
  };
  private sessionPolicies: Map<string, SessionPolicy> = new Map();

  constructor(
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    private readonly tokenCacheService: TokenCacheService,
    private readonly configService: ConfigService,
    private readonly complianceService: ComplianceAuditService,
    private readonly eventsService: EventsService,
  ) {
    this.initializeSessionPolicies();
  }

  /**
   * Initialize session policies from configuration
   */
  private initializeSessionPolicies(): void {
    try {
      const policiesConfig = this.configService.get('session.policies') || {};

      // Set global default policy
      const globalPolicy = this.configService.get('session.globalPolicy');
      if (globalPolicy) {
        this.defaultPolicy = { ...this.defaultPolicy, ...globalPolicy };
      }

      // Set role-specific policies
      for (const [role, policy] of Object.entries(policiesConfig)) {
        this.sessionPolicies.set(role, {
          ...this.defaultPolicy,
          ...(policy as Partial<SessionPolicy>),
        });
      }

      this.logger.log(
        `Initialized session policies for ${this.sessionPolicies.size} roles plus default policy`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize session policies: ${error.message}`,
      );
    }
  }

  /**
   * Create a new session
   */
  async createSession(
    user: User,
    ipAddress?: string,
    userAgent?: string,
    deviceId?: string,
    mfaCompleted?: boolean,
    source?: string,
  ): Promise<UserSession> {
    try {
      // Get applicable policy based on user roles
      const policy = this.getEffectivePolicy(user);

      // Check IP restriction if enabled
      if (policy.restrictByIpRange && ipAddress) {
        const allowed = this.checkIpAllowed(ipAddress, policy.allowedIpRanges);
        if (!allowed) {
          this.logger.warn(
            `Session creation blocked for user ${user.id} from restricted IP ${ipAddress}`,
          );

          // Log security event
          await this.complianceService.logEvent(AuditEventType.ACCESS_DENIED, {
            userId: user.id,
            username: user.email,
            ipAddress,
            userAgent,
            action: 'session-create',
            status: 'denied',
            details: {
              reason: 'ip-restricted',
            },
          });

          throw new Error(
            'Session creation not allowed from current IP address',
          );
        }
      }

      // Check concurrent session limit
      if (policy.maxConcurrentSessions > 0) {
        const activeSessions = await this.getActiveSessions(user.id);

        if (activeSessions.length >= policy.maxConcurrentSessions) {
          // If enforcing single session, terminate existing sessions
          if (policy.enforceSingleSession) {
            await Promise.all(
              activeSessions.map((session) =>
                this.terminateSession(session.id),
              ),
            );
          } else {
            this.logger.warn(
              `Session limit reached for user ${user.id}, has ${activeSessions.length} active sessions`,
            );

            // Log security event
            await this.complianceService.logEvent(
              AuditEventType.SESSION_CREATED,
              {
                userId: user.id,
                username: user.email,
                ipAddress,
                userAgent,
                action: 'session-create',
                status: 'denied',
                details: {
                  reason: 'max-sessions-reached',
                  currentCount: activeSessions.length,
                  maxAllowed: policy.maxConcurrentSessions,
                },
              },
            );

            throw new Error('Maximum number of concurrent sessions reached');
          }
        }
      }

      // Calculate expiration based on policy
      const now = new Date();
      const expiresAt = new Date(now.getTime() + policy.sessionDuration * 1000);

      // Create session record
      const session = new UserSession();
      session.id = uuidv4();
      session.userId = user.id;
      session.username = user.email;
      session.ipAddress = ipAddress;
      session.userAgent = userAgent;
      session.deviceId = deviceId;
      session.createdAt = now;
      session.lastActivityAt = now;
      session.expiresAt = expiresAt;
      session.active = true;
      session.mfaCompleted = mfaCompleted || false;
      session.source = source || 'direct';

      // Add approximate location based on IP (if available)
      if (ipAddress) {
        try {
          session.location = await this.getLocationFromIp(ipAddress);
        } catch (err) {
          this.logger.debug(`Error getting location from IP: ${err.message}`);
        }
      }

      // Save session
      const savedSession = await this.sessionRepository.save(session);

      // Store session in cache for quick access
      await this.tokenCacheService.storeSession(
        session.id,
        JSON.stringify({
          id: session.id,
          userId: session.userId,
          expiresAt: session.expiresAt.getTime(),
          lastActivityAt: session.lastActivityAt.getTime(),
          mfaCompleted: session.mfaCompleted,
          active: session.active,
        }),
        policy.sessionDuration,
      );

      // Emit session created event
      await this.eventsService.emitSessionCreated(savedSession);

      // Log security event
      await this.complianceService.logEvent(AuditEventType.SESSION_CREATED, {
        userId: user.id,
        username: user.email,
        ipAddress,
        userAgent,
        sessionId: session.id,
        action: 'session-create',
        status: 'success',
        details: {
          deviceId,
          source: session.source,
          mfaCompleted: session.mfaCompleted,
          expiresAt: session.expiresAt.toISOString(),
        },
      });

      return savedSession;
    } catch (error) {
      this.logger.error(`Failed to create session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate and update session activity
   */
  async validateSession(
    sessionId: string,
    userId?: string,
    ipAddress?: string,
  ): Promise<{
    valid: boolean;
    session?: UserSession;
    reason?: string;
  }> {
    try {
      // Check cache first for performance
      const cachedSession = await this.tokenCacheService.getSession(sessionId);

      if (cachedSession) {
        const sessionData = JSON.parse(cachedSession);

        // Validate session from cache
        if (
          !sessionData.active ||
          (userId && sessionData.userId !== userId) ||
          sessionData.expiresAt < Date.now()
        ) {
          return {
            valid: false,
            reason: !sessionData.active
              ? 'inactive'
              : userId && sessionData.userId !== userId
                ? 'user-mismatch'
                : 'expired',
          };
        }

        // Session is valid from cache, fetch full data
        const session = await this.sessionRepository.findOne({
          where: { id: sessionId },
        });

        if (!session) {
          // Something is wrong, session in cache but not in DB
          await this.tokenCacheService.deleteSession(sessionId);
          return { valid: false, reason: 'not-found' };
        }

        // Check IP restriction (if enabled)
        const policy = await this.getUserSessionPolicy(session.userId);

        if (policy.restrictByIpRange && ipAddress) {
          const allowed = this.checkIpAllowed(
            ipAddress,
            policy.allowedIpRanges,
          );
          if (!allowed) {
            await this.terminateSession(sessionId, 'ip-restriction');
            return { valid: false, reason: 'ip-restricted' };
          }
        }

        // Check inactivity timeout
        const inactivityThreshold = new Date();
        inactivityThreshold.setSeconds(
          inactivityThreshold.getSeconds() - policy.inactivityTimeout,
        );

        if (session.lastActivityAt < inactivityThreshold) {
          await this.terminateSession(sessionId, 'inactivity');
          return { valid: false, reason: 'inactivity-timeout' };
        }

        // Update last activity
        await this.updateSessionActivity(sessionId);

        return { valid: true, session };
      } else {
        // Not in cache, check database
        const session = await this.sessionRepository.findOne({
          where: { id: sessionId },
        });

        if (!session) {
          return { valid: false, reason: 'not-found' };
        }

        if (!session.active) {
          return { valid: false, reason: 'inactive' };
        }

        if (userId && session.userId !== userId) {
          return { valid: false, reason: 'user-mismatch' };
        }

        if (session.expiresAt < new Date()) {
          await this.terminateSession(sessionId, 'expired');
          return { valid: false, reason: 'expired' };
        }

        // Check IP restriction (if enabled)
        const policy = await this.getUserSessionPolicy(session.userId);

        if (policy.restrictByIpRange && ipAddress) {
          const allowed = this.checkIpAllowed(
            ipAddress,
            policy.allowedIpRanges,
          );
          if (!allowed) {
            await this.terminateSession(sessionId, 'ip-restriction');
            return { valid: false, reason: 'ip-restricted' };
          }
        }

        // Check inactivity timeout
        const inactivityThreshold = new Date();
        inactivityThreshold.setSeconds(
          inactivityThreshold.getSeconds() - policy.inactivityTimeout,
        );

        if (session.lastActivityAt < inactivityThreshold) {
          await this.terminateSession(sessionId, 'inactivity');
          return { valid: false, reason: 'inactivity-timeout' };
        }

        // Update last activity and cache
        await this.updateSessionActivity(sessionId);

        return { valid: true, session };
      }
    } catch (error) {
      this.logger.error(`Failed to validate session: ${error.message}`);
      return { valid: false, reason: 'error' };
    }
  }

  /**
   * Update session activity timestamp
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const now = new Date();

      // Update in database
      await this.sessionRepository.update(
        { id: sessionId },
        { lastActivityAt: now },
      );

      // Update in cache
      const cachedSession = await this.tokenCacheService.getSession(sessionId);

      if (cachedSession) {
        const sessionData = JSON.parse(cachedSession);
        sessionData.lastActivityAt = now.getTime();

        const policy = await this.getUserSessionPolicy(sessionData.userId);

        await this.tokenCacheService.storeSession(
          sessionId,
          JSON.stringify(sessionData),
          policy.sessionDuration,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to update session activity: ${error.message}`);
    }
  }

  /**
   * Mark MFA as completed for a session
   */
  async completeMfa(sessionId: string): Promise<void> {
    try {
      // Update in database
      await this.sessionRepository.update(
        { id: sessionId },
        { mfaCompleted: true },
      );

      // Update in cache
      const cachedSession = await this.tokenCacheService.getSession(sessionId);

      if (cachedSession) {
        const sessionData = JSON.parse(cachedSession);
        sessionData.mfaCompleted = true;

        const policy = await this.getUserSessionPolicy(sessionData.userId);

        await this.tokenCacheService.storeSession(
          sessionId,
          JSON.stringify(sessionData),
          policy.sessionDuration,
        );
      }

      // Get full session data
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId },
      });

      // Log security event
      if (session) {
        await this.complianceService.logEvent(AuditEventType.MFA_SUCCESS, {
          userId: session.userId,
          username: session.username,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          sessionId: session.id,
          action: 'mfa',
          status: 'success',
        });
      }
    } catch (error) {
      this.logger.error(`Failed to complete MFA for session: ${error.message}`);
    }
  }

  /**
   * Extend session duration
   */
  async extendSession(
    sessionId: string,
    requireMfa: boolean = false,
  ): Promise<boolean> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId },
      });

      if (!session || !session.active) {
        return false;
      }

      const policy = await this.getUserSessionPolicy(session.userId);

      // Check if MFA is required
      if (requireMfa || policy.requireMfaForExtension) {
        if (!session.mfaCompleted) {
          this.logger.warn(`MFA required to extend session ${sessionId}`);
          return false;
        }
      }

      // Calculate new expiration
      const now = new Date();
      const newExpiration = new Date(
        now.getTime() + policy.sessionDuration * 1000,
      );

      // Check absolute session timeout
      const creationPlusAbsolute = new Date(
        session.createdAt.getTime() + policy.absoluteSessionTimeout * 1000,
      );

      const effectiveExpiration =
        creationPlusAbsolute < newExpiration
          ? creationPlusAbsolute
          : newExpiration;

      // Update session
      await this.sessionRepository.update(
        { id: sessionId },
        {
          expiresAt: effectiveExpiration,
          lastActivityAt: now,
        },
      );

      // Update cache
      const cachedSession = await this.tokenCacheService.getSession(sessionId);

      if (cachedSession) {
        const sessionData = JSON.parse(cachedSession);
        sessionData.expiresAt = effectiveExpiration.getTime();
        sessionData.lastActivityAt = now.getTime();

        await this.tokenCacheService.storeSession(
          sessionId,
          JSON.stringify(sessionData),
          Math.ceil((effectiveExpiration.getTime() - now.getTime()) / 1000),
        );
      }

      // Log session extension
      await this.complianceService.logEvent('session.extended', {
        userId: session.userId,
        username: session.username,
        sessionId: session.id,
        action: 'session-extend',
        status: 'success',
        details: {
          newExpiresAt: effectiveExpiration.toISOString(),
          limitedByAbsoluteTimeout: creationPlusAbsolute < newExpiration,
        },
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to extend session: ${error.message}`);
      return false;
    }
  }

  /**
   * Terminate a session
   */
  async terminateSession(
    sessionId: string,
    reason: string = 'user-logout',
  ): Promise<void> {
    try {
      // Get session first to capture details for logging
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId },
      });

      if (!session) {
        return;
      }

      // Update session in DB
      await this.sessionRepository.update({ id: sessionId }, { active: false });

      // Remove from cache
      await this.tokenCacheService.deleteSession(sessionId);

      // Log session termination
      await this.complianceService.logEvent(AuditEventType.SESSION_TERMINATED, {
        userId: session.userId,
        username: session.username,
        ipAddress: session.ipAddress,
        sessionId: session.id,
        action: 'session-terminate',
        status: 'success',
        details: { reason },
      });

      // If cross-device logout is enabled, emit session terminated event
      const policy = await this.getUserSessionPolicy(session.userId);

      if (policy.crossDeviceLogout) {
        await this.eventsService.emitSessionTerminated(session, reason);
      }
    } catch (error) {
      this.logger.error(`Failed to terminate session: ${error.message}`);
    }
  }

  /**
   * Terminate all sessions for a user
   */
  async terminateAllUserSessions(
    userId: string,
    exceptSessionId?: string,
    reason: string = 'user-logout-all',
  ): Promise<number> {
    try {
      // Get active sessions
      const query = this.sessionRepository
        .createQueryBuilder('session')
        .where('session.userId = :userId', { userId })
        .andWhere('session.active = :active', { active: true });

      // Exclude specific session if requested
      if (exceptSessionId) {
        query.andWhere('session.id != :exceptSessionId', { exceptSessionId });
      }

      const sessions = await query.getMany();

      // Terminate each session
      for (const session of sessions) {
        await this.terminateSession(session.id, reason);
      }

      return sessions.length;
    } catch (error) {
      this.logger.error(`Failed to terminate user sessions: ${error.message}`);
      return 0;
    }
  }

  /**
   * Synchronize session state with external provider
   */
  async syncExternalProviderSession(
    userId: string,
    provider: string,
    action: 'login' | 'logout' | 'status-check',
    externalSessionId?: string,
  ): Promise<boolean> {
    try {
      // Get user's session policy
      const policy = await this.getUserSessionPolicy(userId);

      if (!policy.sessionSyncEnabled) {
        return true;
      }

      // Implementation would connect to external provider's API
      // to check or update session status
      // This is a placeholder for actual implementation
      this.logger.log(
        `[Placeholder] Session sync with ${provider} for user ${userId}, action: ${action}`,
      );

      if (action === 'logout') {
        // Would call SSO provider's logout API
        // For now, just log the attempt
        this.logger.log(
          `[Placeholder] Called ${provider} session termination API`,
        );

        await this.complianceService.logEvent('external.session.terminated', {
          userId,
          action: 'external-session-terminate',
          status: 'success',
          details: {
            provider,
            externalSessionId,
          },
        });
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to sync with external provider: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getActiveSessions(userId: string): Promise<UserSession[]> {
    try {
      return this.sessionRepository.find({
        where: {
          userId,
          active: true,
          expiresAt: MoreThan(new Date()),
        },
        order: { lastActivityAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get active sessions: ${error.message}`);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.sessionRepository.update(
        {
          active: true,
          expiresAt: LessThan(new Date()),
        },
        { active: false },
      );

      if (result.affected > 0) {
        this.logger.log(`Cleaned up ${result.affected} expired sessions`);
      }

      return result.affected || 0;
    } catch (error) {
      this.logger.error(`Failed to cleanup expired sessions: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get user's effective session policy
   */
  async getUserSessionPolicy(userId: string): Promise<SessionPolicy> {
    // This would typically fetch the user's roles from the database
    // and then determine the most restrictive policy that applies
    // For now, we'll use the default policy
    return this.defaultPolicy;
  }

  /**
   * Get the effective session policy for a user
   */
  private getEffectivePolicy(user: User): SessionPolicy {
    // Find the most restrictive policy based on user roles
    let effectivePolicy = { ...this.defaultPolicy };

    // This would typically check user's roles and apply appropriate policies
    // For simplicity, we're just using default policy

    return effectivePolicy;
  }

  /**
   * Check if an IP address is allowed based on configured ranges
   * Uses CIDR notation for IP ranges (e.g., 192.168.1.0/24)
   */
  private checkIpAllowed(ipAddress: string, allowedRanges: string[]): boolean {
    // Simplified implementation - would use actual IP range checking
    // like the 'ip' npm package in a real implementation
    if (!allowedRanges || allowedRanges.length === 0) {
      return true; // No restrictions if no ranges defined
    }

    // For simplicity, just log and return true
    // In a real implementation, we would check if IP falls within any allowed range
    this.logger.debug(
      `[Placeholder] Checking if IP ${ipAddress} is allowed in ranges: ${allowedRanges.join(', ')}`,
    );

    return true;
  }

  /**
   * Get approximate location from IP address
   */
  private async getLocationFromIp(ipAddress: string): Promise<string> {
    // In a real implementation, this would call a geo-IP service
    // For simplicity, we'll return a placeholder
    return 'Unknown Location';
  }
}

// Import these for TypeORM operators
import { LessThan, MoreThan } from 'typeorm';
