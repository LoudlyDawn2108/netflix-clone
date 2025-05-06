import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { IpSecurity } from '../../users/entities/ip-security.entity';
import { SecurityAuditService } from './security-audit.service';
import { EmailService } from '../../email/email.service';

@Injectable()
export class IpSecurityService {
  // List of high-risk countries to block by default (if configured)
  private defaultBlockedCountries: string[] = [
    // Example list - would be configured from a data source in production
    'KP', // North Korea
  ];

  // Default IP rate limit tiers
  private ipRateLimitTiers = {
    trusted: 500, // 500 requests per minute
    standard: 100, // 100 requests per minute (default)
    restricted: 20, // 20 requests per minute
    blocked: 0, // No requests allowed
  };

  constructor(
    @InjectRepository(IpSecurity)
    private readonly ipSecurityRepository: Repository<IpSecurity>,
    private readonly configService: ConfigService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Check if an IP address is allowed (not blacklisted)
   */
  async isIpAllowed(
    ipAddress: string,
    userId?: string,
    geoData?: {
      countryCode?: string;
      countryName?: string;
      city?: string;
      region?: string;
    },
  ): Promise<{ allowed: boolean; reason?: string }> {
    // First check global IP blacklist
    const isGloballyBlacklisted = await this.isIpGloballyBlacklisted(ipAddress);
    if (isGloballyBlacklisted) {
      return { allowed: false, reason: 'IP address is blacklisted' };
    }

    // Check country-based restrictions
    if (geoData?.countryCode) {
      const isCountryBlocked = await this.isCountryBlocked(geoData.countryCode);
      if (isCountryBlocked) {
        return {
          allowed: false,
          reason: `Connections from ${geoData.countryName || geoData.countryCode} are not allowed`,
        };
      }
    }

    // If we have a specific user, check their IP security settings
    if (userId) {
      // Check user-specific IP restrictions
      const userIpSecurity = await this.ipSecurityRepository.findOne({
        where: {
          userId,
          ipAddress,
          isActive: true,
        },
      });

      if (userIpSecurity && userIpSecurity.type === 'blacklist') {
        return {
          allowed: false,
          reason:
            userIpSecurity.reason || 'IP address blocked for this account',
        };
      }

      // Check if user has IP whitelisting enabled (where only specific IPs are allowed)
      const hasWhitelistMode = await this.userHasWhitelistMode(userId);
      if (hasWhitelistMode) {
        const isWhitelisted = await this.isIpWhitelistedForUser(
          userId,
          ipAddress,
        );
        if (!isWhitelisted) {
          return {
            allowed: false,
            reason: 'This IP address is not in your allowed list',
          };
        }
      }
    }

    // All checks passed, IP is allowed
    return { allowed: true };
  }

  /**
   * Check if an IP is in the global blacklist
   */
  private async isIpGloballyBlacklisted(ipAddress: string): Promise<boolean> {
    // Check for global blacklist entries (no specific user)
    const blacklist = await this.ipSecurityRepository.findOne({
      where: {
        userId: null, // Global rule
        ipAddress,
        type: 'blacklist',
        isActive: true,
      },
    });

    return !!blacklist;
  }

  /**
   * Check if a country is blocked by default
   */
  private async isCountryBlocked(countryCode: string): Promise<boolean> {
    // Check configuration for blocked countries
    const blockedCountries =
      this.configService.get<string[]>('security.blockedCountries') ||
      this.defaultBlockedCountries;

    return blockedCountries.includes(countryCode);
  }

  /**
   * Check if a user has IP whitelist mode enabled
   * (where only explicitly whitelisted IPs are allowed)
   */
  private async userHasWhitelistMode(userId: string): Promise<boolean> {
    const whitelist = await this.ipSecurityRepository.find({
      where: {
        userId,
        type: 'whitelist',
        isActive: true,
      },
    });

    // If user has any whitelist entries, we consider whitelist mode enabled
    return whitelist.length > 0;
  }

  /**
   * Check if an IP is whitelisted for a specific user
   */
  private async isIpWhitelistedForUser(
    userId: string,
    ipAddress: string,
  ): Promise<boolean> {
    const whitelist = await this.ipSecurityRepository.findOne({
      where: {
        userId,
        ipAddress,
        type: 'whitelist',
        isActive: true,
      },
    });

    return !!whitelist;
  }

  /**
   * Add an IP to a user's whitelist
   */
  async addIpToWhitelist(
    userId: string,
    ipAddress: string,
    geoData?: {
      countryCode?: string;
      countryName?: string;
      city?: string;
      region?: string;
    },
  ): Promise<IpSecurity> {
    // Check if entry already exists
    let ipSecurity = await this.ipSecurityRepository.findOne({
      where: {
        userId,
        ipAddress,
      },
    });

    if (ipSecurity) {
      // Update existing entry
      ipSecurity.type = 'whitelist';
      ipSecurity.isActive = true;
      // Update geo data if provided
      if (geoData) {
        ipSecurity.countryCode = geoData.countryCode;
        ipSecurity.countryName = geoData.countryName;
        ipSecurity.city = geoData.city;
        ipSecurity.region = geoData.region;
      }
    } else {
      // Create new entry
      ipSecurity = this.ipSecurityRepository.create({
        userId,
        ipAddress,
        type: 'whitelist',
        countryCode: geoData?.countryCode,
        countryName: geoData?.countryName,
        city: geoData?.city,
        region: geoData?.region,
        isActive: true,
      });
    }

    const saved = await this.ipSecurityRepository.save(ipSecurity);

    // Log the action
    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: 'ip_whitelist_added',
      eventSeverity: 'info',
      message: `IP ${ipAddress} added to whitelist`,
      ipAddress,
      location: geoData
        ? `${geoData.city || ''}, ${geoData.region || ''}, ${geoData.countryName || ''}`
        : undefined,
    });

