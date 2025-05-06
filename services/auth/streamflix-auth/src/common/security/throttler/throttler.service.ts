import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

/**
 * Service for implementing rate limiting functionality
 * Used to protect endpoints from abuse
 */
@Injectable()
export class ThrottlerService {
  private readonly logger = new Logger(ThrottlerService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Check if a key has exceeded its rate limit
   * @param key The key to check (usually includes IP or user identifier)
   * @param limit Maximum number of requests allowed
   * @param timeWindowSeconds Time window in seconds
   * @returns Boolean indicating if the rate limit is exceeded
   */
  async checkLimit(
    key: string,
    limit: number,
    timeWindowSeconds: number,
  ): Promise<boolean> {
    const redis = this.redisService.getClient();
    const prefixedKey = `throttle:${key}`;

    try {
      // Increment the counter
      const current = await redis.incr(prefixedKey);

      // Set expiry on first request
      if (current === 1) {
        await redis.expire(prefixedKey, timeWindowSeconds);
      }

      // Check if over limit
      if (current > limit) {
        this.logger.warn(`Rate limit exceeded for key: ${key}`);
        return true;
      }

      return false;
    } catch (error) {
      // Log error but don't block the request if Redis fails
      this.logger.error(
        `Error checking rate limit: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Reset the counter for a specific key
   * @param key The key to reset
   * @returns Boolean indicating success
   */
  async reset(key: string): Promise<boolean> {
    const redis = this.redisService.getClient();
    const prefixedKey = `throttle:${key}`;

    try {
      await redis.del(prefixedKey);
      return true;
    } catch (error) {
      this.logger.error(
        `Error resetting rate limit: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Get remaining requests for a key within its time window
   * @param key The key to check
   * @param limit Maximum number of requests allowed
   * @returns Number of requests remaining (0 if over limit)
   */
  async getRemainingRequests(key: string, limit: number): Promise<number> {
    const redis = this.redisService.getClient();
    const prefixedKey = `throttle:${key}`;

    try {
      const current = await redis.get(prefixedKey);

      if (!current) {
        return limit;
      }

      const currentCount = parseInt(current, 10);
      return Math.max(0, limit - currentCount);
    } catch (error) {
      this.logger.error(
        `Error getting remaining requests: ${error.message}`,
        error.stack,
      );
      return limit; // Fail open
    }
  }

  /**
   * Get the time remaining in seconds until the rate limit resets
   * @param key The key to check
   * @returns Time remaining in seconds or 0 if no active limit
   */
  async getTimeToReset(key: string): Promise<number> {
    const redis = this.redisService.getClient();
    const prefixedKey = `throttle:${key}`;

    try {
      const ttl = await redis.ttl(prefixedKey);
      return Math.max(0, ttl);
    } catch (error) {
      this.logger.error(
        `Error getting time to reset: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }
}
