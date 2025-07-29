#!/usr/bin/env node
import 'dotenv/config';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { chromium, Browser, Page } from 'playwright';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface TestResult {
  category: string;
  test: string;
  status: 'pass' | 'fail';
  error?: string;
  screenshot?: string;
  duration: number;
}

const results: TestResult[] = [];

// Helper function to record test result
function recordResult(category: string, test: string, status: 'pass' | 'fail', error?: string, duration?: number) {
  results.push({
    category,
    test,
    status,
    error,
    duration: duration || 0
  });
  
  const icon = status === 'pass' ? '✅' : '❌';
  console.log(`  ${icon} ${test}${error ? `: ${error}` : ''}`);
}

// Create test data in database
async function setupTestData() {
  console.log('\n🔧 Setting up test data...');
  
  try {
    // Create test user (using mock auth, no password needed in DB)
    const userId = uuidv4();
    
    await pool.query(`
      INSERT INTO users (id, email, name, preferred_language, onboarding_completed)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET 
        name = $3,
        updated_at = NOW()
    `, [userId, 'test@example.com', 'Test User', 'en', true]);
    
    // Create scenarios for each mode
    const modes = ['pbl', 'assessment', 'discovery'];
    const scenarioIds: Record<string, string> = {};
    
    for (const mode of modes) {
      const scenarioId = uuidv4();
      scenarioIds[mode] = scenarioId;
      
      const modeData: any = {};
      if (mode === 'pbl') {
        modeData.pbl_data = {
          ksaMapping: { knowledge: ['K1'], skills: ['S1'], attitudes: ['A1'] },
          aiModules: { tutor: { enabled: true, model: 'gemini-2.5-flash' } }
        };
      } else if (mode === 'assessment') {
        modeData.assessment_data = {
          timeLimit: 60,
          passingScore: 70,
          totalQuestions: 10
        };
      } else {
        modeData.discovery_data = {
          careerPaths: ['AI Engineer'],
          industryFocus: 'Technology'
        };
      }
      
      await pool.query(`
        INSERT INTO scenarios (id, mode, status, source_type, title, description, objectives, task_templates, ${mode}_data)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          title = $5::jsonb,
          description = $6::jsonb,
          updated_at = NOW()
      `, [
        scenarioId,
        mode,
        'active',
        'yaml',
        JSON.stringify({ 
          en: `Test ${mode.toUpperCase()} Scenario`,
          zh: `測試 ${mode.toUpperCase()} 情境`
        }),
        JSON.stringify({ 
          en: `This is a test ${mode} scenario for browser testing`,
          zh: `這是用於瀏覽器測試的 ${mode} 情境`
        }),
        JSON.stringify({ en: ['Learn AI basics', 'Practice skills'] }),
        JSON.stringify([{
          id: uuidv4(),
          type: mode === 'assessment' ? 'question' : 'chat',
          title: { en: 'Introduction Task' },
          instructions: { en: 'Complete this introductory task' }
        }]),
        JSON.stringify(modeData[`${mode}_data`])
      ]);
    }
    
    console.log('  ✅ Test data created successfully');
    return { userId, scenarioIds };
    
  } catch (_error) {
    console.error('  ❌ Failed to create test data:', error);
    throw error;
  }
}

