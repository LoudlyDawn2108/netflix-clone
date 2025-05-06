import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { RedisService } from '../common/redis/redis.service';
import { EmailService } from '../common/email/email.service';
import { AuditService } from '../common/audit/audit.service';
import { ThrottlerService } from '../common/security/throttler/throttler.service';
import * as crypto from 'crypto';

/**
 * Service for managing email verification tokens
 * Handles creation, validation, and expiry of tokens
 */
@Injectable()
export class VerificationTokenService {
  private readonly logger = new Logger(VerificationTokenService.name);

  // Configure token options from environment
  private readonly tokenExpiryHours: number;
  private readonly tokenMaxRetries: number;
  private readonly tokenRequestLimit: number;
  private readonly tokenRequestWindow: number; // in seconds

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly throttlerService: ThrottlerService,
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    this.tokenExpiryHours = this.configService.get<number>(
      'VERIFICATION_TOKEN_EXPIRY_HOURS',
      24,
    );
    this.tokenMaxRetries = this.configService.get<number>(
      'VERIFICATION_TOKEN_MAX_RETRIES',
      3,
    );
    this.tokenRequestLimit = this.configService.get<number>(
      'VERIFICATION_TOKEN_REQUEST_LIMIT',
      5,
    );
    this.tokenRequestWindow = this.configService.get<number>(
      'VERIFICATION_TOKEN_REQUEST_WINDOW',
      3600,
    ); // 1 hour

