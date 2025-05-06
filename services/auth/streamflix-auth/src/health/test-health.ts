import { NestFactory } from '@nestjs/core';
import { INestApplication, Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import axios from 'axios';

async function testHealthEndpoint() {
  const logger = new Logger('HealthTest');
  logger.log('Starting health endpoint test...');

  let app: INestApplication;

  try {
    // Create and start the NestJS application
    app = await NestFactory.create(AppModule);
    const port = 3030; // Use a specific port for testing
    await app.listen(port);

    logger.log(`Application started on port ${port}`);

    // Test the health endpoint
    const healthUrl = `http://localhost:${port}/health`;
    logger.log(`Testing health endpoint: ${healthUrl}`);

    const response = await axios.get(healthUrl);

    // Check if response is successful
    if (response.status === 200) {
      logger.log('✓ Health endpoint responded with status 200');
      logger.log(
        `Health check response data: ${JSON.stringify(response.data, null, 2)}`,
      );

      // Check the health status details
      const status = response.data.status;
      if (status === 'ok') {
        logger.log('✓ Health check status is "ok"');
      } else {
        logger.error(`✗ Unexpected health check status: ${status}`);
      }

      // Check individual components if available
      if (response.data.details) {
        const details = response.data.details;
        logger.log('Health check component details:');

        // Database health check
        if (details.database) {
          const dbStatus = details.database.status;
          if (dbStatus === 'up') {
            logger.log('✓ Database health check passed');
          } else {
            logger.error(`✗ Database health check failed: ${dbStatus}`);
          }
        }

        // Memory health check
        if (details.memory_heap) {
          const memoryStatus = details.memory_heap.status;
          if (memoryStatus === 'up') {
            logger.log('✓ Memory health check passed');
          } else {
            logger.error(`✗ Memory health check failed: ${memoryStatus}`);
          }
        }

        // Disk health check
        if (details.disk) {
          const diskStatus = details.disk.status;
          if (diskStatus === 'up') {
            logger.log('✓ Disk health check passed');
          } else {
            logger.error(`✗ Disk health check failed: ${diskStatus}`);
          }
        }
      }

      logger.log('✓ Health check test completed successfully!');
    } else {
      logger.error(
        `✗ Health endpoint returned unexpected status: ${response.status}`,
      );
    }
  } catch (error) {
    logger.error(`Health check test failed: ${error.message}`);
    console.error(error.stack);
  } finally {
    // Close the application
    if (app) {
      await app.close();
      logger.log('Application closed');
    }
  }
}

// Only run the function if this file is executed directly
if (require.main === module) {
  testHealthEndpoint();
}
