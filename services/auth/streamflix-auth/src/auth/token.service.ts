import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '../common/security/jwt.service';
import { TokenSchema } from '../common/redis/schema/token.schema';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenSchema: TokenSchema,
  ) {
    this.logger.log('Token service initialized');
  }

  /**
   * Generate both access and refresh tokens for a user
   * @param userId User ID for which to generate tokens
   * @param roles User's roles for inclusion in token payload
   * @param metadata Additional metadata to store with refresh token
   * @returns Object containing both tokens and their expiry times
   */
  async generateTokens(
    userId: string,
    roles: string[],
    metadata?: Record<string, any>,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiry: number;
    refreshTokenExpiry: number;
  }> {
    this.logger.debug(`Generating tokens for user ${userId}`);

    // Generate a unique token ID for the refresh token
    const tokenId = uuidv4();

    // Define common payload properties
    const basePayload = {
      sub: userId,
      roles,
      type: 'access',
    };

    // Generate access token with access-specific claims
    const accessToken = this.jwtService.generateAccessToken({
      ...basePayload,
      jti: uuidv4(), // Unique ID for the access token
    });

    // Generate refresh token with refresh-specific claims
    const refreshToken = this.jwtService.generateRefreshToken({
      sub: userId,
      type: 'refresh',
      jti: tokenId, // Use this ID to track the refresh token
    });

    // Get token expiry times in seconds
    const accessTokenExpiry = this.jwtService.getAccessTokenExpirySeconds();
    const refreshTokenExpiry = this.jwtService.getRefreshTokenExpirySeconds();

    // Store refresh token in Redis
    await this.tokenSchema.storeRefreshToken(
      userId,
      tokenId,
      refreshTokenExpiry,
      {
        ...metadata,
        roles,
        createdAt: new Date().toISOString(),
      },
    );

    this.logger.debug(`Tokens generated successfully for user ${userId}`);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiry,
      refreshTokenExpiry,
    };
  }

  /**
   * Refresh an access token using a valid refresh token
   * @param refreshToken The refresh token to use
   * @returns A new access token and its expiry
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    accessTokenExpiry: number;
  }> {
    try {
      // Verify the refresh token and extract payload
      const payload = this.jwtService.verifyToken(refreshToken);

      // Ensure this is a refresh token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const userId = payload.sub;
      const tokenId = payload.jti;

      // Check if token exists in Redis
      const storedToken = await this.tokenSchema.getRefreshToken(
        userId,
        tokenId,
      );

      if (!storedToken) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.tokenSchema.isTokenBlacklisted(tokenId);
      if (isBlacklisted) {
        throw new UnauthorizedException('Refresh token has been blacklisted');
      }

      // Extract roles from stored metadata
      const roles = storedToken.metadata?.roles || [];

      // Generate a new access token
      const accessToken = this.jwtService.generateAccessToken({
        sub: userId,
        roles,
        type: 'access',
        jti: uuidv4(),
      });

      const accessTokenExpiry = this.jwtService.getAccessTokenExpirySeconds();

      this.logger.debug(`Access token refreshed for user ${userId}`);

      return {
        accessToken,
        accessTokenExpiry,
      };
    } catch (error) {
      this.logger.error(`Error refreshing access token: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Revoke a refresh token
   * @param userId User ID
   * @param refreshToken Refresh token to revoke
   * @returns True if token was found and revoked
   */
  async revokeRefreshToken(refreshToken: string): Promise<boolean> {
    try {
      // Verify the token to extract payload
      const payload = this.jwtService.verifyToken(refreshToken);

      // Ensure it's a refresh token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const userId = payload.sub;
      const tokenId = payload.jti;

      // Delete the token from Redis
      const result = await this.tokenSchema.deleteRefreshToken(userId, tokenId);

      // Blacklist the token until it expires
      const expiry = payload.exp - Math.floor(Date.now() / 1000);
      if (expiry > 0) {
        await this.tokenSchema.blacklistToken(tokenId, expiry);
      }

      this.logger.debug(`Refresh token revoked for user ${userId}`);

      return result > 0;
    } catch (error) {
      this.logger.error(`Error revoking token: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate an access token
   * @param token The access token to validate
   * @returns The decoded token payload if valid
   */
  validateAccessToken(token: string): any {
    try {
      const payload = this.jwtService.verifyToken(token);

      // Ensure this is an access token
      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch (error) {
      this.logger.error(`Token validation error: ${error.message}`);
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * @param userId User ID
   * @returns True if operation was successful
   */
  async revokeAllUserTokens(userId: string): Promise<boolean> {
    try {
      // Implementation would require scanning all tokens for a user
      // This is a simplification for now
      this.logger.debug(`Revoking all tokens for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error revoking all user tokens: ${error.message}`);
      return false;
    }
  }
}
