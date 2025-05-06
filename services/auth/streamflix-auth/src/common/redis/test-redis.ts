import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { RedisService } from './redis.service';
import { TokenSchema } from './schema/token.schema';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testRedisConnection() {
  const logger = new Logger('RedisTest');
  logger.log('Starting Redis connection test...');

  try {
    // Create a standalone application context
    const app = await NestFactory.createApplicationContext(AppModule);

    // Get the Redis service from the application
    const redisService = app.get(RedisService);
    const tokenSchema = app.get(TokenSchema);

    // Test Redis connection with ping
    logger.log('Testing Redis connection...');
    const redisClient = redisService.getClient();
    const pingResult = await redisClient.ping();

    if (pingResult === 'PONG') {
      logger.log('✓ Redis connection successful');
    } else {
      logger.error(
        `✗ Redis connection failed. Expected 'PONG', got '${pingResult}'`,
      );
      process.exit(1);
    }

    // Test basic Redis operations
    logger.log('Testing basic Redis operations...');
    const testKey = 'test:key';
    const testValue = 'hello redis';

    // SET operation
    await redisService.set(testKey, testValue);

    // GET operation
    const retrievedValue = await redisService.get(testKey);
    if (retrievedValue === testValue) {
      logger.log('✓ Basic SET/GET operations successful');
    } else {
      logger.error(
        `✗ Basic operations failed. Expected '${testValue}', got '${retrievedValue}'`,
      );
    }

    // DELETE operation
    await redisService.del(testKey);
    const afterDelete = await redisService.get(testKey);
    if (afterDelete === null) {
      logger.log('✓ DELETE operation successful');
    } else {
      logger.error(
        `✗ DELETE operation failed. Key still exists with value: ${afterDelete}`,
      );
    }

    // Test token management functionality
    logger.log('Testing token management functionality...');

    // Sample data
    const userId = 'test-user-123';
    const tokenId = 'test-token-456';
    const expirySeconds = 60;

    // Store refresh token
    await tokenSchema.storeRefreshToken(userId, tokenId, expirySeconds, {
      device: 'test-device',
      ip: '192.168.1.1',
    });
    logger.log('✓ Token stored successfully');

    // Retrieve token
    const token = await tokenSchema.getRefreshToken(userId, tokenId);
    if (token && token.userId === userId && token.tokenId === tokenId) {
      logger.log('✓ Token retrieval successful');
      logger.log(`Token details: ${JSON.stringify(token)}`);
    } else {
      logger.error(
        `✗ Token retrieval failed. Expected userId ${userId}, got ${JSON.stringify(token)}`,
      );
    }

    // Blacklist token
    await tokenSchema.blacklistToken(tokenId, expirySeconds);

    // Check if blacklisted
    const isBlacklisted = await tokenSchema.isTokenBlacklisted(tokenId);
    if (isBlacklisted) {
      logger.log('✓ Token blacklisting successful');
    } else {
      logger.error('✗ Token blacklisting failed');
    }

    // Test rate limiting functionality
    logger.log('Testing rate limiting functionality...');
    const ip = '192.168.0.1';
    const endpoint = '/api/auth/login';

    // Track rate limit
    const count1 = await tokenSchema.trackRateLimit(ip, endpoint, 60);
    const count2 = await tokenSchema.trackRateLimit(ip, endpoint, 60);

    if (count1 === 1 && count2 === 2) {
      logger.log('✓ Rate limiting tracking successful');
    } else {
      logger.error(
        `✗ Rate limiting tracking failed. Expected counts 1 and 2, got ${count1} and ${count2}`,
      );
    }

    // Clean up test data
    await tokenSchema.deleteRefreshToken(userId, tokenId);
    logger.log('✓ Redis test completed successfully!');

    await app.close();
  } catch (error) {
    logger.error(`Redis test failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Only run the function if this file is executed directly
if (require.main === module) {
  testRedisConnection();
}

const logger = new Logger('RedisTokenTest');

/**
 * A simple test for Redis token functionality
 */
async function testRedisTokens() {
  logger.log('Starting Redis token test...');

  try {
    // Connect to Redis
    const redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB || '0', 10),
    });

    logger.log('Connected to Redis successfully');

    // Test user data
    const userId = 1;
    const userEmail = 'test@example.com';

    // Create an access token
    const accessToken = 'test-access-token';
    const accessTokenKey = `token:access:${accessToken}`;

    const tokenData: TokenSchema = {
      userId,
      email: userEmail,
      type: 'access',
      createdAt: new Date().toISOString(),
    };

    // Store token in Redis
    await redisClient.set(accessTokenKey, JSON.stringify(tokenData));

    // Set token expiration (60 seconds for this test)
    await redisClient.expire(accessTokenKey, 60);

    logger.log(`Stored access token: ${accessToken}`);

    // Retrieve token
    const storedTokenJson = await redisClient.get(accessTokenKey);

    if (storedTokenJson) {
      const storedToken = JSON.parse(storedTokenJson) as TokenSchema;
      logger.log('Retrieved token data:');
      logger.log(storedToken);

      // Validate token data
      if (storedToken.userId === userId && storedToken.email === userEmail) {
        logger.log('✓ Token validation successful');
      } else {
        logger.error('✗ Token validation failed - data mismatch');
      }

      // Check TTL
      const ttl = await redisClient.ttl(accessTokenKey);
      logger.log(`Token TTL: ${ttl} seconds`);

      if (ttl > 0 && ttl <= 60) {
        logger.log('✓ TTL validation successful');
      } else {
        logger.error(`✗ TTL validation failed - unexpected value: ${ttl}`);
      }
    } else {
      logger.error('✗ Failed to retrieve token');
    }

    // Clean up test data
    await redisClient.del(accessTokenKey);
    logger.log('Test token removed from Redis');

    // Close Redis connection
    await redisClient.quit();
    logger.log('Redis connection closed');
  } catch (error) {
    logger.error(`Redis token test failed: ${error.message}`);
    console.error(error);
  }
}

// Run the test
testRedisTokens().catch((error) => {
  logger.error(`Unhandled error: ${error.message}`);
  console.error(error);
});
