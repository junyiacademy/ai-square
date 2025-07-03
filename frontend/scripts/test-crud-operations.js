#!/usr/bin/env node
/**
 * Test CRUD operations on JSON data
 */

const http = require('http');

console.log('🧪 Testing CRUD Operations...\n');

const API_BASE = 'http://localhost:3000/api/admin/data';

async function runCrudTests() {
  const tests = [
    // 1. Read test
    {
      name: 'READ: Get domains data',
      method: 'GET',
      url: `${API_BASE}?type=rubrics&filename=ai_lit_domains`,
      validate: (res) => res.data && res.data.domains
    },
    
    // 2. Update test
    {
      name: 'UPDATE: Add new translation',
      method: 'PUT',
      body: {
        type: 'rubrics',
        filename: 'ai_lit_domains',
        updates: {
          domains: {
            Engaging_with_AI: {
              overview_test: 'This is a test update'
            }
          }
        },
        syncToYaml: false // Don't sync during test
      },
      validate: (res) => res.success === true
    },
    
    // 3. Create test
    {
      name: 'CREATE: Add new competency',
      method: 'POST',
      body: {
        type: 'rubrics',
        filename: 'ai_lit_domains',
        path: 'domains.Engaging_with_AI.competencies.E99',
        data: {
          description: 'Test competency',
          knowledge: ['K1.1'],
          skills: ['S1.1'],
          attitudes: ['A1.1']
        },
        syncToYaml: false
      },
      validate: (res) => res.success === true
    },
    
    // 4. Delete test
    {
      name: 'DELETE: Remove test competency',
      method: 'DELETE',
      body: {
        type: 'rubrics',
        filename: 'ai_lit_domains',
        path: 'domains.Engaging_with_AI.competencies.E99',
        syncToYaml: false
      },
      validate: (res) => res.success === true
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`📍 ${test.name}`);
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: test.url || '/api/admin/data',
        method: test.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      const result = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (res.statusCode >= 400) {
                reject(new Error(`HTTP ${res.statusCode}: ${json.error || 'Unknown error'}`));
              } else {
                resolve(json);
              }
            } catch (e) {
              reject(new Error(`Failed to parse response: ${e.message}`));
            }
          });
        });
        
        req.on('error', reject);
        
        if (test.body) {
          req.write(JSON.stringify(test.body));
        }
        
        req.end();
      });
      
      if (test.validate(result)) {
        console.log(`   ✅ Success\n`);
      } else {
        console.log(`   ❌ Failed - Invalid response\n`);
        console.log('   Response:', JSON.stringify(result, null, 2), '\n');
      }
      
    } catch (error) {
      console.log(`   ❌ Failed - ${error.message}\n`);
    }
  }
  
  console.log('🎉 CRUD tests complete!\n');
}

// Check if server is running
http.get('http://localhost:3000/api/relations', (res) => {
  if (res.statusCode === 200) {
    runCrudTests();
  }
}).on('error', () => {
  console.log('❌ Server is not running. Please start it with: npm run dev\n');
  process.exit(1);
});