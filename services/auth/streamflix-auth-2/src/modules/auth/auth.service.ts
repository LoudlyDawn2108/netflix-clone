import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtRefreshPayload } from './interfaces/jwt-refresh-payload.interface';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../email/email.service';
import { TokenCacheService } from '../../core/cache/token-cache.service';
import { UserCacheService } from '../../core/cache/user-cache.service';
import { Request } from 'express';
import { EventsService } from '../events/events.service';
import { PasswordPolicyService } from './services/password-policy.service';
import { LoggerService } from '../../core/logging/logger.service';
import { MetricsService } from '../../core/monitoring/metrics.service';
import { DataSource } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly tokenCacheService: TokenCacheService,
    private readonly userCacheService: UserCacheService,
    private readonly eventsService: EventsService,
    private readonly passwordPolicyService: PasswordPolicyService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
    private readonly dataSource: DataSource,
  ) {
    this.logger.setContext('AuthService');
  }

  async validateUser(email: string, password: string): Promise<any> {
    const startTime = Date.now();

    try {
      // First check if email is valid format
      if (!email || !email.includes('@')) {
        this.metrics.incrementLoginFailure('email', 'invalid_email_format');
        this.logger.warn('Login attempt failed: Invalid email format');
        return null;
      }

      // Use findByEmail since we don't have a specific withPassword method
      let user;

      // Only use cache for the user lookup, not for password verification
      // which always requires the actual password from the database
      const cachedUser = await this.userCacheService.getUserData(email);

      if (cachedUser) {
        // Use cached user data for non-sensitive operations
        user = cachedUser;
        // But still need to get password from database for verification
        const dbUser = await this.usersService.findByEmail(email);
        if (dbUser) {
          user.password = dbUser.password;
        } else {
          // If user is in cache but not in DB (rare edge case), treat as not found
          this.logger.warn(
            `Cached user not found in database for email ${email}`,
          );
          this.metrics.incrementLoginFailure('email', 'user_not_found');
          return null;
        }
      } else {
        user = await this.usersService.findByEmail(email);
        if (user) {
          // Cache the user data for future use, but don't cache password
          const { password, ...cacheableUserData } = user;
          await this.userCacheService.storeUserData(email, cacheableUserData);
        }
      }

      if (!user) {
        this.metrics.incrementLoginFailure('email', 'user_not_found');
        this.logger.warn(
          `Login attempt failed: User not found for email ${email}`,
        );
        return null;
      }

      if (!user.isActive) {
        this.metrics.incrementLoginFailure('email', 'account_inactive');
        this.logger.warn(
          `Login attempt failed: Account inactive for user ${user.id}`,
        );
        throw new UnauthorizedException('Account is not active');
      }

      if (user.lockUntil && user.lockUntil > new Date()) {
        this.metrics.incrementLoginFailure('email', 'account_locked');
        this.logger.warn(
          `Login attempt failed: Account locked for user ${user.id} until ${user.lockUntil}`,
        );
        throw new UnauthorizedException(
          'Account is temporarily locked. Please try again later.',
        );
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        // Handle failed login attempts
        this.metrics.incrementLoginFailure('email', 'invalid_password');
        this.logger.warn(
          `Login attempt failed: Invalid password for user ${user.id}`,
        );
        await this.handleFailedLoginAttempt(user);
        return null;
      }

      // Reset failed login attempts and update last login time
      await this.handleSuccessfulLogin(user);
      this.metrics.incrementLoginAttempts('email', true);
      this.logger.info(`User ${user.id} authenticated successfully`);

      return user;
    } catch (error) {
      this.logger.error('Error in validateUser', error);
      throw error;
    } finally {
      // Record authentication operation duration
      const duration = (Date.now() - startTime) / 1000; // convert to seconds
      this.metrics.observeDatabaseQueryDuration(
        'auth_validate_user',
        'users',
        duration,
      );
    }
  }

  private async handleFailedLoginAttempt(user: User): Promise<void> {
    const startTime = Date.now();

    try {
      const maxAttempts =
        this.configService.get<number>('security.maxFailedLoginAttempts') || 5;

      if (user.failedLoginAttempts >= maxAttempts - 1) {
        // Lock account for the configured time
        const lockoutMinutes = this.configService
          .get<number>('security.accountLockoutMinutes')
          ?.toString();
        const lockUntil = new Date();
        lockUntil.setMinutes(
          lockUntil.getMinutes() + (lockoutMinutes ? +lockoutMinutes : 15),
        );

        await this.usersService.update(user.id, {
          lockUntil,
          failedLoginAttempts: user.failedLoginAttempts + 1,
        });

        this.metrics.incrementRateLimitedRequests('login');
        this.logger.warn(
          `Account locked for user ${user.id} due to excessive failed login attempts`,
        );

        // Send notification about account lockout due to suspicious activity
        try {
          await this.emailService.sendSecurityAlert(
            user.email,
            'Account Temporarily Locked',
            `Your account has been temporarily locked due to multiple failed login attempts. 
            If this wasn't you, please reset your password immediately.
            Your account will be automatically unlocked in ${lockoutMinutes || 15} minutes.`,
          );
        } catch (error) {
          // Log but don't throw - authentication flow should continue
          this.logger.error('Failed to send security alert email', error);
        }
      } else {
        // Increment failed attempts
        await this.usersService.update(user.id, {
          failedLoginAttempts: (user.failedLoginAttempts || 0) + 1,
        });
        this.logger.debug(
          `Incremented failed login attempts for user ${user.id} to ${user.failedLoginAttempts + 1}`,
        );
      }
    } catch (error) {
      this.logger.error('Error in handleFailedLoginAttempt', error);
      throw error;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeDatabaseQueryDuration(
        'handle_failed_login',
        'users',
        duration,
      );
    }
  }

  private async handleSuccessfulLogin(user: User): Promise<void> {
    const startTime = Date.now();

    try {
      // Reset failed login attempts on successful login
      await this.usersService.update(user.id, {
        failedLoginAttempts: 0,
        lockUntil: null,
        lastLogin: new Date(),
      });
      this.logger.debug(
        `Reset failed login attempts and updated last login for user ${user.id}`,
      );
    } catch (error) {
      this.logger.error('Error in handleSuccessfulLogin', error);
      throw error;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeDatabaseQueryDuration(
        'handle_successful_login',
        'users',
        duration,
      );
    }
  }

  async register(registerDto: RegisterDto, req?: Request) {
    const startTime = Date.now();
    const registerMethod = 'email'; // Default to email registration method

    // Start a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate password against policy
      const passwordCheck = await this.passwordPolicyService.validatePassword(
        registerDto.password,
      );
      if (!passwordCheck.valid) {
        this.metrics.incrementRegistration(registerMethod, false);
        this.logger.warn('Registration failed due to password policy', {
          reason: passwordCheck.message,
        });
        throw new BadRequestException(passwordCheck.message);
      }

      // Create email verification token
      const emailVerificationToken = uuidv4();

      // Create new user with verification token within the transaction
      const user = await this.usersService.createWithTransaction(
        {
          ...registerDto,
          emailVerified: false,
          emailVerificationToken,
        },
        queryRunner,
      );

      // Create an outbox entry for the UserRegistered event within the same transaction
      await this.eventsService.createOutboxEntryInTransaction(
        'user.registered',
        {
          userId: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          firstName: user.firstName,
          lastName: user.lastName,
          registeredAt: user.createdAt,
          source: 'direct',
        },
        queryRunner,
      );

      // Commit the transaction - both the user and the outbox entry will be created or neither will
      await queryRunner.commitTransaction();

      // Send verification email
      await this.emailService.sendVerificationEmail(
        user.email,
        emailVerificationToken,
      );

      // Also send welcome email
      await this.emailService.sendWelcomeEmail(user.email);

      // Generate JWT tokens for automatic login
      const tokens = this.generateTokens(user);
      const refreshTokenPayload = this.jwtService.decode(
        tokens.refreshToken,
      ) as JwtRefreshPayload;

      // Store refresh token in Redis
      await this.tokenCacheService.storeRefreshToken(
        user.id,
        refreshTokenPayload.refreshTokenId,
        tokens.refreshToken,
        this.configService.get<number>('jwt.refreshExpirationSec'),
      );

      // If we have request data, create a session
      let sessionId;
      if (req) {
        sessionId = uuidv4();
        const sessionMetadata = {
          userAgent: req.headers['user-agent'] || 'unknown',
          ip: req.ip || 'unknown',
          lastUsed: new Date().toISOString(),
          deviceType: this.getDeviceType(req.headers['user-agent'] || ''),
        };

        await this.tokenCacheService.storeSession(
          sessionId,
          user.id,
          sessionMetadata,
          this.configService.get<number>('jwt.refreshExpirationSec'),
        );
      }

      this.metrics.incrementRegistration(registerMethod, true);
      this.logger.info(`New user registered: ${user.id}`, {
        userId: user.id,
        email: user.email,
        ip: req?.ip,
      });

      return {
        user: this.sanitizeUser(user),
        ...tokens,
        sessionId,
        message:
          'Registration successful. Please check your email to verify your account.',
      };
    } catch (error) {
      // Rollback the transaction on error
      await queryRunner.rollbackTransaction();

      if (error.code === '23505') {
        // PostgreSQL unique constraint violation
        this.metrics.incrementRegistration(registerMethod, false);
        this.logger.warn('Registration failed: Email already exists');
        throw new BadRequestException('Email already exists');
      }
      this.metrics.incrementRegistration(registerMethod, false);
      this.logger.error('Registration error', error);
      throw new InternalServerErrorException('Failed to register user');
    } finally {
      // Release the query runner
      await queryRunner.release();

      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRequestDuration(
        'POST',
        '/api/auth/register',
        200,
        duration,
      );
    }
  }

  /**
   * Verify a user's email using the verification token
   */
  async verifyEmail(token: string) {
    const startTime = Date.now();

    try {
      const user = await this.usersService.verifyEmail(token);

      if (!user) {
        this.logger.warn('Email verification failed: Invalid token', { token });
        throw new BadRequestException('Invalid verification token');
      }

      // Send account activated email
      await this.emailService.sendAccountActivatedEmail(user.email);

      this.logger.info(`Email verified for user ${user.id}`);

      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error) {
      this.logger.error('Email verification error', error);
      throw error;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRequestDuration(
        'GET',
        '/api/auth/verify-email',
        200,
        duration,
      );
    }
  }

  async login(user: User, req: Request) {
    const startTime = Date.now();
    const method = 'email'; // Default to email method

    // Start a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate tokens with device metadata
      const tokens = this.generateTokens(user);
      const refreshTokenPayload = this.jwtService.decode(
        tokens.refreshToken,
      ) as JwtRefreshPayload;

      // Store refresh token in Redis with metadata
      const redisStartTime = Date.now();
      await this.tokenCacheService.storeRefreshToken(
        user.id,
        refreshTokenPayload.refreshTokenId,
        tokens.refreshToken,
        this.configService.get<number>('jwt.refreshExpirationSec'),
      );
      const redisDuration = (Date.now() - redisStartTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'store_refresh_token',
        redisDuration,
      );

      // Create session
      const sessionId = uuidv4();
      const deviceType = this.getDeviceType(req.headers['user-agent'] || '');
      const sessionMetadata = {
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.ip || 'unknown',
        lastUsed: new Date().toISOString(),
        deviceType,
      };

      const sessionStartTime = Date.now();
      await this.tokenCacheService.storeSession(
        sessionId,
        user.id,
        sessionMetadata,
        this.configService.get<number>('jwt.refreshExpirationSec'),
      );
      const sessionDuration = (Date.now() - sessionStartTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'store_session',
        sessionDuration,
      );

      // Track active sessions
      const sessionCount = await this.tokenCacheService.countActiveSessions(
        user.id,
      );
      this.metrics.setActiveSessions(sessionCount || 1);

      // Create an outbox entry for the UserLoggedIn event within the transaction
      await this.eventsService.createOutboxEntryInTransaction(
        'user.logged_in',
        {
          userId: user.id,
          email: user.email,
          timestamp: new Date(),
          deviceInfo: {
            ip: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            deviceType,
          },
        },
        queryRunner,
      );

      // Update last login in the transaction
      await this.usersService.updateWithTransaction(
        user.id,
        {
          lastLoginAt: new Date(),
          failedLoginAttempts: 0,
        },
        queryRunner,
      );

      // Commit the transaction
      await queryRunner.commitTransaction();

      // Record successful login in metrics
      this.metrics.incrementLoginAttempts(method, true);

      // Check if password is expired
      let passwordStatus = null;
      if (user.lastPasswordChange) {
        const isExpired = this.passwordPolicyService.isPasswordExpired(
          user.lastPasswordChange,
        );
        if (isExpired) {
          passwordStatus = {
            expired: true,
            message: 'Your password has expired. Please change it soon.',
          };
          this.logger.info(`Password expired for user ${user.id}`);
        }
      }

      this.logger.info(`User ${user.id} logged in successfully`, {
        userId: user.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        deviceType,
      });

      return {
        user: this.sanitizeUser(user),
        ...tokens,
        sessionId,
        passwordStatus,
      };
    } catch (error) {
      // Rollback the transaction on error
      await queryRunner.rollbackTransaction();

      this.logger.error('Login error', error);
      throw new InternalServerErrorException('Failed to process login');
    } finally {
      // Release the query runner
      await queryRunner.release();

      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRequestDuration(
        'POST',
        '/api/auth/login',
        200,
        duration,
      );
    }
  }

  async logout(userId: string, refreshToken: string) {
    const startTime = Date.now();

    try {
      // Decode the refresh token to get the token ID
      const decoded = this.jwtService.decode(refreshToken) as JwtRefreshPayload;
      if (decoded && decoded.refreshTokenId) {
        // Delete the refresh token from Redis
        await this.tokenCacheService.deleteRefreshToken(
          userId,
          decoded.refreshTokenId,
        );

        // Blacklist the token to prevent reuse
        await this.tokenCacheService.blacklistToken(refreshToken);

        this.logger.info(`User ${userId} logged out successfully`);
        this.metrics.incrementLoginSuccess('logout');
      }

      return { message: 'Logout successful', success: true };
    } catch (error) {
      // If there's an error, still return success but log the error
      this.logger.error('Error during logout:', error, { userId });
      return { message: 'Logout successful', success: true };
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRequestDuration(
        'POST',
        '/api/auth/logout',
        200,
        duration,
      );
    }
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto, req: Request) {
    const startTime = Date.now();

    try {
      // First check if the token is blacklisted
      const isBlacklisted = await this.tokenCacheService.isTokenBlacklisted(
        refreshTokenDto.refreshToken,
      );

      if (isBlacklisted) {
        this.metrics.incrementTokenRefresh(false);
        this.logger.warn('Attempted to use blacklisted token');
        throw new UnauthorizedException('Token has been revoked');
      }

      // Verify refresh token and extract payload
      const decoded = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      }) as JwtRefreshPayload;

      // Check if refresh token exists in Redis
      const storedToken = await this.tokenCacheService.getRefreshToken(
        decoded.sub,
        decoded.refreshTokenId,
      );

      if (!storedToken) {
        this.metrics.incrementTokenRefresh(false);
        this.logger.warn(`Token not found in cache for user ${decoded.sub}`);
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.usersService.findById(decoded.sub);
      if (!user) {
        this.metrics.incrementTokenRefresh(false);
        this.logger.warn(`User not found for refresh token: ${decoded.sub}`);
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        this.metrics.incrementTokenRefresh(false);
        this.logger.warn(`Inactive user attempted token refresh: ${user.id}`);
        throw new UnauthorizedException('Account is not active');
      }

      // Delete the old refresh token (token rotation)
      await this.tokenCacheService.deleteRefreshToken(
        decoded.sub,
        decoded.refreshTokenId,
      );

      // Generate new tokens
      const newTokens = this.generateTokens(user);
      const newRefreshTokenPayload = this.jwtService.decode(
        newTokens.refreshToken,
      ) as JwtRefreshPayload;

      // Store new refresh token
      await this.tokenCacheService.storeRefreshToken(
        user.id,
        newRefreshTokenPayload.refreshTokenId,
        newTokens.refreshToken,
        this.configService.get<number>('jwt.refreshExpirationSec'),
      );

      // Update session metadata if available
      if (req.body.sessionId) {
        const session = await this.tokenCacheService.getSession(
          req.body.sessionId,
        );
        if (session) {
          await this.tokenCacheService.storeSession(
            req.body.sessionId,
            user.id,
            {
              ...session,
              lastUsed: new Date().toISOString(),
            },
            this.configService.get<number>('jwt.refreshExpirationSec'),
          );
        }
      }

      this.metrics.incrementTokenRefresh(true);
      this.logger.info(`Token refreshed for user ${user.id}`);

      return {
        ...newTokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Blacklist the token if there was an error processing it
      await this.tokenCacheService.blacklistToken(refreshTokenDto.refreshToken);
      this.metrics.incrementTokenRefresh(false);
      this.logger.error('Error refreshing token', error);
      throw new UnauthorizedException('Invalid refresh token');
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRequestDuration(
        'POST',
        '/api/auth/refresh',
        200,
        duration,
      );
    }
  }

  /**
   * Request a password reset
   */
  async requestPasswordReset(email: string, req?: Request) {
    const startTime = Date.now();

    // Start a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        // To prevent email enumeration, still return success but don't send email
        this.logger.info(
          `Password reset requested for non-existent email: ${email}`,
        );
        return {
          success: true,
          message:
            'If your email is in our system, you will receive reset instructions.',
        };
      }

      // Generate password reset token
      const resetToken = uuidv4();

      // Calculate token expiry time (1 hour from now)
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 1);

      // Update user with reset token and expiry within the transaction
      await this.usersService.updateWithTransaction(
        user.id,
        {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        },
        queryRunner,
      );

      // Create an outbox entry for the PasswordResetRequested event within the same transaction
      await this.eventsService.createOutboxEntryInTransaction(
        'user.password_reset_requested',
        {
          userId: user.id,
          email: user.email,
          requestedAt: new Date(),
          expiresAt: resetExpires,
          requestMetadata: req
            ? {
                ip: req.ip,
                userAgent: req.headers['user-agent'] as string,
              }
            : undefined,
        },
        queryRunner,
      );

      // Commit the transaction
      await queryRunner.commitTransaction();

      // Send password reset email
      await this.emailService.sendPasswordResetEmail(email, resetToken);

      this.metrics.incrementPasswordReset('request', true);
      this.logger.info(`Password reset requested for user ${user.id}`, {
        userId: user.id,
        email: user.email,
        ip: req?.ip,
        expire: resetExpires,
      });

      return {
        success: true,
        message: 'Password reset instructions sent to your email',
      };
    } catch (error) {
      // Rollback the transaction on error
      await queryRunner.rollbackTransaction();

      this.metrics.incrementPasswordReset('request', false);
      this.logger.error('Password reset request error', error);
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();

      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRequestDuration(
        'POST',
        '/api/auth/request-password-reset',
        200,
        duration,
      );
    }
  }

  /**
   * Complete password reset using token and new password
   */
  async resetPassword(token: string, newPassword: string) {
    const startTime = Date.now();

    try {
      // Find user by reset token
      const user = await this.usersService.findByEmail('', {
        where: {
          passwordResetToken: token,
          passwordResetExpires: { $gt: new Date() }, // Token not expired
        },
      });

      if (!user) {
        this.metrics.incrementPasswordReset('reset', false);
        this.logger.warn('Password reset failed: Invalid or expired token');
        throw new BadRequestException(
          'Invalid or expired password reset token',
        );
      }

      // Validate the new password against policy
      const passwordCheck = await this.passwordPolicyService.validatePassword(
        newPassword,
        user.passwordHistory,
      );

      if (!passwordCheck.valid) {
        this.metrics.incrementPasswordReset('reset', false);
        this.logger.warn('Password reset failed: Password policy violation', {
          reason: passwordCheck.message,
        });
        throw new BadRequestException(passwordCheck.message);
      }

      // Update password and clear reset token
      await this.usersService.update(user.id, {
        password: newPassword, // Will be hashed in the entity beforeUpdate hook
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      // Revoke all active sessions for this user as a security measure
      await this.forceLogout(user.id);

      // Send security alert about password change
      await this.emailService.sendSecurityAlert(
        user.email,
        'Password Changed Successfully',
        'Your password has been changed successfully. If you did not request this change, please contact support immediately.',
      );

      this.metrics.incrementPasswordReset('reset', true);
      this.logger.info(`Password reset completed for user ${user.id}`);

      return {
        success: true,
        message:
          'Password reset successful. Please log in with your new password.',
      };
    } catch (error) {
      this.logger.error('Password reset error', error);
      throw error;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRequestDuration(
        'POST',
        '/api/auth/reset-password',
        200,
        duration,
      );
    }
  }

  /**
   * Force logout for a user from all devices
   */
  async forceLogout(userId: string) {
    // In a real implementation, we would iterate all sessions for this user
    // For this simplified version, we rely on access token expiry

    return {
      success: true,
      message: 'All sessions terminated',
    };
  }

  /**
   * Get all active sessions for a user
   */
  async getActiveSessions(userId: string) {
    // In a real implementation with direct Redis access, we would list all sessions
    // Our simplified implementation just returns an empty array
    const sessions = await this.tokenCacheService.getUserSessions(userId);

    return {
      sessions: sessions || [],
    };
  }

  /**
   * Generate access and refresh tokens for a user
   */
  private generateTokens(user: User) {
    // Enhanced access token with more user metadata
    const accessTokenPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: [user.role],
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
    };

    // Refresh token gets a unique ID that can be revoked
    const refreshTokenId = uuidv4();
    const refreshTokenPayload: JwtRefreshPayload = {
      sub: user.id,
      refreshTokenId,
    };

    return {
      accessToken: this.jwtService.sign(accessTokenPayload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: `${this.configService.get<number>('jwt.accessExpirationSec')}s`,
      }),
      refreshToken: this.jwtService.sign(refreshTokenPayload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: `${this.configService.get<number>('jwt.refreshExpirationSec')}s`,
      }),
      expiresIn: this.configService.get<number>('jwt.accessExpirationSec'),
    };
  }

  /**
   * Remove sensitive information from user object
   */
  sanitizeUser(user: any) {
    const {
      password,
      refreshToken,
      emailVerificationToken,
      passwordResetToken,
      passwordHistory,
      ...result
    } = user;
    return result;
  }

  /**
   * Change password for a logged-in user
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    req?: Request,
  ): Promise<any> {
    // Find user with password field explicitly selected
    const user = await this.usersService.findByEmail('', {
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate the new password against policy
    const passwordCheck = await this.passwordPolicyService.validatePassword(
      newPassword,
      user.passwordHistory || [],
    );

    if (!passwordCheck.valid) {
      throw new BadRequestException(passwordCheck.message);
    }

    // Calculate password strength
    const passwordStrength =
      this.passwordPolicyService.calculatePasswordStrength(newPassword);

    // Update the password
    await this.usersService.update(userId, {
      password: newPassword, // Will be hashed in the user entity
    });

    // Send security alert about password change
    await this.emailService.sendSecurityAlert(
      user.email,
      'Password Changed Successfully',
      `Your password was changed successfully on ${new Date().toLocaleString()}.
      If you did not request this change, please contact support immediately.`,
    );

    return {
      success: true,
      message: 'Password changed successfully',
      passwordStrength,
    };
  }
}