    return saved;
  }

  /**
   * Add an IP to a user's blacklist
   */
  async addIpToBlacklist(
    userId: string,
    ipAddress: string,
    reason?: string,
    geoData?: {
      countryCode?: string;
      countryName?: string;
      city?: string;
      region?: string;
    },
  ): Promise<IpSecurity> {
    // Check if entry already exists
    let ipSecurity = await this.ipSecurityRepository.findOne({
      where: {
        userId,
        ipAddress,
      },
    });

    if (ipSecurity) {
      // Update existing entry
      ipSecurity.type = 'blacklist';
      ipSecurity.isActive = true;
      ipSecurity.reason = reason;
      // Update geo data if provided
      if (geoData) {
        ipSecurity.countryCode = geoData.countryCode;
        ipSecurity.countryName = geoData.countryName;
        ipSecurity.city = geoData.city;
        ipSecurity.region = geoData.region;
      }
    } else {
      // Create new entry
      ipSecurity = this.ipSecurityRepository.create({
        userId,
        ipAddress,
        type: 'blacklist',
        reason,
        countryCode: geoData?.countryCode,
        countryName: geoData?.countryName,
        city: geoData?.city,
        region: geoData?.region,
        isActive: true,
      });
    }

    const saved = await this.ipSecurityRepository.save(ipSecurity);

    // Log the action
    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: 'ip_blacklist_added',
      eventSeverity: 'warning',
      message: `IP ${ipAddress} added to blacklist${reason ? ': ' + reason : ''}`,
      ipAddress,
      location: geoData
        ? `${geoData.city || ''}, ${geoData.region || ''}, ${geoData.countryName || ''}`
        : undefined,
    });

    return saved;
  }

  /**
   * Add an IP to the global blacklist (affects all users)
   */
  async addIpToGlobalBlacklist(
    ipAddress: string,
    reason: string,
    adminUserId: string,
    geoData?: {
      countryCode?: string;
      countryName?: string;
      city?: string;
      region?: string;
    },
    expiresAt?: Date,
  ): Promise<IpSecurity> {
    // Check if entry already exists
    let ipSecurity = await this.ipSecurityRepository.findOne({
      where: {
        userId: null, // Global rule
        ipAddress,
      },
    });

    if (ipSecurity) {
      // Update existing entry
      ipSecurity.type = 'blacklist';
      ipSecurity.isActive = true;
      ipSecurity.reason = reason;
      ipSecurity.expiresAt = expiresAt;
      // Update geo data if provided
      if (geoData) {
        ipSecurity.countryCode = geoData.countryCode;
        ipSecurity.countryName = geoData.countryName;
        ipSecurity.city = geoData.city;
        ipSecurity.region = geoData.region;
      }
    } else {
      // Create new entry
      ipSecurity = this.ipSecurityRepository.create({
        userId: null, // Global rule
        ipAddress,
        type: 'blacklist',
        reason,
        countryCode: geoData?.countryCode,
        countryName: geoData?.countryName,
        city: geoData?.city,
        region: geoData?.region,
        isActive: true,
        expiresAt,
      });
    }

    const saved = await this.ipSecurityRepository.save(ipSecurity);

    // Log the action
    await this.securityAuditService.logSecurityEvent({
      userId: adminUserId,
      eventType: 'global_ip_blacklist_added',
      eventSeverity: 'warning',
      message: `IP ${ipAddress} added to global blacklist: ${reason}`,
      ipAddress,
      location: geoData
        ? `${geoData.city || ''}, ${geoData.region || ''}, ${geoData.countryName || ''}`
        : undefined,
      eventData: { expiresAt },
    });

    return saved;
  }

  /**
   * Remove an IP from a user's whitelist or blacklist
   */
  async removeIpRestriction(
    userId: string,
    ipAddress: string,
  ): Promise<boolean> {
    const ipSecurity = await this.ipSecurityRepository.findOne({
      where: {
        userId,
        ipAddress,
        isActive: true,
      },
    });

    if (!ipSecurity) {
      return false;
    }

    // Soft-delete by marking inactive
    ipSecurity.isActive = false;
    await this.ipSecurityRepository.save(ipSecurity);

    // Log the action
    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: `ip_${ipSecurity.type}_removed`,
      eventSeverity: 'info',
      message: `IP ${ipAddress} removed from ${ipSecurity.type}`,
      ipAddress,
    });

    return true;
  }

  /**
   * Get all active IP security settings for a user
   */
  async getUserIpSecuritySettings(userId: string): Promise<IpSecurity[]> {
    return this.ipSecurityRepository.find({
      where: {
        userId,
        isActive: true,
      },
      order: {
        type: 'ASC',
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Mark an IP as suspicious
   */
  async markIpAsSuspicious(
    ipAddress: string,
    reason: string,
    geoData?: {
      countryCode?: string;
      countryName?: string;
      city?: string;
      region?: string;
    },
    userId?: string,
  ): Promise<IpSecurity> {
    // Create suspicious IP entry
    const ipSecurity = this.ipSecurityRepository.create({
      userId,
      ipAddress,
      type: 'suspicious',
      reason,
      countryCode: geoData?.countryCode,
      countryName: geoData?.countryName,
      city: geoData?.city,
      region: geoData?.region,
      isActive: true,
    });

    const saved = await this.ipSecurityRepository.save(ipSecurity);

    // Log the action
    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: 'ip_marked_suspicious',
      eventSeverity: 'warning',
      message: `IP ${ipAddress} marked as suspicious: ${reason}`,
      ipAddress,
      location: geoData
        ? `${geoData.city || ''}, ${geoData.region || ''}, ${geoData.countryName || ''}`
        : undefined,
      isSuspicious: true,
    });

    return saved;
  }

  /**
   * Get the rate limit for an IP address
   * This could be used with a rate limiting middleware
   */
  async getIpRateLimit(ipAddress: string, userId?: string): Promise<number> {
    // Check if this is a trusted IP
    const ipSecurity = await this.ipSecurityRepository.findOne({
      where: [
        { ipAddress, userId: null, type: 'whitelist', isActive: true },
        { ipAddress, userId, type: 'whitelist', isActive: true },
      ],
    });

    if (ipSecurity) {
      return this.ipRateLimitTiers.trusted;
    }

    // Check if this is a restricted IP
    const restrictedIp = await this.ipSecurityRepository.findOne({
      where: [{ ipAddress, userId: null, type: 'suspicious', isActive: true }],
    });

    if (restrictedIp) {
      return this.ipRateLimitTiers.restricted;
    }

    // Default rate limit
    return this.ipRateLimitTiers.standard;
  }

  /**
   * Detect VPN/Proxy usage based on IP characteristics
   * In a real implementation, this would use a third-party service
   */
  async detectVpnOrProxy(ipAddress: string): Promise<boolean> {
    // This is a placeholder - in a real implementation,
    // integrate with a service like MaxMind or IPQualityScore

    // For demo purposes, we'll use a simplified list of known VPN ranges
    const knownVpnRanges = ['162.158.', '103.21.244.', '104.16.', '172.64.'];

    return knownVpnRanges.some((range) => ipAddress.startsWith(range));
  }

  /**
   * Detect Tor exit node
   * In a real implementation, this would use a list of known Tor exit nodes
   */
  async detectTorExitNode(ipAddress: string): Promise<boolean> {
    // This is a placeholder - in a real implementation,
    // use a Tor exit node list service or API

    // For demo purposes, we'll return false
    return false;
  }
}
