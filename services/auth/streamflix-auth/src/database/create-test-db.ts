import { DataSource } from 'typeorm';
import { createDatabase } from 'typeorm-extension';
import { dataSourceOptions } from './datasource';
import { Logger } from '@nestjs/common';

// Set environment to test
process.env.NODE_ENV = 'test';

async function createTestDatabase() {
  const logger = new Logger('CreateTestDB');

  try {
    logger.log('Creating test database...');

    // Create the database using typeorm-extension
    await createDatabase({
      options: {
        type: 'postgres', // Explicitly specify type
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'streamflix_auth',
      },
      ifNotExist: true,
    });

    logger.log(
      `Database "${process.env.DATABASE_NAME || 'streamflix_auth'}" created or already exists`,
    );

    // Initialize data source to run migrations
    const dataSource = new DataSource({
      ...dataSourceOptions,
      migrations: ['src/database/migrations/*.ts'], // Use TS files directly
    });

    logger.log('Connecting to database...');
    await dataSource.initialize();
    logger.log('Database connection established');

    // Run migrations
    logger.log('Running migrations...');
    await dataSource.runMigrations();
    logger.log('Migrations completed successfully');

    // Close connection
    await dataSource.destroy();
    logger.log('Database connection closed');

    logger.log('Test database setup complete! ✓');
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(`Failed to set up test database: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    } else {
      logger.error('An unknown error occurred');
    }
  }
}

// Run if executed directly
if (require.main === module) {
  createTestDatabase().catch((error) => {
    const logger = new Logger('CreateTestDB');
    logger.error(`Unhandled error: ${error}`);
    console.error(error);
  });
}

export { createTestDatabase };
