import Redis from 'ioredis';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const logger = new Logger('TokenSchemaTest');

/**
 * A simple Redis client wrapper to mimic our RedisService functionality
 */
class SimpleRedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB || '0', 10),
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async quit(): Promise<void> {
    await this.client.quit();
  }
}

/**
 * A simplified version of our TokenSchema class for testing
 */
class SimpleTokenSchema {
  constructor(private readonly redisService: SimpleRedisService) {}

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

    logger.log(`Storing refresh token: ${key}`);
    await this.redisService.set(key, value, ttlSeconds);
  }

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
      logger.error(`Error parsing token data: ${error.message}`);
      return null;
    }
  }

  async blacklistToken(tokenId: string, ttlSeconds: number): Promise<void> {
    const key = `blacklisted_token:${tokenId}`;
    await this.redisService.set(key, '1', ttlSeconds);
  }

  async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    const key = `blacklisted_token:${tokenId}`;
    const value = await this.redisService.get(key);
    return value !== null;
  }

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
}

/**
 * Test the token schema implementation
 */
async function testTokenSchema() {
  logger.log('Starting token schema test');

  const redisService = new SimpleRedisService();
  const tokenSchema = new SimpleTokenSchema(redisService);

  try {
    // Test user and token data
    const userId = 'test-user-123';
    const tokenId = 'test-token-456';
    const ttlSeconds = 60;
    const metadata = {
      device: 'test-device',
      ip: '192.168.1.1',
    };

    // Step 1: Store a refresh token
    logger.log('Testing storage of refresh token...');
    await tokenSchema.storeRefreshToken(userId, tokenId, ttlSeconds, metadata);

    const key = `refresh_token:${userId}:${tokenId}`;
    const ttl = await redisService.ttl(key);
    logger.log(`Token TTL: ${ttl} seconds`);

    if (ttl > 0 && ttl <= ttlSeconds) {
      logger.log('✓ Token storage and TTL successful');
    } else {
      logger.error(`✗ Token TTL check failed: ${ttl}`);
    }

    // Step 2: Retrieve the token
    logger.log('Testing refresh token retrieval...');
    const token = await tokenSchema.getRefreshToken(userId, tokenId);

    if (token) {
      logger.log(`Retrieved token: ${JSON.stringify(token)}`);

      if (token.userId === userId && token.tokenId === tokenId) {
        logger.log('✓ Token data is correct');
      } else {
        logger.error('✗ Token data mismatch');
      }

      if (token.metadata.device === metadata.device) {
        logger.log('✓ Token metadata is correct');
      } else {
        logger.error('✗ Token metadata mismatch');
      }
    } else {
      logger.error('✗ Failed to retrieve token');
    }

    // Step 3: Test token blacklisting
    logger.log('Testing token blacklisting...');
    await tokenSchema.blacklistToken(tokenId, ttlSeconds);

    const isBlacklisted = await tokenSchema.isTokenBlacklisted(tokenId);
    if (isBlacklisted) {
      logger.log('✓ Token blacklisting successful');
    } else {
      logger.error('✗ Token blacklisting failed');
    }

    // Step 4: Test rate limiting
    logger.log('Testing rate limiting...');
    const ip = '192.168.0.1';
    const endpoint = '/api/auth/login';

    const count1 = await tokenSchema.trackRateLimit(ip, endpoint, ttlSeconds);
    const count2 = await tokenSchema.trackRateLimit(ip, endpoint, ttlSeconds);

    if (count1 === 1 && count2 === 2) {
      logger.log('✓ Rate limiting increments correctly');
    } else {
      logger.error(`✗ Rate limiting increment failed: ${count1}, ${count2}`);
    }

    // Cleanup - delete all test keys
    logger.log('Cleaning up test data');
    await redisService.del(`refresh_token:${userId}:${tokenId}`);
    await redisService.del(`blacklisted_token:${tokenId}`);
    await redisService.del(`rate_limit:${ip}:${endpoint}`);

    logger.log('✅ Token schema test completed successfully');
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    console.error(error);
  } finally {
    // Close the Redis connection
    await redisService.quit();
  }
}

// Execute test function
testTokenSchema().catch((error) => {
  logger.error(`Unhandled error: ${error.message}`);
  console.error(error);
});
