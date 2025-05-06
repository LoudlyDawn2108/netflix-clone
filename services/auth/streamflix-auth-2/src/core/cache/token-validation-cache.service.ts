import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { MetricsService } from '../monitoring/metrics.service';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class TokenValidationCacheService {
  // In-memory LRU cache for the most frequently validated tokens
  private readonly tokenValidationCache: Map<
    string,
    { payload: any; exp: number }
  > = new Map();
  private readonly tokenCacheTTL: number;
  private readonly maxTokenCacheSize: number;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
  ) {
    this.logger.setContext('TokenValidationCacheService');

    // Get cache TTL and size limit from config
    this.tokenCacheTTL = this.configService.get<number>(
      'cache.tokenValidationTtlSec',
      60,
    ); // Default: 1 minute
    this.maxTokenCacheSize = this.configService.get<number>(
      'cache.maxTokenCacheSize',
      10000,
    ); // Default: 10k tokens

    // Start periodic cleanup of expired cache entries
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => this.cleanupExpiredTokens(), 60000); // Clean up every minute
    }
  }

  /**
   * Cache a validated token with its decoded payload
   * @param token The raw JWT token
   * @param payload The decoded JWT payload
   * @param ttlSeconds Optional TTL override in seconds
   */
  cacheValidToken(token: string, payload: any, ttlSeconds?: number): void {
    const startTime = Date.now();
    const tokenHash = this.hashToken(token);
    const key = `token:validation:${tokenHash}`;
    const ttl = ttlSeconds || this.tokenCacheTTL;

    try {
      // If we've reached max size, remove the oldest entry before adding new one
      if (this.tokenValidationCache.size >= this.maxTokenCacheSize) {
        const oldestKey = this.tokenValidationCache.keys().next().value;
        if (oldestKey) {
          this.tokenValidationCache.delete(oldestKey);
        }
      }

      // Store in local memory cache
      this.tokenValidationCache.set(tokenHash, {
        payload,
        exp: Date.now() + ttl * 1000,
      });

      // Also store in Redis as a backup and for distributed scenarios
      this.cacheManager
        .set(key, JSON.stringify(payload), ttl * 1000)
        .catch((error) => {
          this.logger.error('Failed to store token validation in Redis', error);
        });

      this.logger.debug(`Cached validated token ${this.maskToken(tokenHash)}`);
      this.metrics.observeCacheSize(
        'token_validation',
        this.tokenValidationCache.size,
      );
    } catch (error) {
      this.logger.error('Error caching validated token', error);
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'store_validated_token',
        duration,
      );
    }
  }

  /**
   * Get a cached token validation result
   * @param token The raw JWT token
   * @returns The decoded payload or null if not found
   */
  async getValidatedToken(token: string): Promise<any | null> {
    const startTime = Date.now();
    const tokenHash = this.hashToken(token);
    const key = `token:validation:${tokenHash}`;

    try {
      // First check local memory cache
      const cachedResult = this.tokenValidationCache.get(tokenHash);

      if (cachedResult && cachedResult.exp > Date.now()) {
        // Local cache hit
        this.metrics.observeTokenValidationCacheHitRate(true);
        this.logger.debug(
          `Token validation cache hit for ${this.maskToken(tokenHash)}`,
        );
        return cachedResult.payload;
      }

      // If not in local cache, try Redis
      const redisData = await this.cacheManager.get<string>(key);

      if (redisData) {
        // Redis cache hit - parse and update local cache
        const payload = JSON.parse(redisData);

        // Update local cache
        this.tokenValidationCache.set(tokenHash, {
          payload,
          exp: Date.now() + this.tokenCacheTTL * 1000,
        });

        this.metrics.observeTokenValidationCacheHitRate(true);
        this.logger.debug(
          `Redis token validation cache hit for ${this.maskToken(tokenHash)}`,
        );
        return payload;
      }

      // Cache miss
      this.metrics.observeTokenValidationCacheHitRate(false);
      this.logger.debug(
        `Token validation cache miss for ${this.maskToken(tokenHash)}`,
      );
      return null;
    } catch (error) {
      this.logger.error('Error retrieving validated token from cache', error);
      return null;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'get_validated_token',
        duration,
      );
    }
  }

  /**
   * Invalidate a cached token (use on logout or token blacklisting)
   * @param token The raw JWT token to invalidate
   */
  async invalidateToken(token: string): Promise<void> {
    const startTime = Date.now();
    const tokenHash = this.hashToken(token);
    const key = `token:validation:${tokenHash}`;

    try {
      // Remove from local cache
      this.tokenValidationCache.delete(tokenHash);

      // Remove from Redis
      await this.cacheManager.del(key);

      this.logger.debug(
        `Invalidated cached token ${this.maskToken(tokenHash)}`,
      );
    } catch (error) {
      this.logger.error('Error invalidating token in cache', error);
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration('invalidate_token', duration);
    }
  }

  /**
   * Hash the token to avoid storing raw JWT strings
   * @param token The raw JWT token
   * @returns A hash representation of the token
   */
  private hashToken(token: string): string {
    // Simple hashing mechanism - in production, use a more robust method
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36); // Convert to base36 string
  }

  /**
   * Utility method to mask token for logging
   * @param tokenHash The token hash
   * @returns A masked version of the token hash
   */
  private maskToken(tokenHash: string): string {
    if (tokenHash.length <= 6) return '***';
    return tokenHash.slice(0, 3) + '...' + tokenHash.slice(-3);
  }

  /**
   * Cleanup expired tokens from the cache
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    let removed = 0;

    this.tokenValidationCache.forEach((value, key) => {
      if (value.exp <= now) {
        this.tokenValidationCache.delete(key);
        removed++;
      }
    });

    if (removed > 0) {
      this.logger.debug(
        `Token cache cleanup: removed ${removed} expired tokens`,
      );
      this.metrics.observeCacheSize(
        'token_validation',
        this.tokenValidationCache.size,
      );
    }
  }
}
