// Direct Node.js script to test PG connection
const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    database: 'ai_square_db',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const res = await client.query('SELECT 2 + 2 as sum');
    console.log('Query result:', res.rows);

    const res2 = await client.query('SELECT $1::text as message', ['Hello']);
    console.log('Parameterized query result:', res2.rows);

    await client.end();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

testConnection();