    this.logger.log(
      `Verification tokens will expire in ${this.tokenExpiryHours} hours`,
    );
    this.logger.log(
      `Users can request up to ${this.tokenRequestLimit} tokens in ${this.tokenRequestWindow / 60} minutes`,
    );
  }

  /**
   * Generate a cryptographically secure verification token
   * @returns Random token string
   */
  private generateSecureToken(): string {
    // Generate 32 random bytes (256 bits of entropy)
    const randomBytes = crypto.randomBytes(32);

    // Convert to a URL-safe base64 string
    return randomBytes.toString('base64url');
  }

  /**
   * Generate and store a verification token for a user
   * @param user The user to generate a token for
   * @param ipAddress Optional IP address for rate limiting
   * @returns The generated token
   */
  async generateToken(user: User, ipAddress?: string): Promise<string> {
    // Rate limit token generation by email and IP
    const emailKey = `verification:limit:email:${user.email}`;
    const ipKey = ipAddress ? `verification:limit:ip:${ipAddress}` : null;

    // Check rate limits
    const emailLimited = await this.throttlerService.checkLimit(
      emailKey,
      this.tokenRequestLimit,
      this.tokenRequestWindow,
    );

    const ipLimited = ipKey
      ? await this.throttlerService.checkLimit(
          ipKey,
          this.tokenRequestLimit * 2, // More generous limit for IP
          this.tokenRequestWindow,
        )
      : false;

    if (emailLimited || ipLimited) {
      const timeToReset = await this.throttlerService.getTimeToReset(emailKey);

      this.auditService.logSecurityEvent(
        'VERIFICATION_TOKEN_RATE_LIMITED',
        user.id,
        {
          email: user.email,
          ipLimited,
          emailLimited,
          timeToReset,
        },
        ipAddress,
      );

      throw new BadRequestException(
        `Too many verification token requests. Please try again in ${Math.ceil(timeToReset / 60)} minutes.`,
      );
    }

    // Generate a new secure token
    const token = this.generateSecureToken();
    const expirySeconds = this.tokenExpiryHours * 3600;

    // Store in Redis with expiry
    const redis = this.redisService.getClient();
    const tokenKey = `verification:token:${token}`;

    // Execute in a database transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update user verification attempt count
      await queryRunner.manager.update(
        User,
        { id: user.id },
        {
          lastVerificationSentAt: new Date(),
          emailVerificationAttempts: user.emailVerificationAttempts
            ? user.emailVerificationAttempts + 1
            : 1,
        },
      );

      // Store token data in Redis with TTL
      await redis
        .multi()
        .hset(tokenKey, {
          userId: user.id,
          email: user.email,
          createdAt: Date.now().toString(),
        })
        .expire(tokenKey, expirySeconds)
        .exec();

      await queryRunner.commitTransaction();

      this.auditService.logSecurityEvent(
        'VERIFICATION_TOKEN_GENERATED',
        user.id,
        {
          email: user.email,
          expiryHours: this.tokenExpiryHours,
        },
        ipAddress,
      );

      return token;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error generating verification token: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to generate verification token');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Generate a token and send verification email
   * @param user The user to send verification email to
   * @param ipAddress Optional IP address for rate limiting
   * @returns Boolean indicating success
   */
  async sendVerificationEmail(
    user: User,
    ipAddress?: string,
  ): Promise<boolean> {
    try {
      // Generate token
      const token = await this.generateToken(user, ipAddress);

      // Send verification email
      const result = await this.emailService.sendVerificationEmail(
        user.email,
        token,
        user.firstName,
      );

      if (result) {
        this.auditService.logSecurityEvent(
          'VERIFICATION_EMAIL_SENT',
          user.id,
          {
            email: user.email,
          },
          ipAddress,
        );
      } else {
        this.auditService.logSecurityEvent(
          'VERIFICATION_EMAIL_FAILED',
          user.id,
          {
            email: user.email,
          },
          ipAddress,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${user.email}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Validate a verification token
   * @param token The token to validate
   * @param ipAddress Optional IP address for security logging
   * @returns The user associated with the token if valid
   * @throws UnauthorizedException if token is invalid or expired
   */
  async validateToken(token: string, ipAddress?: string): Promise<User> {
    // Rate limit token validations by IP to prevent brute force
    if (ipAddress) {
      const ipKey = `verification:validate:ip:${ipAddress}`;
      const ipLimited = await this.throttlerService.checkLimit(
        ipKey,
        10, // Allow 10 attempts
        3600, // Within an hour
      );

      if (ipLimited) {
        this.auditService.logSecurityEvent(
          'VERIFICATION_TOKEN_VALIDATION_RATE_LIMITED',
          undefined,
          { ipAddress },
          ipAddress,
        );

        throw new BadRequestException(
          'Too many verification attempts. Please try again later.',
        );
      }
    }

    // Get token data from Redis
    const redis = this.redisService.getClient();
    const tokenKey = `verification:token:${token}`;
    const tokenData = await redis.hgetall(tokenKey);

    // Check if token exists
    if (!tokenData || !tokenData.userId || !tokenData.email) {
      this.auditService.logSecurityEvent(
        'VERIFICATION_TOKEN_INVALID',
        undefined,
        { token: '[REDACTED]' },
        ipAddress,
      );

      throw new UnauthorizedException('Invalid or expired verification token');
    }

    // Find the associated user
    const user = await this.userRepository.findOne({
      where: { id: tokenData.userId },
    });

    if (!user) {
      this.auditService.logSecurityEvent(
        'VERIFICATION_TOKEN_USER_NOT_FOUND',
        tokenData.userId,
        { email: tokenData.email },
        ipAddress,
      );

      // Delete the invalid token
      await redis.del(tokenKey);
      throw new UnauthorizedException('Invalid verification token');
    }

    // Check if user is already verified
    if (user.isEmailVerified) {
      this.auditService.logSecurityEvent(
        'VERIFICATION_TOKEN_ALREADY_VERIFIED',
        user.id,
        { email: user.email },
        ipAddress,
      );

      // Delete the token since it's no longer needed
      await redis.del(tokenKey);
      throw new BadRequestException('Email is already verified');
    }

    // Everything looks good, delete the token to prevent reuse
    await redis.del(tokenKey);

    // Update user's verification status
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update user verification status
      await queryRunner.manager.update(
        User,
        { id: user.id },
        {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      );

      await queryRunner.commitTransaction();

      this.auditService.logSecurityEvent(
        'EMAIL_VERIFIED_SUCCESSFULLY',
        user.id,
        { email: user.email },
        ipAddress,
      );

      return user;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error updating user verification status: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to update verification status');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Request a new verification token if the original has expired
   * @param email User's email address
   * @param ipAddress Optional IP address for rate limiting
   * @returns Boolean indicating if the email was sent
   * @throws BadRequestException if too many retries or already verified
   */
  async resendVerificationEmail(
    email: string,
    ipAddress?: string,
  ): Promise<boolean> {
    // Find the user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Don't reveal that the email doesn't exist
      this.logger.debug(
        `Resend verification requested for non-existent email: ${email}`,
      );

      // Simulate processing time to prevent timing attacks
      await new Promise((resolve) =>
        setTimeout(resolve, 500 + Math.random() * 500),
      );

      // Log the event without exposing that the user doesn't exist
      this.auditService.logSecurityEvent(
        'VERIFICATION_RESEND_NONEXISTENT_EMAIL',
        undefined,
        { email },
        ipAddress,
      );

      return true; // Pretend it worked
    }

    // Check if already verified
    if (user.isEmailVerified) {
      this.auditService.logSecurityEvent(
        'VERIFICATION_RESEND_ALREADY_VERIFIED',
        user.id,
        { email: user.email },
        ipAddress,
      );

      throw new BadRequestException('Email is already verified');
    }

    // Check verification attempt limit
    if (
      user.emailVerificationAttempts &&
      user.emailVerificationAttempts >= this.tokenMaxRetries
    ) {
      this.auditService.logSecurityEvent(
        'VERIFICATION_RESEND_MAX_ATTEMPTS',
        user.id,
        {
          email: user.email,
          attempts: user.emailVerificationAttempts,
        },
        ipAddress,
      );

      throw new BadRequestException(
        `Maximum number of verification attempts (${this.tokenMaxRetries}) reached. Please contact support.`,
      );
    }

    // Send a new verification email
    return this.sendVerificationEmail(user, ipAddress);
  }

  /**
   * Clean up expired tokens from Redis
   * This is a maintenance method that can be run periodically
   * @returns Number of expired tokens removed
   */
  async cleanupExpiredTokens(): Promise<number> {
    // In a production environment, this would be scheduled to run periodically
    // For Redis, token expiry is handled automatically by the TTL
    this.logger.debug(
      'Token cleanup not needed as Redis handles TTL automatically',
    );
    return 0;
  }
}
