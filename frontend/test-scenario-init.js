#!/usr/bin/env node

/**
 * Test script to verify scenario initialization fixes
 * This tests the API endpoints locally to ensure array handling works
 */

const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

async function testScenarioInit() {
  console.log('Testing scenario initialization fixes...\n');

  const endpoints = [
    { name: 'PBL', path: '/api/admin/init-pbl' },
    { name: 'Discovery', path: '/api/admin/init-discovery' },
    { name: 'Assessment', path: '/api/admin/init-assessment' }
  ];

  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint.name} initialization...`);
    
    try {
      // Test with force=true to ensure clean initialization
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: true })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${endpoint.name}: ${result.message}`);
        console.log(`   Summary: ${result.summary}\n`);
      } else {
        console.log(`❌ ${endpoint.name}: ${result.error}`);
        if (result.details) {
          console.log(`   Details: ${result.details}\n`);
        }
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: Network error - ${error.message}\n`);
    }
  }
}

testScenarioInit().catch(console.error);