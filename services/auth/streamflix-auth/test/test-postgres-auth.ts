import { Client } from 'pg';
import { Logger } from '@nestjs/common';

const logger = new Logger('PostgresAuthTest');

async function testPostgresConnection() {
  logger.log('Starting PostgreSQL connection tests with different methods...');

  // Try various authentication methods
  const methods = [
    {
      name: 'Default connection',
      options: {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'postgres',
        database: 'postgres',
      },
    },
    {
      name: 'Trust auth',
      options: {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'postgres',
        database: 'postgres',
        ssl: false,
      },
    },
    {
      name: 'Environment DB',
      options: {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'postgres',
        database: 'streamflix_auth',
        ssl: false,
      },
    },
  ];

  for (const method of methods) {
    const client = new Client(method.options);

    logger.log(`Testing: ${method.name}`);
    logger.log(`Connection options: ${JSON.stringify(method.options)}`);

    try {
      await client.connect();
      logger.log(`✓ Connection successful with ${method.name}`);

      // Try a simple query
      const result = await client.query('SELECT version()');
      logger.log(`PostgreSQL version: ${result.rows[0].version}`);

      // Close the connection
      await client.end();
      logger.log(`Connection closed for ${method.name}`);
    } catch (error) {
      logger.error(`Connection failed with ${method.name}: ${error.message}`);
    }
  }
}

// Execute the test function
testPostgresConnection().catch((error) => {
  logger.error(`Unhandled error: ${error.message}`);
  console.error(error);
});
