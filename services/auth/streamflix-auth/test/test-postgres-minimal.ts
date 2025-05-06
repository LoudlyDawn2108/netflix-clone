import { Client } from 'pg';

async function testConnection() {
  console.log('Starting minimal PostgreSQL connection test');

  // Create a client with explicit connection details
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
  });

  try {
    console.log('Attempting to connect with explicit credentials...');
    await client.connect();
    console.log('Successfully connected to PostgreSQL!');

    // Execute a simple query
    const result = await client.query('SELECT version()');
    console.log(`PostgreSQL version: ${result.rows[0].version}`);

    await client.end();
    console.log('Connection closed cleanly');
  } catch (error: any) {
    console.error(`Connection failed: ${error.message}`);
    console.error(error);

    // Special handling for auth errors
    if (error.code === '28P01') {
      console.log('\nAttempting to diagnose auth issues:');
      console.log('- PostgreSQL might be using SCRAM-SHA-256 instead of MD5');
      console.log('- Check if we can we connect directly from the Docker host');
      console.log('- Try setting CLIENT_ENCODING environment variable');
    }
  }
}

// Execute the test function
testConnection().catch((error) => {
  console.error(`Unhandled error: ${error.message}`);
  console.error(error);
});
