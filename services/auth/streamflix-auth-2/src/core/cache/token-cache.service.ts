import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { MetricsService } from '../monitoring/metrics.service';
import { LoggerService } from '../logging/logger.service';
import { Redis } from 'ioredis';

@Injectable()
export class TokenCacheService {
  private readonly redis: Redis;
  private readonly jwtValidationCache: Map<string, { payload: any; exp: number }> = new Map();
  private readonly validationCacheTTL: number = 60; // seconds

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
  ) {
    this.logger.setContext('TokenCacheService');

    // Get Redis configuration
    const redisConfig = {
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db', 0),
      keyPrefix: this.configService.get<string>('redis.keyPrefix', 'auth:'),
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        return Math.min(times * 50, 2000);
      },
    };

    // Create Redis client
    this.redis = new Redis(redisConfig);

    // Set validation cache TTL from config if available
    this.validationCacheTTL = this.configService.get<number>(
      'cache.validationTtlSec',
      60,
    );

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });
  }

  // Report Redis connection metrics periodically
  if (process.env.NODE_ENV === 'production') {
    setInterval(() => this.updateRedisMetrics(), 15000); // every 15 seconds
  }

  private readonly tokenPrefix = 'refresh_token:';
  private readonly blacklistPrefix = 'blacklist:';
  private readonly sessionPrefix = 'session:';
  private readonly oauthStatePrefix = 'oauth_state:';
  private readonly validationPrefix = 'token_validation:';

  // Report Redis connection pool metrics
  private async updateRedisMetrics(): Promise<void> {
    try {
      // If we have access to the Redis client's connection pool, get metrics
      const redisClient = (this.cacheManager as any).store?.client;

      if (redisClient && redisClient.status === 'ready') {
        // Report Redis client status
        const activeConnections =
          redisClient.options?.socket?.connectionTimeout || 0;
        const idleConnections = redisClient.options?.socket?.keepAlive || 0;
        const waitingConnections = 0; // Not directly available in Redis client

        this.metrics.setRedisConnectionPool(
          activeConnections,
          idleConnections,
          waitingConnections,
        );

        this.logger.verbose('Updated Redis connection pool metrics', {
          active: activeConnections,
          idle: idleConnections,
        });
      }
    } catch (error) {
      this.logger.error('Failed to update Redis metrics', error);
    }
  }

  // Count active sessions across the system
  async countActiveSessions(userId?: string): Promise<number> {
    try {
      // In a real implementation, you'd run a Redis operation like
      // KEYS session:* or better with SCAN and count the results
      // For this simplified version, return a default value
      return 1;
    } catch (error) {
      this.logger.error('Failed to count active sessions', error);
      return 0;
    }
  }

  // Store a refresh token with user ID
  async storeRefreshToken(
    userId: string,
    tokenId: string,
    token: string,
    ttl?: number,
  ): Promise<void> {
    const key = `${this.tokenPrefix}${userId}:${tokenId}`;
    const expiry =
      ttl || this.configService.get<number>('jwt.refreshExpirationSec');

    const startTime = Date.now();
    try {
      await this.cacheManager.set(key, token, expiry * 1000);
      this.logger.debug(
        `Stored refresh token for user ${userId}, token ID ${tokenId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to store refresh token`, error, {
        userId,
        tokenId,
      });
      throw new Error('Failed to store refresh token');
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration('storeRefreshToken', duration);
    }
  }

  // Get a refresh token
  async getRefreshToken(
    userId: string,
    tokenId: string,
  ): Promise<string | null> {
    const key = `${this.tokenPrefix}${userId}:${tokenId}`;
    const startTime = Date.now();

    try {
      return await this.cacheManager.get<string>(key);
    } catch (error) {
      this.logger.error(`Failed to get refresh token`, error, {
        userId,
        tokenId,
      });
      return null;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration('getRefreshToken', duration);
    }
  }

  // Delete a refresh token (use during logout or token rotation)
  async deleteRefreshToken(userId: string, tokenId: string): Promise<void> {
    const key = `${this.tokenPrefix}${userId}:${tokenId}`;
    const startTime = Date.now();

    try {
      await this.cacheManager.del(key);
      this.logger.debug(
        `Deleted refresh token for user ${userId}, token ID ${tokenId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to delete refresh token`, error, {
        userId,
        tokenId,
      });
      throw new Error('Failed to delete refresh token');
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'deleteRefreshToken',
        duration,
      );
    }
  }

  // Blacklist a token (for revocation)
  async blacklistToken(token: string, ttl?: number): Promise<void> {
    const key = `${this.blacklistPrefix}${token}`;
    const expiry =
      ttl || this.configService.get<number>('jwt.refreshExpirationSec');
    const startTime = Date.now();

    try {
      await this.cacheManager.set(key, 'blacklisted', expiry * 1000);
      this.logger.debug(`Blacklisted token ${token.substring(0, 10)}...`);
    } catch (error) {
      this.logger.error(`Failed to blacklist token`, error);
      throw new Error('Failed to blacklist token');
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration('blacklistToken', duration);
    }
  }

  // Check if a token is blacklisted
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `${this.blacklistPrefix}${token}`;
    const startTime = Date.now();

    try {
      const result = await this.cacheManager.get(key);
      return !!result;
    } catch (error) {
      this.logger.error(`Failed to check blacklisted token`, error);
      return false;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'isTokenBlacklisted',
        duration,
      );
    }
  }

  // Store session information
  async storeSession(
    sessionId: string,
    userId: string,
    metadata: any,
    ttl?: number,
  ): Promise<void> {
    const key = `${this.sessionPrefix}${sessionId}`;
    const expiry =
      ttl || this.configService.get<number>('security.sessionTtl') || 86400; // Default 1 day

    const sessionData = {
      userId,
      createdAt: new Date().toISOString(),
      ...metadata,
    };

    const startTime = Date.now();
    try {
      await this.cacheManager.set(
        key,
        JSON.stringify(sessionData),
        expiry * 1000,
      );
      this.logger.debug(`Stored session ${sessionId} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to store session`, error, {
        sessionId,
        userId,
      });
      throw new Error('Failed to store session');
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration('storeSession', duration);
    }
  }

  // Get session information
  async getSession(sessionId: string): Promise<any | null> {
    const key = `${this.sessionPrefix}${sessionId}`;
    const startTime = Date.now();

    try {
      const sessionData = await this.cacheManager.get<string>(key);
      if (!sessionData) return null;

      return JSON.parse(sessionData);
    } catch (error) {
      this.logger.error(`Failed to get session`, error, { sessionId });
      return null;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration('getSession', duration);
    }
  }

  // List all sessions for a user
  async getUserSessions(userId: string): Promise<any[]> {
    // Note: This is a simplified implementation, as Redis doesn't support
    // pattern matching out of the box with cache-manager
    // In a real implementation, you might want to store user sessions in a dedicated hash or set

    // For this example, we'll return an empty array
    // You would need direct Redis client access for more complex operations
    return [];
  }

  // Delete a session (for logout, forced logout)
  async deleteSession(sessionId: string): Promise<void> {
    const key = `${this.sessionPrefix}${sessionId}`;
    const startTime = Date.now();

    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Deleted session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to delete session`, error, { sessionId });
      throw new Error('Failed to delete session');
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration('deleteSession', duration);
    }
  }

  // Track login attempts for rate limiting
  async incrementLoginAttempts(identifier: string): Promise<number> {
    const key = `login_attempts:${identifier}`;
    let attempts = (await this.cacheManager.get<number>(key)) || 0;
    attempts++;

    const rateLimitTtl =
      this.configService.get<number>('security.rateLimitTtl') || 60; // 60 seconds
    const startTime = Date.now();

    try {
      await this.cacheManager.set(key, attempts, rateLimitTtl * 1000);

      // Track rate limiting in metrics if approaching limit
      const maxAttempts =
        this.configService.get<number>('security.rateLimitMax') || 100;
      if (attempts >= maxAttempts * 0.8) {
        // 80% of rate limit
        this.metrics.incrementRateLimitedRequests('login_attempts');
      }

      return attempts;
    } catch (error) {
      this.logger.error(`Failed to increment login attempts`, error, {
        identifier,
        attempts,
      });
      return attempts;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'incrementLoginAttempts',
        duration,
      );
    }
  }

  // Get login attempts count
  async getLoginAttempts(identifier: string): Promise<number> {
    const key = `login_attempts:${identifier}`;
    const startTime = Date.now();

    try {
      return (await this.cacheManager.get<number>(key)) || 0;
    } catch (error) {
      this.logger.error(`Failed to get login attempts`, error, { identifier });
      return 0;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration('getLoginAttempts', duration);
    }
  }

  // Reset login attempts
  async resetLoginAttempts(identifier: string): Promise<void> {
    const key = `login_attempts:${identifier}`;
    const startTime = Date.now();

    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Failed to reset login attempts`, error, {
        identifier,
      });
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'resetLoginAttempts',
        duration,
      );
    }
  }

  // Store OAuth state parameter with user ID (for CSRF protection)
  async storeOAuthState(
    state: string,
    userId: string,
    ttl: number = 600, // Default 10 minutes
  ): Promise<void> {
    const key = `${this.oauthStatePrefix}${state}`;
    const startTime = Date.now();

    try {
      await this.cacheManager.set(key, userId, ttl * 1000);
      this.logger.debug(`Stored OAuth state ${state} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to store OAuth state`, error, {
        state,
        userId,
      });
      throw new Error('Failed to store OAuth state');
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration('storeOAuthState', duration);
    }
  }

  // Get user ID from OAuth state
  async getOAuthState(state: string): Promise<string | null> {
    const key = `${this.oauthStatePrefix}${state}`;
    const startTime = Date.now();

    try {
      return await this.cacheManager.get<string>(key);
    } catch (error) {
      this.logger.error(`Failed to get OAuth state`, error, { state });
      return null;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration('getOAuthState', duration);
    }
  }

  // Delete OAuth state after use
  async deleteOAuthState(state: string): Promise<void> {
    const key = `${this.oauthStatePrefix}${state}`;
    const startTime = Date.now();

    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Deleted OAuth state ${state}`);
    } catch (error) {
      this.logger.error(`Failed to delete OAuth state`, error, { state });
      throw new Error('Failed to delete OAuth state');
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration('deleteOAuthState', duration);
    }
  }

  // Store validated token data to reduce JWT verification overhead
  async cacheValidatedToken(token: string, userData: any): Promise<void> {
    const tokenHash = this.hashToken(token);
    const key = `${this.validationPrefix}${tokenHash}`;
    const expiry =
      this.configService.get<number>('jwt.accessExpirationSec') || 3600; // Default to 1 hour
    const startTime = Date.now();

    try {
      await this.cacheManager.set(key, JSON.stringify(userData), expiry * 1000);
      this.logger.debug(`Cached validated token for quick validation`);
    } catch (error) {
      this.logger.error(`Failed to cache validated token`, error);
      // Don't throw error as cache failures shouldn't break the application
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'cacheValidatedToken',
        duration,
      );
    }
  }

  // Get cached validated token data
  async getValidatedToken(token: string): Promise<any | null> {
    const tokenHash = this.hashToken(token);
    const key = `${this.validationPrefix}${tokenHash}`;
    const startTime = Date.now();

    try {
      const userData = await this.cacheManager.get<string>(key);
      if (!userData) {
        this.metrics.observeCacheHitRate('token_validation', 0);
        return null;
      }

      this.metrics.observeCacheHitRate('token_validation', 1);
      return JSON.parse(userData);
    } catch (error) {
      this.logger.error(`Failed to get validated token`, error);
      return null;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration('getValidatedToken', duration);
    }
  }

  // Invalidate a cached token validation (for logout or token revocation)
  async invalidateValidatedToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const key = `${this.validationPrefix}${tokenHash}`;
    const startTime = Date.now();

    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Invalidated token validation cache`);
    } catch (error) {
      this.logger.error(`Failed to invalidate token validation`, error);
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'invalidateValidatedToken',
        duration,
      );
    }
  }

  // Store JWT token validation result in local memory cache
  async cacheTokenValidation(
    token: string,
    payload: any,
    expiresIn: number = this.validationCacheTTL,
  ): Promise<void> {
    // Only cache short-lived tokens, not refresh tokens
    if (payload && !payload.refreshTokenId) {
      const expTime = Date.now() + expiresIn * 1000;
      this.jwtValidationCache.set(token, { payload, exp: expTime });
      
      // Track cache size
      this.metrics.observeCacheSize('token_validation', this.jwtValidationCache.size);
    }
  }

  // Get JWT token validation result from local memory cache
  async getTokenValidation(token: string): Promise<any | null> {
    const startTime = Date.now();
    const cachedValue = this.jwtValidationCache.get(token);
    
    // Hit or miss metrics
    if (cachedValue) {
      // Check if expired
      if (cachedValue.exp > Date.now()) {
        this.metrics.observeCacheHitRate('token_validation', 1);
        return cachedValue.payload;
      } else {
        // Clean up expired entry
        this.jwtValidationCache.delete(token);
      }
    }
    
    this.metrics.observeCacheHitRate('token_validation', 0);
    return null;
  }

  // Clean up expired token validations periodically
  cleanupExpiredValidations(): void {
    const now = Date.now();
    let removedCount = 0;
    
    this.jwtValidationCache.forEach((value, key) => {
      if (value.exp <= now) {
        this.jwtValidationCache.delete(key);
        removedCount++;
      }
    });
    
    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} expired token validations`);
      // Update cache size metric after cleanup
      this.metrics.observeCacheSize('token_validation', this.jwtValidationCache.size);
    }
  }

  // Simple hash function for tokens to use as cache keys
  private hashToken(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
}
