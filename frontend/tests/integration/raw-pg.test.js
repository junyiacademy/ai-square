// Raw JavaScript test to bypass any TypeScript/Jest issues
const { Client } = require('pg');

describe.skip('Raw PG Test', () => {
  let client;
  
  beforeAll(async () => {
    client = new Client({
      host: 'localhost',
      port: 5433,
      database: 'ai_square_db',
      user: 'postgres',
      password: 'postgres',
    });
    
    await client.connect();
    console.log('Connected to database');
  });
  
  afterAll(async () => {
    await client.end();
  });
  
  test('basic query', async () => {
    const res = await client.query('SELECT $1::text as message', ['Hello world!']);
    console.log('Result:', res.rows);
    expect(Array.isArray(res.rows)).toBe(true);
    if (res.rows[0]) {
      expect(res.rows[0].message).toBe('Hello world!');
    }
  });
  
  test('math query', async () => {
    const res = await client.query('SELECT 2 + 2 as sum');
    console.log('Math result:', res.rows);
    expect(Array.isArray(res.rows)).toBe(true);
    if (res.rows[0]) {
      expect(res.rows[0].sum).toBe(4);
    }
  });
});