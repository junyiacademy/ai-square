/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Test interactions API endpoint
 * Usage: cd frontend && npx tsx src/scripts/test/test-interactions-api.ts
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3002';
const TASK_ID = '9d641ff6-208d-4919-9fb1-c6de99904f67';

async function testInteractionsAPI() {
  try {
    console.log('Testing interactions API...');
    console.log(`GET ${BASE_URL}/api/pbl/tasks/${TASK_ID}/interactions`);

    // First, we need to login to get session
    console.log('\n1. Testing without authentication...');
    const unauthResponse = await fetch(`${BASE_URL}/api/pbl/tasks/${TASK_ID}/interactions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Status:', unauthResponse.status);
    const unauthData = await unauthResponse.json();
    console.log('Response:', JSON.stringify(unauthData, null, 2));

    if (unauthResponse.status === 401) {
      console.log('\nAuthentication required. You need to test this with a valid session cookie.');
      console.log('Steps to get session cookie:');
      console.log('1. Open browser and login to the app');
      console.log('2. Open DevTools (F12) -> Application -> Cookies');
      console.log('3. Find the session cookie (usually named "connect.sid" or similar)');
      console.log('4. Copy the cookie value and add it to the fetch headers');
    }

    // Test with mock authentication
    console.log('\n2. Testing the data flow...');
    
    // Direct database query to compare
    const { Pool } = await import('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    const { rows } = await pool.query('SELECT interactions FROM tasks WHERE id = $1', [TASK_ID]);
    if (rows[0]) {
      console.log('\nDirect DB query - interactions count:', rows[0].interactions?.length || 0);
      if (rows[0].interactions && rows[0].interactions.length > 0) {
        console.log('First interaction:', rows[0].interactions[0]);
        console.log('Last interaction:', rows[0].interactions[rows[0].interactions.length - 1]);
      }
    }

    await pool.end();

  } catch (_error) {
    console.error('Error testing API:', error);
  }
}

testInteractionsAPI();