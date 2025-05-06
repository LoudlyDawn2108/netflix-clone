import { Client } from 'pg';
import { Logger } from '@nestjs/common';

const logger = new Logger('PostgresTest');

async function testPostgresConnection() {
  logger.log('Starting PostgreSQL connection test...');

  // Create a client with explicit connection details
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres', // Try connecting to the default database first
  });

  try {
    logger.log('Connecting to PostgreSQL...');
    await client.connect();
    logger.log('✓ PostgreSQL connection successful');

    // Execute a simple query to verify connection
    const result = await client.query('SELECT version()');
    logger.log(`PostgreSQL version: ${result.rows[0].version}`);

    // List available databases
    const dbResult = await client.query('SELECT datname FROM pg_database');
    logger.log(
      `Available databases: ${dbResult.rows.map((row) => row.datname).join(', ')}`,
    );

    // Close the connection
    await client.end();
    logger.log('PostgreSQL connection closed');
  } catch (error) {
    logger.error(`PostgreSQL connection failed: ${error.message}`);
    console.error(error);
  }
}

// Execute the test function
testPostgresConnection().catch((error) => {
  logger.error(`Unhandled error: ${error.message}`);
  console.error(error);
});
