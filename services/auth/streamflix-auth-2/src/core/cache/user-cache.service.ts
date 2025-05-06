import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { MetricsService } from '../monitoring/metrics.service';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class UserCacheService {
  // In-memory cache for frequently accessed user data
  private readonly userDataCache: Map<string, { data: any; exp: number }> =
    new Map();
  private readonly userPermissionsCache: Map<
    string,
    { data: any; exp: number }
  > = new Map();

  // Cache TTL values in seconds
  private readonly userDataTTL: number;
  private readonly userPermissionsTTL: number;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
  ) {
    this.logger.setContext('UserCacheService');

    // Get cache TTL values from config
    this.userDataTTL = this.configService.get<number>(
      'cache.userDataTtlSec',
      300,
    ); // Default: 5 minutes
    this.userPermissionsTTL = this.configService.get<number>(
      'cache.permissionsTtlSec',
      600,
    ); // Default: 10 minutes

    // Start periodic cleanup of expired cache entries
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => this.cleanupExpiredCacheEntries(), 60000); // Clean up every minute
    }
  }

  // Store user data in local memory cache and Redis
  async storeUserData(
    userId: string,
    userData: any,
    ttlSeconds?: number,
  ): Promise<void> {
    const startTime = Date.now();
    const key = `user:${userId}`;
    const ttl = ttlSeconds || this.userDataTTL;

    try {
      // Store in local memory cache
      this.userDataCache.set(userId, {
        data: userData,
        exp: Date.now() + ttl * 1000,
      });

      // Also store in Redis for distributed caching
      await this.cacheManager.set(key, JSON.stringify(userData), ttl * 1000);

      this.logger.debug(`Cached user data for user ${userId}`);
      this.metrics.observeCacheSize('user_data', this.userDataCache.size);
    } catch (error) {
      this.logger.error('Error storing user data in cache', error, { userId });
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration('store_user_data', duration);
    }
  }

  // Get user data from cache (tries local memory first, then Redis)
  async getUserData(userId: string): Promise<any | null> {
    const startTime = Date.now();
    const key = `user:${userId}`;

    try {
      // First check local memory cache
      const cachedData = this.userDataCache.get(userId);

      if (cachedData && cachedData.exp > Date.now()) {
        // Local cache hit
        this.metrics.observeCacheHitRate('user_data_local', 1);
        return cachedData.data;
      }

      // If not in local cache, try Redis
      const redisData = await this.cacheManager.get<string>(key);

      if (redisData) {
        // Redis cache hit - parse and update local cache
        const userData = JSON.parse(redisData);

        // Update local cache
        this.userDataCache.set(userId, {
          data: userData,
          exp: Date.now() + this.userDataTTL * 1000,
        });

        this.metrics.observeCacheHitRate('user_data_redis', 1);
        return userData;
      }

      // Cache miss
      this.metrics.observeCacheHitRate('user_data_local', 0);
      this.metrics.observeCacheHitRate('user_data_redis', 0);
      return null;
    } catch (error) {
      this.logger.error('Error retrieving user data from cache', error, {
        userId,
      });
      return null;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration('get_user_data', duration);
    }
  }

  // Invalidate user data in cache (both local and Redis)
  async invalidateUserData(userId: string): Promise<void> {
    const startTime = Date.now();
    const key = `user:${userId}`;

    try {
      // Remove from local cache
      this.userDataCache.delete(userId);

      // Remove from Redis
      await this.cacheManager.del(key);

      this.logger.debug(`Invalidated cached user data for user ${userId}`);
    } catch (error) {
      this.logger.error('Error invalidating user data cache', error, {
        userId,
      });
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'invalidate_user_data',
        duration,
      );
    }
  }

  // Store user permissions in cache
  async storeUserPermissions(
    userId: string,
    permissions: string[],
    ttlSeconds?: number,
  ): Promise<void> {
    const startTime = Date.now();
    const key = `permissions:${userId}`;
    const ttl = ttlSeconds || this.userPermissionsTTL;

    try {
      // Store in local memory cache
      this.userPermissionsCache.set(userId, {
        data: permissions,
        exp: Date.now() + ttl * 1000,
      });

      // Also store in Redis for distributed caching
      await this.cacheManager.set(key, JSON.stringify(permissions), ttl * 1000);

      this.logger.debug(`Cached permissions for user ${userId}`);
      this.metrics.observeCacheSize(
        'user_permissions',
        this.userPermissionsCache.size,
      );
    } catch (error) {
      this.logger.error('Error storing user permissions in cache', error, {
        userId,
      });
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'store_user_permissions',
        duration,
      );
    }
  }

  // Get user permissions from cache
  async getUserPermissions(userId: string): Promise<string[] | null> {
    const startTime = Date.now();
    const key = `permissions:${userId}`;

    try {
      // First check local memory cache
      const cachedData = this.userPermissionsCache.get(userId);

      if (cachedData && cachedData.exp > Date.now()) {
        // Local cache hit
        this.metrics.observeCacheHitRate('user_permissions_local', 1);
        return cachedData.data;
      }

      // If not in local cache, try Redis
      const redisData = await this.cacheManager.get<string>(key);

      if (redisData) {
        // Redis cache hit - parse and update local cache
        const permissions = JSON.parse(redisData);

        // Update local cache
        this.userPermissionsCache.set(userId, {
          data: permissions,
          exp: Date.now() + this.userPermissionsTTL * 1000,
        });

        this.metrics.observeCacheHitRate('user_permissions_redis', 1);
        return permissions;
      }

      // Cache miss
      this.metrics.observeCacheHitRate('user_permissions_local', 0);
      this.metrics.observeCacheHitRate('user_permissions_redis', 0);
      return null;
    } catch (error) {
      this.logger.error('Error retrieving user permissions from cache', error, {
        userId,
      });
      return null;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'get_user_permissions',
        duration,
      );
    }
  }

  // Invalidate user permissions in cache
  async invalidateUserPermissions(userId: string): Promise<void> {
    const startTime = Date.now();
    const key = `permissions:${userId}`;

    try {
      // Remove from local cache
      this.userPermissionsCache.delete(userId);

      // Remove from Redis
      await this.cacheManager.del(key);

      this.logger.debug(`Invalidated cached permissions for user ${userId}`);
    } catch (error) {
      this.logger.error('Error invalidating user permissions cache', error, {
        userId,
      });
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'invalidate_user_permissions',
        duration,
      );
    }
  }

  // Cache user data by email
  async storeUserDataByEmail(
    email: string,
    userData: any,
    ttlSeconds?: number,
  ): Promise<void> {
    const startTime = Date.now();
    const key = `user:email:${email}`;
    const ttl = ttlSeconds || this.userDataTTL;

    try {
      // Store in Redis (we don't keep a separate email-indexed local cache)
      await this.cacheManager.set(key, JSON.stringify(userData), ttl * 1000);
      this.logger.debug(`Cached user data for email ${email}`);
    } catch (error) {
      this.logger.error('Error storing user data by email in cache', error, {
        email,
      });
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'store_user_by_email',
        duration,
      );
    }
  }

  // Get user data by email from cache
  async getUserDataByEmail(email: string): Promise<any | null> {
    const startTime = Date.now();
    const key = `user:email:${email}`;

    try {
      const data = await this.cacheManager.get<string>(key);

      if (data) {
        this.metrics.observeCacheHitRate('user_data_by_email', 1);
        return JSON.parse(data);
      }

      this.metrics.observeCacheHitRate('user_data_by_email', 0);
      return null;
    } catch (error) {
      this.logger.error(
        'Error retrieving user data by email from cache',
        error,
        { email },
      );
      return null;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration('get_user_by_email', duration);
    }
  }

  // Invalidate user data by email
  async invalidateUserDataByEmail(email: string): Promise<void> {
    const startTime = Date.now();
    const key = `user:email:${email}`;

    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Invalidated cached user data for email ${email}`);
    } catch (error) {
      this.logger.error('Error invalidating user data by email cache', error, {
        email,
      });
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRedisOperationDuration(
        'invalidate_user_by_email',
        duration,
      );
    }
  }

  // Utility method to clean up expired entries from local caches
  private cleanupExpiredCacheEntries(): void {
    const now = Date.now();
    let userDataRemoved = 0;
    let permissionsRemoved = 0;

    // Clean user data cache
    this.userDataCache.forEach((value, key) => {
      if (value.exp <= now) {
        this.userDataCache.delete(key);
        userDataRemoved++;
      }
    });

    // Clean permissions cache
    this.userPermissionsCache.forEach((value, key) => {
      if (value.exp <= now) {
        this.userPermissionsCache.delete(key);
        permissionsRemoved++;
      }
    });

    if (userDataRemoved > 0 || permissionsRemoved > 0) {
      this.logger.debug(
        `Cache cleanup: removed ${userDataRemoved} user data entries and ${permissionsRemoved} permission entries`,
      );

      // Update cache size metrics
      this.metrics.observeCacheSize('user_data', this.userDataCache.size);
      this.metrics.observeCacheSize(
        'user_permissions',
        this.userPermissionsCache.size,
      );
    }
  }
}
