/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Test cache fix for interactions
 * Usage: cd frontend && npm run dev
 * Then in another terminal: cd frontend && npx tsx src/scripts/test/test-cache-fix.ts
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3002';
const TEST_EMAIL = 'young@example.com';
const TEST_PASSWORD = 'password123';

async function testCacheFix() {
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI
    devtools: true
  });

  try {
    const page = await browser.newPage();
    
    // Login
    console.log('1. Logging in...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', TEST_EMAIL);
    await page.type('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    // Navigate to the specific task
    console.log('2. Navigating to task...');
    const taskUrl = `${BASE_URL}/pbl/scenarios/8fb1f265-cd53-4199-9d5c-c2ab2297621d/programs/0940a243-4df4-4f65-b497-bb59795809b1/tasks/9d641ff6-208d-4919-9fb1-c6de99904f67`;
    await page.goto(taskUrl);
    
    // Wait for chat interface to load
    await page.waitForSelector('textarea[placeholder*="Type your message"]', { timeout: 10000 });
    
    // Check initial interactions
    console.log('3. Checking initial interactions...');
    const initialInteractions = await page.$$eval('[class*="flex"][class*="justify-"]', elements => 
      elements.length
    );
    console.log(`Initial interaction count: ${initialInteractions}`);
    
    // Send a test message
    console.log('4. Sending test message...');
    const testMessage = `Test message at ${new Date().toLocaleTimeString()}`;
    await page.type('textarea[placeholder*="Type your message"]', testMessage);
    await page.keyboard.press('Enter');
    
    // Wait for AI response
    console.log('5. Waiting for AI response...');
    await page.waitForTimeout(5000); // Wait for AI to respond
    
    // Refresh the page
    console.log('6. Refreshing page...');
    await page.reload();
    await page.waitForSelector('textarea[placeholder*="Type your message"]', { timeout: 10000 });
    
    // Check interactions after refresh
    console.log('7. Checking interactions after refresh...');
    await page.waitForTimeout(2000); // Wait for interactions to load
    
    const afterRefreshInteractions = await page.$$eval('[class*="flex"][class*="justify-"]', elements => 
      elements.length
    );
    console.log(`Interactions after refresh: ${afterRefreshInteractions}`);
    
    // Check if our test message is visible
    const messageVisible = await page.evaluate((msg) => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.some(el => el.textContent?.includes(msg));
    }, testMessage);
    
    console.log(`Test message visible after refresh: ${messageVisible}`);
    
    if (messageVisible && afterRefreshInteractions > initialInteractions) {
      console.log('✅ Cache fix successful! Interactions persist after refresh.');
    } else {
      console.log('❌ Cache issue still exists. Interactions not persisting.');
    }
    
  } catch (_error) {
    console.error('Test failed:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('\nTest complete. Browser will remain open for inspection.');
    console.log('Press Ctrl+C to close.');
  }
}

testCacheFix();