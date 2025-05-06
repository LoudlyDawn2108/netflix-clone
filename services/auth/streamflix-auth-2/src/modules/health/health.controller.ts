import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  MicroserviceHealthIndicator,
  HealthCheckResult,
  HealthIndicatorFunction,
} from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';
import { LoggerService } from '../../core/logging/logger.service';
import { MetricsService } from '../../core/monitoring/metrics.service';
import { Transport } from '@nestjs/microservices';
import { getConnectionManager } from 'typeorm';
import * as Redis from 'redis';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Controller('health')
export class HealthController {
  private readonly redisClient: Redis.RedisClientType;

  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly typeOrmHealthIndicator: TypeOrmHealthIndicator,
    private readonly memoryHealthIndicator: MemoryHealthIndicator,
    private readonly diskHealthIndicator: DiskHealthIndicator,
    private readonly microserviceHealthIndicator: MicroserviceHealthIndicator,
    private readonly logger: LoggerService,
    private readonly metricsService: MetricsService,
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.logger.setContext('HealthController');

    // Create Redis client for health checks
    if (process.env.REDIS_HOST) {
      const redisOptions = {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        password: process.env.REDIS_PASSWORD,
      };
      this.redisClient = Redis.createClient(
        redisOptions,
      ) as Redis.RedisClientType;
    }
  }

  @Public()
  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let result;

    try {
      result = await this.health.check([
        // Database health check
        (): Promise<any> => this.typeOrmHealthIndicator.pingCheck('database'),

        // Redis cache health check
        async (): Promise<any> => {
          if (!this.redisClient) {
            return {
              redis: { status: 'skipped', message: 'Redis not configured' },
            };
          }

          try {
            if (!this.redisClient.isOpen) {
              await this.redisClient.connect();
            }
            await this.redisClient.ping();
            return {
              redis: {
                status: 'up',
                message: 'Redis is operational',
              },
            };
          } catch (error) {
            return {
              redis: {
                status: 'down',
                message: `Redis is not operational: ${error.message}`,
              },
            };
          }
        },

        // System resource checks
        async (): Promise<any> => {
          const resourceChecks = {};

          // Check memory usage
          try {
            const memCheck = await this.memoryHealthIndicator.checkHeap(
              'memory_heap',
              300 * 1024 * 1024,
            );
            resourceChecks['memory'] = memCheck.memory_heap;
          } catch (error) {
            resourceChecks['memory'] = {
              status: 'warning',
              message: `Memory usage high: ${error.message}`,
            };
          }

          // Check disk space
          try {
            const diskCheck = await this.diskHealthIndicator.checkStorage(
              'disk',
              { path: '/', thresholdPercent: 80 },
            );
            resourceChecks['disk'] = diskCheck.disk;
          } catch (error) {
            resourceChecks['disk'] = {
              status: 'warning',
              message: `Disk space low: ${error.message}`,
            };
          }

          return resourceChecks;
        },

        // Database connection pool metrics
        async (): Promise<any> => {
          try {
            const pool = this.connection.driver.pool;
            const poolStats = {
              used: pool.totalUsed?.() || 0,
              size: pool.size || 0,
              idle: pool.totalIdle?.() || 0,
              waiting: pool.totalWaitingInQueue?.() || 0,
            };

            // Update metrics for database connection pool
            this.metricsService.setDatabaseConnectionPool(
              poolStats.used,
              poolStats.idle,
              poolStats.waiting,
            );

            const status = poolStats.waiting > 10 ? 'warning' : 'up';
            return {
              db_pool: {
                status,
                message: `Pool: ${poolStats.used} used, ${poolStats.idle} idle, ${poolStats.waiting} waiting`,
                details: poolStats,
              },
            };
          } catch (error) {
            return {
              db_pool: {
                status: 'warning',
                message: `Could not check DB pool: ${error.message}`,
              },
            };
          }
        },
      ]);

      // Log health check results
      this.logger.debug('Health check completed', {
        duration: Date.now() - startTime,
        status: result.status,
      });

      return result;
    } catch (error) {
      this.logger.error('Health check failed', error);
      throw error;
    }
  }

  @Public()
  @Get('liveness')
  @HealthCheck()
  async checkLiveness(): Promise<HealthCheckResult> {
    return this.health.check([
      // Just check that the application is running
      async (): Promise<any> => ({
        process: {
          status: 'up',
          message: 'Application is running',
          details: {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
          },
        },
      }),
    ]);
  }

  @Public()
  @Get('readiness')
  @HealthCheck()
  async checkReadiness(): Promise<HealthCheckResult> {
    return this.health.check([
      // Database health check for readiness
      (): Promise<any> => this.typeOrmHealthIndicator.pingCheck('database'),

      // Redis cache health check for readiness
      async (): Promise<any> => {
        if (!this.redisClient) {
          return {
            redis: { status: 'skipped', message: 'Redis not configured' },
          };
        }

        try {
          if (!this.redisClient.isOpen) {
            await this.redisClient.connect();
          }
          await this.redisClient.ping();
          return {
            redis: {
              status: 'up',
              message: 'Redis is operational',
            },
          };
        } catch (error) {
          return {
            redis: {
              status: 'down',
              message: `Redis is not operational: ${error.message}`,
            },
          };
        }
      },
    ]);
  }
}