// Browser test scenarios
async function testBrowserScenarios(browser: Browser) {
  const page = await browser.newPage();
  const testData = await setupTestData();
  
  console.log('\n🌐 Starting browser tests...\n');
  
  // Test 1: Home page without login
  console.log('📍 Testing: Home page (not logged in)');
  try {
    await page.goto(BASE_URL);
    await page.waitForSelector('h1', { timeout: 10000 });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const title = await page.textContent('h1');
    recordResult('Browser', 'Home page loads', 'pass', undefined, 0);
    
    // Check if login button exists
    const loginButton = await page.locator('text=/登入|Login|Sign in/i').first();
    if (await loginButton.isVisible()) {
      recordResult('Browser', 'Login button visible', 'pass');
    } else {
      recordResult('Browser', 'Login button visible', 'fail', 'Login button not found');
    }
  } catch (_error) {
    recordResult('Browser', 'Home page loads', 'fail', error instanceof Error ? error.message : String(error));
    await page.screenshot({ path: 'test-screenshots/home-error.png' });
  }
  
  // Test 2: Navigate to protected pages without login
  console.log('\n📍 Testing: Protected pages redirect');
  const protectedPages = ['/pbl', '/assessment', '/discovery'];
  
  for (const path of protectedPages) {
    try {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState('networkidle');
      
      // Should redirect to login
      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
        recordResult('Browser', `${path} redirects to login`, 'pass');
      } else {
        // Check if there's a login prompt
        const needsLogin = await page.locator('text=/請登入|Please login|Sign in required/i').count() > 0;
        recordResult('Browser', `${path} requires login`, needsLogin ? 'pass' : 'fail', 
          needsLogin ? undefined : 'Page accessible without login');
      }
    } catch (_error) {
      recordResult('Browser', `${path} protection check`, 'fail', error instanceof Error ? error.message : String(error));
    }
  }
  
  // Test 3: Login flow
  console.log('\n📍 Testing: Login flow');
  try {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    
    // Fill login form (using mock user credentials)
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 10000 });
    
    recordResult('Browser', 'Login successful', 'pass');
    
    // Check if we're logged in
    await page.waitForTimeout(2000); // Wait for auth state to update
    const userMenu = await page.locator('[data-testid="user-menu"], [aria-label*="user"]').first();
    if (await userMenu.isVisible()) {
      recordResult('Browser', 'User menu visible after login', 'pass');
    } else {
      recordResult('Browser', 'User menu visible after login', 'fail', 'User menu not found');
    }
    
  } catch (_error) {
    recordResult('Browser', 'Login flow', 'fail', error instanceof Error ? error.message : String(error));
    await page.screenshot({ path: 'test-screenshots/login-error.png' });
  }
  
  // Test 4: Navigate to each module after login
  console.log('\n📍 Testing: Module pages (logged in)');
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [mode, scenarioId] of Object.entries(testData.scenarioIds)) {
    try {
      console.log(`\n  Testing ${mode.toUpperCase()} module...`);
      
      // Go to module list page
      await page.goto(`${BASE_URL}/${mode}`);
      await page.waitForLoadState('networkidle');
      
      // Check if scenarios are loaded
      const scenarios = await page.locator('[data-testid="scenario-card"], .scenario-card, article').count();
      if (scenarios > 0) {
        recordResult('Browser', `${mode} scenarios loaded`, 'pass', `Found ${scenarios} scenarios`);
        
        // Click on first scenario
        await page.locator('[data-testid="scenario-card"], .scenario-card, article').first().click();
        await page.waitForLoadState('networkidle');
        
        // Check if we're on scenario detail page
        const url = page.url();
        if (url.includes(`/${mode}/scenarios/`) || url.includes('/program/')) {
          recordResult('Browser', `${mode} scenario detail page`, 'pass');
          
          // Try to start/view the scenario
          const startButton = await page.locator('button:has-text(/開始|Start|Begin|View/i)').first();
          if (await startButton.isVisible()) {
            await startButton.click();
            await page.waitForTimeout(2000);
            recordResult('Browser', `${mode} scenario interaction`, 'pass');
          }
        } else {
          recordResult('Browser', `${mode} scenario navigation`, 'fail', 'Not on scenario detail page');
        }
      } else {
        recordResult('Browser', `${mode} scenarios loaded`, 'fail', 'No scenarios found');
      }
      
    } catch (_error) {
      recordResult('Browser', `${mode} module test`, 'fail', error instanceof Error ? error.message : String(error));
      await page.screenshot({ path: `test-screenshots/${mode}-error.png` });
    }
  }
  
  // Test 5: Language switching
  console.log('\n📍 Testing: Language switching');
  try {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Find language selector
    const langSelector = await page.locator('[data-testid="language-selector"], [aria-label*="language"], button').first();
    if (await langSelector.isVisible()) {
      await langSelector.click();
      await page.waitForTimeout(500);
      
      // Try to switch to Chinese
      const zhOption = await page.locator('text=/中文|Chinese|繁體/i').first();
      if (await zhOption.isVisible()) {
        await zhOption.click();
        await page.waitForTimeout(1000);
        
        // Check if language changed
        const pageText = await page.textContent('body');
        if (pageText?.includes('首頁') || pageText?.includes('評估') || pageText?.includes('探索')) {
          recordResult('Browser', 'Language switch to Chinese', 'pass');
        } else {
          recordResult('Browser', 'Language switch to Chinese', 'fail', 'Chinese text not found');
        }
      } else {
        recordResult('Browser', 'Language options visible', 'fail', 'Chinese option not found');
      }
    } else {
      recordResult('Browser', 'Language selector found', 'fail', 'Language selector not visible');
    }
  } catch (_error) {
    recordResult('Browser', 'Language switching', 'fail', error instanceof Error ? error.message : String(error));
  }
  
  // Test 6: Logout flow
  console.log('\n📍 Testing: Logout flow');
  try {
    // Find user menu or logout button
    const userMenu = await page.locator('[data-testid="user-menu"], [aria-label*="user"], button').first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.waitForTimeout(500);
      
      // Click logout
      const logoutButton = await page.locator('text=/登出|Logout|Sign out/i').first();
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForTimeout(2000);
        
        // Check if logged out
        await page.goto(BASE_URL);
        const loginButton = await page.locator('text=/登入|Login|Sign in/i').first();
        if (await loginButton.isVisible()) {
          recordResult('Browser', 'Logout successful', 'pass');
        } else {
          recordResult('Browser', 'Logout successful', 'fail', 'Still appears to be logged in');
        }
      } else {
        recordResult('Browser', 'Logout button found', 'fail', 'Logout button not visible');
      }
    } else {
      recordResult('Browser', 'User menu for logout', 'fail', 'User menu not found');
    }
  } catch (_error) {
    recordResult('Browser', 'Logout flow', 'fail', error instanceof Error ? error.message : String(error));
  }
  
  // Test 7: Access protected pages after logout
  console.log('\n📍 Testing: Protected pages after logout');
  try {
    await page.goto(`${BASE_URL}/pbl`);
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      recordResult('Browser', 'Protected pages blocked after logout', 'pass');
    } else {
      const needsLogin = await page.locator('text=/請登入|Please login|Sign in required/i').count() > 0;
      recordResult('Browser', 'Protected pages after logout', needsLogin ? 'pass' : 'fail',
        needsLogin ? undefined : 'Page still accessible after logout');
    }
  } catch (_error) {
    recordResult('Browser', 'Post-logout protection', 'fail', error instanceof Error ? error.message : String(error));
  }
  
  await page.close();
}

