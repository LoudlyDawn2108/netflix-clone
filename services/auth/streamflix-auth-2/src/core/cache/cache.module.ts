import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { TokenCacheService } from './token-cache.service';
import { UserCacheService } from './user-cache.service';
import { TokenValidationCacheService } from './token-validation-cache.service';
import { RedisPoolMonitorService } from './redis-pool-monitor.service';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('redis.host') || 'localhost',
        port: configService.get('redis.port') || 6379,
        password: configService.get('redis.password') || undefined,
        ttl: configService.get('redis.ttl') || 86400, // Default to 1 day
        max: configService.get('redis.maxItems') || 1000,
        isGlobal: true,
        // Enhanced connection pool settings for Redis
        db: configService.get('redis.db') || 0,
        connectTimeout: configService.get('redis.connectTimeout') || 5000,
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000), // Progressive backoff
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        // Connection pool settings
        socket: {
          keepAlive: 5000, // Keep socket alive with small pings
          noDelay: true, // Disable Nagle algorithm for faster small packets
        },
      }),
    }),
  ],
  providers: [
    TokenCacheService,
    UserCacheService,
    TokenValidationCacheService,
    RedisPoolMonitorService,
  ],
  exports: [
    TokenCacheService,
    UserCacheService,
    TokenValidationCacheService,
    RedisPoolMonitorService,
    NestCacheModule,
  ],
})
export class CacheModule {}
