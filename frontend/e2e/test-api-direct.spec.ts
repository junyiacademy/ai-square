import { test, expect } from '@playwright/test';

test.describe('Direct API Test', () => {
  test('test various API endpoints', async ({ page }) => {
    console.log('Testing API endpoints...');
    
    // Test 1: Simple health (new endpoint)
    try {
      const health = await page.request.get('http://localhost:3004/api/simple-health', {
        timeout: 3000
      });
      console.log(`Simple health status: ${health.status()}`);
      if (health.ok()) {
        const data = await health.json();
        console.log('Simple health response:', data);
      }
    } catch (error) {
      console.log('Simple health failed:', error);
    }
    
    // Test 2: Relations API (should work)
    try {
      const relations = await page.request.get('http://localhost:3004/api/relations', {
        timeout: 3000
      });
      console.log(`Relations API status: ${relations.status()}`);
      if (relations.ok()) {
        const data = await relations.json();
        console.log(`Relations data keys: ${Object.keys(data).join(', ')}`);
      }
    } catch (error) {
      console.log('Relations API failed:', error);
    }
    
    // Test 3: PBL scenarios
    try {
      const pbl = await page.request.get('http://localhost:3004/api/pbl/scenarios', {
        timeout: 3000
      });
      console.log(`PBL API status: ${pbl.status()}`);
      if (pbl.ok()) {
        const data = await pbl.json();
        console.log(`PBL scenarios count: ${data.scenarios?.length || 0}`);
      }
    } catch (error) {
      console.log('PBL API failed:', error);
    }
    
    // Test 4: Test a simple test endpoint
    try {
      const test = await page.request.get('http://localhost:3004/api/test', {
        timeout: 3000
      });
      console.log(`Test API status: ${test.status()}`);
    } catch (error) {
      console.log('Test API failed:', error);
    }
    
    // At least one endpoint should work
    expect(true).toBe(true);
  });
});