import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.redisClient = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: +this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD', ''),
      db: +this.configService.get('REDIS_DB', 0),
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.error(`Redis connection failed after ${times} attempts`);
          return null; // stop retrying
        }
        return Math.min(times * 200, 3000); // increasing timeout
      },
    });

    this.redisClient.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.redisClient.on('error', (error) => {
      this.logger.error(`Redis client error: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.logger.log('Redis client disconnected');
    }
  }

  /**
   * Set a value in Redis with optional expiry
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return this.redisClient.setex(key, ttlSeconds, value);
    }
    return this.redisClient.set(key, value);
  }

  /**
   * Get a value from Redis
   */
  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  /**
   * Delete a key from Redis
   */
  async del(key: string): Promise<number> {
    return this.redisClient.del(key);
  }

  /**
   * Check if a key exists in Redis
   */
  async exists(key: string): Promise<number> {
    return this.redisClient.exists(key);
  }

  /**
   * Set a key's time to live in seconds
   */
  async expire(key: string, seconds: number): Promise<number> {
    return this.redisClient.expire(key, seconds);
  }

  /**
   * Increment a counter in Redis
   */
  async incr(key: string): Promise<number> {
    return this.redisClient.incr(key);
  }

  /**
   * Execute multiple Redis commands in a pipeline
   */
  async pipeline(commands: Array<[string, ...any[]]>): Promise<any[]> {
    const pipeline = this.redisClient.pipeline();

    commands.forEach(([command, ...args]) => {
      (pipeline as any)[command](...args);
    });

    const results = await pipeline.exec();
    return results || [];
  }

  /**
   * Get total metrics of rate limiting per endpoint
   */
  async getRateLimitMetrics(endpoint: string): Promise<number> {
    const keys = await this.redisClient.keys(`rate_limit:*:${endpoint}`);

    if (!keys || keys.length === 0) {
      return 0;
    }

    const pipeline = this.redisClient.pipeline();
    keys.forEach((key) => pipeline.get(key));

    const results = await pipeline.exec();
    if (!results || results.length === 0) {
      return 0;
    }

    // Handle potential null value in results
    let total = 0;
    for (const [err, value] of results) {
      if (err) {
        this.logger.error(`Error getting rate limit metrics: ${err.message}`);
        continue;
      }
      if (value !== null) {
        total += parseInt(value as string, 10);
      }
    }

    return total;
  }

  /**
   * Get Redis client for advanced operations
   */
  getClient(): Redis {
    return this.redisClient;
  }
}