// Generate report
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 BROWSER TEST REPORT');
  console.log('='.repeat(80));
  console.log(`Test Date: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Base URL: ${BASE_URL}`);
  
  const totalTests = results.length;
  const totalPassed = results.filter(r => r.status === 'pass').length;
  const totalFailed = results.filter(r => r.status === 'fail').length;
  const successRate = ((totalPassed / totalTests) * 100).toFixed(1);
  
  console.log('\n📈 Summary:');
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  Passed: ${totalPassed}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`  Success Rate: ${successRate}%`);
  
  if (totalFailed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => console.log(`  - ${r.test}: ${r.error}`));
  }
  
  console.log('\n' + '='.repeat(80));
}

// Main execution
async function main() {
  console.log('🚀 Starting Comprehensive Browser Tests');
  console.log('This will test real browser interactions including login/logout\n');
  
  let browser: Browser | null = null;
  
  try {
    // Launch browser
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      slowMo: 50 // Slow down for visibility
    });
    
    // Create screenshots directory
    const fs = await import('fs/promises');
    await fs.mkdir('test-screenshots', { recursive: true });
    
    // Run tests
    await testBrowserScenarios(browser);
    
    // Generate report
    generateReport();
    
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    await pool.query(`DELETE FROM users WHERE email = 'test@example.com'`);
    
    const totalFailed = results.filter(r => r.status === 'fail').length;
    process.exit(totalFailed === 0 ? 0 : 1);
    
  } catch (_error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    await pool.end();
  }
}

// Run tests
main().catch(console.error);