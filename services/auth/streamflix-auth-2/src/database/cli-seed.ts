import dataSource from './data-source';
import { runSeeds } from './seeds/seed-runner';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Command-line script for seeding the database
 * Usage: npm run seed:run
 */
async function seedDatabase() {
  try {
    const connection = await dataSource.initialize();
    console.log('Database connected successfully');

    await runSeeds(connection);

    await connection.destroy();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
