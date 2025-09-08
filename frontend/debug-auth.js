#!/usr/bin/env node

const fs = require('fs');

// Read cookies from cookies3.txt (the latest one)
const cookieFile = fs.readFileSync('cookies3.txt', 'utf8');
const lines = cookieFile.split('\n');
let sessionToken = null;

for (const line of lines) {
  if (line.includes('sessionToken')) {
    const parts = line.split('\t');
    if (parts.length >= 7) {
      sessionToken = parts[6].trim();
      break;
    }
  }
}

if (sessionToken) {
  console.log('Found sessionToken in cookies3.txt:', sessionToken);
  console.log('Token length:', sessionToken.length);
  console.log('Is valid hex format:', /^[a-f0-9]{64}$/i.test(sessionToken));
} else {
  console.log('No sessionToken found in cookies3.txt');
}

// Test API with cookie
if (sessionToken) {
  const fetch = require('node-fetch');
  
  async function testAuth() {
    // Test auth check
    console.log('\n=== Testing /api/auth/check ===');
    const authResponse = await fetch('http://localhost:3000/api/auth/check', {
      headers: {
        'Cookie': `sessionToken=${sessionToken}`
      }
    });
    const authData = await authResponse.json();
    console.log('Status:', authResponse.status);
    console.log('Response:', authData);
    
    // Test PBL programs API
    console.log('\n=== Testing /api/pbl/scenarios/.../programs ===');
    const programsResponse = await fetch('http://localhost:3000/api/pbl/scenarios/d40d08e3-ceda-4ff2-8c68-de535331688b/programs', {
      headers: {
        'Cookie': `sessionToken=${sessionToken}`
      }
    });
    const programsData = await programsResponse.json();
    console.log('Status:', programsResponse.status);
    console.log('Response:', programsData);
  }
  
  testAuth().catch(console.error);
}