import { createConnection } from 'typeorm';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import { Logger } from '@nestjs/common';

// Load environment variables
dotenv.config({ path: '.env' });

const logger = new Logger('ConnectionTest');

async function testConnections() {
  logger.log('Starting connection tests...');

  // Test PostgreSQL connection
  try {
    logger.log('Testing PostgreSQL connection...');
    logger.log(
      `Connecting to: ${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}`,
    );

    const connection = await createConnection({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'streamflix_auth',
    });

    logger.log('✓ PostgreSQL connection successful');

    // Execute a simple query to verify connection
    const result = await connection.query('SELECT NOW() as time');
    logger.log(`Database time: ${result[0].time}`);

    // List database tables
    const tables = await connection.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );

    if (tables.length > 0) {
      logger.log(
        `Found database tables: ${tables.map((t: any) => t.table_name).join(', ')}`,
      );
    } else {
      logger.log('No tables found in database - schema needs to be created');
    }

    await connection.close();
    logger.log('PostgreSQL connection closed');
  } catch (error) {
    logger.error(`PostgreSQL connection failed: ${error.message}`);
  }

  // Test Redis connection
  try {
    logger.log('Testing Redis connection...');
    logger.log(
      `Connecting to: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    );

    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB || '0', 10),
    });

    // Test Redis connection with PING command
    const pingResult = await redis.ping();
    if (pingResult === 'PONG') {
      logger.log('✓ Redis connection successful');

      // Test basic Redis operations
      await redis.set('test:key', 'Hello from test script');
      const value = await redis.get('test:key');
      logger.log(`Retrieved test value: ${value}`);

      // Clean up test data
      await redis.del('test:key');
    } else {
      logger.error(`Redis ping failed, received: ${pingResult}`);
    }

    await redis.quit();
    logger.log('Redis connection closed');
  } catch (error) {
    logger.error(`Redis connection failed: ${error.message}`);
  }

  logger.log('Connection tests completed');
}

// Execute the test function
testConnections().catch((error) => {
  logger.error(`Unhandled error: ${error.message}`);
  console.error(error);
});
