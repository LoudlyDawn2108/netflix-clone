import { DataSource } from 'typeorm';
import dataSource from './data-source';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Command-line script for running database migrations
 * Usage: npm run migration:run
 */
async function runMigrations() {
  try {
    const connection = await dataSource.initialize();
    console.log('Database connected successfully');

    console.log('Running migrations...');
    const migrations = await connection.runMigrations();

    if (migrations.length > 0) {
      console.log(`✅ Applied ${migrations.length} migrations`);
      migrations.forEach((migration, index) => {
        console.log(`${index + 1}. ${migration.name}`);
      });
    } else {
      console.log('No pending migrations to run');
    }

    await connection.destroy();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();
