import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { UserRepository } from './repositories/user.repository';
import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';

// Set environment to test explicitly
process.env.NODE_ENV = 'test';

async function testDatabaseConnection() {
  const logger = new Logger('DatabaseTest');
  logger.log('Starting database connection test...');
  logger.log(`Using environment: ${process.env.NODE_ENV}`);

  try {
    // Create a standalone application context
    const app = await NestFactory.createApplicationContext(AppModule);

    // Get the datasource from the application
    const dataSource = app.get(DataSource);

    // Test the database connection
    if (dataSource.isInitialized) {
      logger.log('✓ Database connection established successfully!');

      // Get repositories
      const userRepo = app.get(UserRepository);
      const roleRepo = app.get(RoleRepository);
      const permissionRepo = app.get(PermissionRepository);

      // Test repository functionality
      logger.log('Testing repositories...');

      // List tables in the database
      const tables = await dataSource.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
      );

      logger.log(
        `Database tables: ${tables.map((t: any) => t.table_name).join(', ')}`,
      );

      // Test role repository
      const roles = await roleRepo.findAll();
      logger.log(`Found ${roles.length} roles in database`);

      // Test permission repository
      const permissions = await permissionRepo.findAll();
      logger.log(`Found ${permissions.length} permissions in database`);

      // Test user repository
      const userCount = await userRepo.count();
      logger.log(`Found ${userCount} users in database`);

      // Log success
      logger.log(
        'Database connection and repositories test passed successfully!',
      );
    } else {
      logger.error('✗ Database connection failed!');
      process.exit(1);
    }

    await app.close();
  } catch (error) {
    logger.error(`Database test failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Only run the function if this file is executed directly
if (require.main === module) {
  testDatabaseConnection();
}
