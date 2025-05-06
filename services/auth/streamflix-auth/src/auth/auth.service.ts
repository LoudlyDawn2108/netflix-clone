import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { TokenService } from './token.service';
import { PasswordService } from '../common/security/password.service';
import { PasswordHistoryService } from './password-history.service';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserEventsService } from '../common/events/user.events';
import { AuditService } from '../common/audit/audit.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly passwordHistoryService: PasswordHistoryService,
    private readonly configService: ConfigService,
    private readonly userEventsService: UserEventsService,
    private readonly auditService: AuditService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @Inject(REQUEST) private readonly request: Request,
  ) {
    this.logger.log('Auth service initialized');
  }

  /**
   * Register a new user
   * @param registerDto User registration data
   * @returns Object containing the created user ID
   */
  async register(registerDto: RegisterUserDto): Promise<{ userId: string }> {
    this.logger.debug(`Registering user with email: ${registerDto.email}`);

    // Get default user role
    const userRole = await this.roleRepository.findOne({
      where: { name: 'user' },
    });

    if (!userRole) {
      this.logger.error('Default user role not found in the database');
      throw new BadRequestException('Unable to assign default role to user');
    }

    // Create new user entity
    const user = new User();
    user.email = registerDto.email.toLowerCase();
    user.username = registerDto.username;
    user.firstName = registerDto.firstName || '';
    user.lastName = registerDto.lastName || '';

    // Hash the password using our enhanced service (now using Argon2id)
    user.password = await this.passwordService.hashPassword(
      registerDto.password,
    );

    // Initialize password history with the current password
    user.passwordHistory = [user.password];
    user.passwordChangedAt = new Date();

    // Generate email verification token
    const verificationToken = uuidv4();
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24); // 24 hours expiry

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpiry;
    user.isEmailVerified = false;
    user.roles = [userRole];

    // Save the user to the database
    const savedUser = await this.userRepository.save(user);

    this.logger.debug(`User registered successfully with ID: ${savedUser.id}`);

    // Get request metadata for enhanced event tracking
    const requestMetadata = this.extractRequestMetadata();

    // Log audit entry for user registration
    this.auditService.logAudit({
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: savedUser.id,
      userId: savedUser.id,
      timestamp: new Date(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        email: savedUser.email,
        username: savedUser.username,
        correlationId: requestMetadata.correlationId,
      },
    });

    // Emit UserRegistered event (using the existing user.created event)
    this.userEventsService.emitUserCreated(savedUser, {
      ...requestMetadata,
      eventVersion: '1.0',
      source: 'auth-service',
      roles: ['user'],
    });

    // TODO: Send verification email with token (will be implemented in a future task)

    return { userId: savedUser.id };
  }

  /**
   * Extract request metadata for enhanced event tracking
   * @returns Object with request metadata
   */
  private extractRequestMetadata(): {
    ipAddress: string;
    userAgent: string;
    correlationId: string;
    deviceInfo?: Record<string, any>;
  } {
    try {
      const ipAddress =
        (this.request.headers['x-forwarded-for'] as string) ||
        this.request.ip ||
        'unknown';

      const userAgent = this.request.headers['user-agent'] || 'unknown';

      // Extract or generate correlation ID for request tracing
      const correlationId =
        (this.request.headers['x-correlation-id'] as string) || uuidv4();

      // Basic device info extraction from user agent
      let deviceInfo = {};

      if (userAgent !== 'unknown') {
        const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
        const browser = this.detectBrowser(userAgent);
        deviceInfo = {
          isMobile,
          browser,
        };
      }

      return {
        ipAddress,
        userAgent,
        correlationId,
        deviceInfo,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to extract request metadata: ${errorMessage}`);
      return {
        ipAddress: 'unknown',
        userAgent: 'unknown',
        correlationId: uuidv4(),
      };
    }
  }

  /**
   * Basic browser detection from user agent
   * @param userAgent User agent string
   * @returns Browser name
   */
  private detectBrowser(userAgent: string): string {
    if (/chrome/i.test(userAgent)) return 'Chrome';
    if (/firefox/i.test(userAgent)) return 'Firefox';
    if (/safari/i.test(userAgent)) return 'Safari';
    if (/edge|edg/i.test(userAgent)) return 'Edge';
    if (/opera|opr/i.test(userAgent)) return 'Opera';
    if (/msie|trident/i.test(userAgent)) return 'Internet Explorer';
    return 'Unknown';
  }

  /**
   * Handle user login and token generation
   * @param userId User's ID from database
   * @param roles User's roles
   * @param metadata Additional metadata to include with tokens
   * @returns Generated tokens
   */
  async login(
    userId: string,
    roles: string[],
    metadata?: Record<string, any>,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiry: number;
    refreshTokenExpiry: number;
  }> {
    this.logger.debug(`User ${userId} logged in`);
    return await this.tokenService.generateTokens(userId, roles, metadata);
  }

  /**
   * Refresh the access token using a valid refresh token
   * @param refreshToken The refresh token
   * @returns New access token and expiry time
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    accessTokenExpiry: number;
  }> {
    return await this.tokenService.refreshAccessToken(refreshToken);
  }

  /**
   * Log out a user by revoking their refresh token
   * @param refreshToken The refresh token to revoke
   * @returns True if token was successfully revoked
   */
  async logout(refreshToken: string): Promise<boolean> {
    return await this.tokenService.revokeRefreshToken(refreshToken);
  }

  /**
   * Extract and validate the token from an Authorization header
   * @param authHeader Authorization header value
   * @returns Decoded token payload
   */
  extractTokenFromHeader(authHeader: string): string {
    if (!authHeader) {
      throw new UnauthorizedException('No authorization header provided');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer') {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    return token;
  }

  /**
   * Validate an access token and return its payload
   * @param token JWT access token
   * @returns Decoded token payload
   */
  validateToken(token: string): any {
    return this.tokenService.validateAccessToken(token);
  }
}
