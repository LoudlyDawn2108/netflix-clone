import { DataSource } from 'typeorm';
import { seedUsers } from './user.seed';
import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { RBACSeeder } from './rbac.seed';

// Load environment variables
dotenv.config();

/**
 * Seeds the database with initial data
 * @param dataSource TypeORM DataSource
 */
export const runSeeds = async (dataSource: DataSource): Promise<void> => {
  console.log('🌱 Starting database seed...');

  try {
    // Run basic SQL seeds
    await seedUsers(dataSource);

    // Run NestJS service-based seeds
    // For seeds that require dependency injection and complex logic
    const app = await NestFactory.create(AppModule);
    const rbacSeeder = app.get(RBACSeeder);
    await rbacSeeder.seed();
    await app.close();

    console.log('✅ Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};
