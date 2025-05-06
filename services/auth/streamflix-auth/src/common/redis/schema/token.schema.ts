import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis.service';

@Injectable()
export class TokenSchema {
  private readonly logger = new Logger(TokenSchema.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Store a refresh token in Redis
   */
  async storeRefreshToken(
    userId: string,
    tokenId: string,
    ttlSeconds: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const key = `refresh_token:${userId}:${tokenId}`;
    const value = JSON.stringify({
      userId,
      tokenId,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
    });

    this.logger.debug(`Storing refresh token: ${key}`);
    await this.redisService.set(key, value, ttlSeconds);
  }

  /**
   * Get a refresh token from Redis
   */
  async getRefreshToken(
    userId: string,
    tokenId: string,
  ): Promise<{
    userId: string;
    tokenId: string;
    metadata?: any;
    createdAt: string;
  } | null> {
    const key = `refresh_token:${userId}:${tokenId}`;
    const token = await this.redisService.get(key);

    if (!token) {
      return null;
    }

    try {
      return JSON.parse(token);
    } catch (error) {
      this.logger.error(`Error parsing token data: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete a refresh token from Redis
   */
  async deleteRefreshToken(userId: string, tokenId: string): Promise<number> {
    const key = `refresh_token:${userId}:${tokenId}`;
    return this.redisService.del(key);
  }

  /**
   * Blacklist a token
   */
  async blacklistToken(tokenId: string, ttlSeconds: number): Promise<void> {
    const key = `blacklisted_token:${tokenId}`;
    await this.redisService.set(key, '1', ttlSeconds);
  }

  /**
   * Check if a token is blacklisted
   */
  async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    const key = `blacklisted_token:${tokenId}`;
    const value = await this.redisService.get(key);
    return value !== null;
  }

  /**
   * Track rate limiting attempts
   */
  async trackRateLimit(
    ip: string,
    endpoint: string,
    windowSeconds: number,
  ): Promise<number> {
    const key = `rate_limit:${ip}:${endpoint}`;
    const count = await this.redisService.incr(key);

    // Set expiry on first increment
    if (count === 1) {
      await this.redisService.expire(key, windowSeconds);
    }

    return count;
  }

  /**
   * Get remaining rate limit attempts
   */
  async getRateLimitRemaining(
    ip: string,
    endpoint: string,
    maxAttempts: number,
  ): Promise<number> {
    const key = `rate_limit:${ip}:${endpoint}`;
    const count = await this.redisService.get(key);

    if (!count) {
      return maxAttempts;
    }

    const remaining = maxAttempts - parseInt(count, 10);
    return remaining > 0 ? remaining : 0;
  }
}
