import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<TypeOrmModuleOptions> => {
        // Get the logger and metrics service instances
        const logger = new LoggerService().setContext('DatabaseModule');

        // Pool configuration
        const poolSize = configService.get<number>('database.poolSize', 20);
        const idleTimeoutMillis = configService.get<number>(
          'database.idleTimeoutMillis',
          30000,
        );
        const connectionTimeoutMillis = configService.get<number>(
          'database.connectionTimeoutMillis',
          5000,
        );

        logger.log(
          `Configuring database connection pool: size=${poolSize}, idleTimeout=${idleTimeoutMillis}ms`,
        );

        return {
          type: 'postgres',
          host: configService.get('database.host'),
          port: configService.get('database.port'),
          username: configService.get('database.username'),
          password: configService.get('database.password'),
          database: configService.get('database.database'),
          schema: configService.get('database.schema'),
          entities: ['dist/**/*.entity{.ts,.js}'],
          autoLoadEntities: true,
          synchronize: configService.get('database.synchronize'),
          logging: configService.get('database.logging'),
          logger: configService.get('database.logging')
            ? 'advanced-console'
            : undefined,
          maxQueryExecutionTime: 1000, // Log queries that take longer than 1s
          retryAttempts: 3,
          retryDelay: 3000, // 3s between retries
          // Enhanced connection pool settings
          poolSize: poolSize,
          connectTimeoutMS: connectionTimeoutMillis,
          extra: {
            // PostgreSQL specific pool configuration
            max: poolSize,
            idleTimeoutMillis: idleTimeoutMillis,
            connectionTimeoutMillis: connectionTimeoutMillis,
          },
          // Performance optimizations
          cache: {
            duration: 30000, // 30 seconds query result caching
            type: 'ioredis',
            options: {
              host: configService.get('redis.host') || 'localhost',
              port: configService.get('redis.port') || 6379,
              password: configService.get('redis.password'),
            },
            ignoreErrors: true,
          },
          // Migration configuration
          migrations: ['dist/database/migrations/*{.ts,.js}'],
          migrationsRun: configService.get('database.migrationsRun'),
          migrationsTableName: 'migrations_history',
          // SSL configuration for production
          ssl:
            configService.get('NODE_ENV') === 'production'
              ? { rejectUnauthorized: false }
              : false,
        };
      },
      dataSourceFactory: async (options) => {
        const dataSource = await new DataSource(options).initialize();

        // Log pool status on initialization
        const logger = new LoggerService().setContext('DatabaseModule');
        const poolStats = await getPoolStatistics(dataSource);
        logger.log(
          `Database connection pool initialized: ${JSON.stringify(poolStats)}`,
        );

        // Set up periodic pool monitoring
        if (dataSource && process.env.NODE_ENV === 'production') {
          setInterval(async () => {
            const stats = await getPoolStatistics(dataSource);
            if (stats) {
              const metrics = new MetricsService();
              metrics.setDatabaseConnectionPool(
                stats.used,
                stats.idle,
                stats.waiting || 0,
              );

              // Log if pool is under pressure
              if (stats.used > (options.poolSize || 20) * 0.8) {
                logger.warn(
                  `Database connection pool is under pressure: ${JSON.stringify(stats)}`,
                );
              }
            }
          }, 60000); // Monitor every minute
        }

        return dataSource;
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

// Helper function to get pool statistics
async function getPoolStatistics(
  dataSource: DataSource,
): Promise<{ total: number; used: number; idle: number; waiting: number }> {
  try {
    if (dataSource?.driver?.['pool']) {
      const pool = dataSource.driver['pool'];
      return {
        total: pool.totalCount,
        used: pool.activeCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount || 0,
      };
    }
    return { total: 0, used: 0, idle: 0, waiting: 0 };
  } catch (error) {
    return { total: 0, used: 0, idle: 0, waiting: 0 };
  }
}
