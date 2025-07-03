#!/usr/bin/env node
/**
 * Test script to verify JSON integration
 */

const { spawn } = require('child_process');
const http = require('http');

console.log('🧪 Testing JSON Integration...\n');

// Start Next.js dev server
console.log('Starting Next.js development server...');
const nextProcess = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'pipe',
  env: { ...process.env, PORT: '3001' }
});

// Wait for server to be ready
let serverReady = false;
nextProcess.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Ready in') && !serverReady) {
    serverReady = true;
    runTests();
  }
});

nextProcess.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

async function runTests() {
  console.log('\n✅ Server is ready! Running tests...\n');
  
  const tests = [
    {
      name: 'Test Relations API (English)',
      url: 'http://localhost:3001/api/relations?lang=en',
      validate: (data) => {
        return data.domains && data.domains.length > 0 && data.domains[0].id;
      }
    },
    {
      name: 'Test Relations API (Chinese)',
      url: 'http://localhost:3001/api/relations?lang=zhTW',
      validate: (data) => {
        return data.domains && data.domains.length > 0 && data.domains[0].overview;
      }
    },
    {
      name: 'Test Admin Data API - Read',
      url: 'http://localhost:3001/api/admin/data?type=rubrics&filename=ai_lit_domains',
      validate: (data) => {
        return data.data && data.data.domains;
      }
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`📍 ${test.name}`);
      const data = await fetchJSON(test.url);
      
      if (test.validate(data)) {
        console.log(`   ✅ Success\n`);
      } else {
        console.log(`   ❌ Failed - Invalid response structure\n`);
        console.log('   Response:', JSON.stringify(data, null, 2).substring(0, 200) + '...\n');
      }
    } catch (error) {
      console.log(`   ❌ Failed - ${error.message}\n`);
    }
  }
  
  // Test file system
  console.log('📁 Checking JSON files...');
  const fs = require('fs');
  const path = require('path');
  
  const jsonFiles = [
    'public/rubrics_data_json/ai_lit_domains.json',
    'public/rubrics_data_json/ksa_codes.json',
    'public/pbl_data_json/ai_job_search_scenario.json'
  ];
  
  for (const file of jsonFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`   ✅ ${path.basename(file)} (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`   ❌ ${path.basename(file)} - Not found`);
    }
  }
  
  console.log('\n🎉 Test complete!\n');
  
  // Cleanup
  nextProcess.kill();
  process.exit(0);
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\nStopping server...');
  nextProcess.kill();
  process.exit(0);
});