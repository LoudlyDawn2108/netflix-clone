import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { UserRepository } from './repositories/user.repository';
import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';

async function bootstrap() {
  const logger = new Logger('DatabaseTest');
  logger.log('Starting database connection test...');

  try {
    // Create a standalone application context
    const app = await NestFactory.createApplicationContext(AppModule);

    // Get the datasource from the application
    const dataSource = app.get(DataSource);

    // Test the database connection
    logger.log('Testing database connection...');
    if (dataSource.isInitialized) {
      logger.log('Database connection established successfully!');

      // Get repositories
      const userRepo = app.get(UserRepository);
      const roleRepo = app.get(RoleRepository);
      const permissionRepo = app.get(PermissionRepository);

      // Count entities to verify repositories are working
      const usersCount = await userRepo.count();
      const rolesCount = await roleRepo.count();
      const permissionsCount = await permissionRepo.count();

      logger.log(
        `Found ${usersCount} users, ${rolesCount} roles, and ${permissionsCount} permissions in the database.`,
      );

      // List database tables
      const tables = await dataSource.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
      );

      logger.log(
        `Database tables: ${tables.map((t) => t.table_name).join(', ')}`,
      );
    } else {
      logger.error('Database connection failed!');
    }

    // Close the application when done
    await app.close();
    logger.log('Test completed.');
  } catch (error) {
    logger.error(`Database connection test failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

bootstrap();
