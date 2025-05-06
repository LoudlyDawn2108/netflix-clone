import { Injectable, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../monitoring/metrics.service';
import { LoggerService } from '../logging/logger.service';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisPoolMonitorService implements OnModuleInit {
  private readonly monitoringInterval: number;
  private intervalId: NodeJS.Timer | null = null;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
  ) {
    this.logger.setContext('RedisPoolMonitorService');
    this.monitoringInterval = this.configService.get<number>(
      'redis.monitoringIntervalMs',
      60000,
    ); // Default: check every minute
  }

  onModuleInit() {
    // Only enable monitoring in production
    if (process.env.NODE_ENV === 'production') {
      this.startMonitoring();
    } else {
      this.logger.debug(
        'Redis pool monitoring disabled in non-production environment',
      );
    }
  }

  startMonitoring() {
    this.logger.log(
      `Starting Redis pool monitoring at ${this.monitoringInterval}ms intervals`,
    );

    // Clear any existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Start polling for Redis connection stats
    this.intervalId = setInterval(async () => {
      await this.collectRedisMetrics();
    }, this.monitoringInterval);

    // Collect metrics immediately on startup
    this.collectRedisMetrics();
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.log('Redis pool monitoring stopped');
    }
  }

  private async collectRedisMetrics() {
    try {
      const redisClient = this.getRedisClient();

      if (!redisClient) {
        this.logger.warn(
          'Could not access Redis client for metrics collection',
        );
        return;
      }

      // Get pool statistics
      const stats = await this.getConnectionStats(redisClient);

      // Update metrics
      this.metrics.setRedisConnectionPool(
        stats.active,
        stats.idle,
        stats.waiting,
      );

      // Log if pool is under pressure
      if (stats.active > stats.total * 0.8) {
        this.logger.warn(
          `Redis connection pool is under pressure: ${JSON.stringify(stats)}`,
        );
      }

      this.logger.debug(`Redis pool stats: ${JSON.stringify(stats)}`);
    } catch (error) {
      this.logger.error('Error collecting Redis metrics', error);
    }
  }

  private getRedisClient(): any {
    try {
      // Try to access the Redis client through cache-manager
      const store: any = (this.cacheManager as any).store;
      if (store && store.getClient) {
        return store.getClient();
      }

      // For cache-manager-redis-store
      if (store && store.client) {
        return store.client;
      }

      return null;
    } catch (error) {
      this.logger.error('Error accessing Redis client', error);
      return null;
    }
  }

  private async getConnectionStats(client: any): Promise<{
    total: number;
    active: number;
    idle: number;
    waiting: number;
  }> {
    try {
      // Try to get stats directly from client
      if (client.status && client.server_info) {
        const info = await client.info();
        const connectedClients = this.parseRedisInfo(info, 'connected_clients');
        const blockedClients = this.parseRedisInfo(info, 'blocked_clients');
        const usedMemory = this.parseRedisInfo(info, 'used_memory');
        const maxMemory = this.parseRedisInfo(info, 'maxmemory');

        // Add memory usage metrics
        if (usedMemory && maxMemory) {
          const memoryUsagePercent = (usedMemory / maxMemory) * 100;
          this.logger.debug(
            `Redis memory usage: ${memoryUsagePercent.toFixed(2)}%`,
          );

          // Alert if memory usage is high
          if (memoryUsagePercent > 80) {
            this.logger.warn(
              `Redis memory usage is high: ${memoryUsagePercent.toFixed(2)}%`,
            );
          }
        }

        return {
          total: connectedClients || 1,
          active: connectedClients || 1,
          idle: 0,
          waiting: blockedClients || 0,
        };
      }

      // Try to get pool stats for newer libraries
      if (client.pool && typeof client.pool.status === 'function') {
        const status = await client.pool.status();
        return {
          total: status.totalCount || 1,
          active: status.activeCount || 0,
          idle: status.idleCount || 0,
          waiting: status.waitingCount || 0,
        };
      }

      // Fallback for older clients with direct pool property
      if (client.pool) {
        return {
          total: client.pool.totalCount || client.pool.total || 1,
          active: client.pool.activeCount || client.pool.active || 0,
          idle: client.pool.idleCount || client.pool.idle || 0,
          waiting: client.pool.waitingCount || client.pool.pending || 0,
        };
      }

      // Default stats when we can't get actual data
      return { total: 1, active: 0, idle: 0, waiting: 0 };
    } catch (error) {
      this.logger.error('Error getting Redis connection stats', error);
      return { total: 1, active: 0, idle: 0, waiting: 0 };
    }
  }

  // Helper method to parse Redis INFO command output
  private parseRedisInfo(info: string, key: string): number {
    try {
      const regex = new RegExp(`^${key}:(.*)$`, 'm');
      const match = info.match(regex);
      return match ? parseInt(match[1], 10) : 0;
    } catch (error) {
      return 0;
    }
  }
}
