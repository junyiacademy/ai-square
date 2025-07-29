/* eslint-disable @typescript-eslint/no-unused-vars */
#!/usr/bin/env node
import 'dotenv/config';
import { chromium, Browser } from 'playwright';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface DetailedTestResult {
  action: string;
  expected: string;
  actual: string;
  status: 'pass' | 'fail';
  screenshot?: string;
  error?: string;
  duration: number;
}

const results: DetailedTestResult[] = [];

// Helper function to record detailed result
function recordDetailedResult(
  action: string,
  expected: string,
  actual: string,
  status: 'pass' | 'fail',
  error?: string,
  duration?: number
) {
  results.push({
    action,
    expected,
    actual,
    status,
    error,
    duration: duration || 0
  });
  
  const icon = status === 'pass' ? '✅' : '❌';
  console.log(`${icon} ${action}`);
  console.log(`   期望: ${expected}`);
  console.log(`   實際: ${actual}`);
  if (error) {
    console.log(`   錯誤: ${error}`);
  }
  console.log('');
}

// Setup comprehensive test data
async function setupDetailedTestData() {
  console.log('\n🔧 設置詳細測試資料...\n');
  
  try {
    // 1. Create test users
    console.log('1️⃣ 創建測試用戶...');
    const users = [
      { email: 'test@example.com', name: 'Test User' },
      { email: 'student@example.com', name: 'Student User' },
      { email: 'teacher@example.com', name: 'Teacher User' }
    ];
    
    for (const user of users) {
      await pool.query(`
        INSERT INTO users (id, email, name, preferred_language, onboarding_completed)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET 
          name = $3,
          updated_at = NOW()
      `, [uuidv4(), user.email, user.name, 'en', true]);
    }
    console.log('   ✅ 創建了 3 個測試用戶\n');
    
    // 2. Create scenarios for each mode with proper data
    console.log('2️⃣ 創建各模式的測試情境...');
    const modes = ['pbl', 'assessment', 'discovery'];
    const createdScenarios: Record<string, Array<Record<string, unknown>>> = { pbl: [], assessment: [], discovery: [] };
    
    for (const mode of modes) {
      console.log(`   創建 ${mode.toUpperCase()} 情境...`);
      
      // Create 3 scenarios per mode
      for (let i = 1; i <= 3; i++) {
        const scenarioId = uuidv4();
        
        // Mode-specific data
        const modeData: Record<string, unknown> = {};
        if (mode === 'pbl') {
          modeData.pbl_data = {
            ksaMapping: {
              knowledge: ['K1', 'K2', 'K3'],
              skills: ['S1', 'S2'],
              attitudes: ['A1']
            },
            aiModules: {
              tutor: { enabled: true, model: 'gemini-2.5-flash' },
              evaluator: { enabled: true, model: 'gemini-2.5-flash' }
            },
            targetDomains: ['engaging_with_ai', 'understanding_ai']
          };
        } else if (mode === 'assessment') {
          modeData.assessment_data = {
            timeLimit: 60,
            passingScore: 70,
            totalQuestions: 10,
            questionBank: []
          };
        } else {
          modeData.discovery_data = {
            careerPaths: ['AI Engineer', 'Data Scientist', 'ML Researcher'],
            industryFocus: 'Technology',
            skillRequirements: ['Python', 'Machine Learning', 'Statistics']
          };
        }
        
        // Create scenario
        await pool.query(`
          INSERT INTO scenarios (
            id, mode, status, source_type, 
            title, description, objectives,
            difficulty, estimated_minutes,
            task_templates, ${mode}_data, metadata
          )
          VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb)
        `, [
          scenarioId,
          mode,
          'active',
          'yaml', // source_type
          JSON.stringify({ 
            en: `${mode.toUpperCase()} Scenario ${i}`,
            zh: `${mode.toUpperCase()} 情境 ${i}`
          }),
          JSON.stringify({ 
            en: `This is test scenario ${i} for ${mode} mode`,
            zh: `這是 ${mode} 模式的測試情境 ${i}`
          }),
          JSON.stringify({ 
            en: ['Learn AI basics', 'Practice skills', 'Apply knowledge'],
            zh: ['學習 AI 基礎', '練習技能', '應用知識']
          }),
          i === 1 ? 'beginner' : i === 2 ? 'intermediate' : 'advanced',
          30 + (i * 15), // 30, 45, 60 minutes
          JSON.stringify([
            {
              id: uuidv4(),
              type: mode === 'assessment' ? 'question' : 'chat',
              title: { en: `Task ${i}.1`, zh: `任務 ${i}.1` },
              instructions: { en: 'Complete this task', zh: '完成此任務' }
            },
            {
              id: uuidv4(),
              type: mode === 'assessment' ? 'question' : 'creation',
              title: { en: `Task ${i}.2`, zh: `任務 ${i}.2` },
              instructions: { en: 'Create something', zh: '創建一些東西' }
            }
          ]),
          JSON.stringify(modeData[`${mode}_data`]),
          JSON.stringify({
            yamlId: `test-${mode}-${i}`,
            thumbnailEmoji: mode === 'pbl' ? '📚' : mode === 'assessment' ? '📝' : '🔍'
          })
        ]);
        
        createdScenarios[mode].push({
          id: scenarioId,
          title: `${mode.toUpperCase()} Scenario ${i}`
        });
      }
      console.log(`   ✅ 創建了 3 個 ${mode.toUpperCase()} 情境\n`);
    }
    
    // 3. Create programs for test user
    console.log('3️⃣ 為測試用戶創建學習進度...');
    const testUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['test@example.com']
    );
    const testUserId = testUser.rows[0].id;
    
    // Create one active program per mode
    for (const mode of modes) {
      const scenario = createdScenarios[mode][0];
      const programId = uuidv4();
      
      await pool.query(`
        INSERT INTO programs (
          id, scenario_id, user_id, status,
          total_score, time_spent_seconds, total_task_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        programId,
        scenario.id,
        testUserId,
        'active',
        0,
        0,
        2 // 2 tasks per scenario
      ]);
      
      console.log(`   ✅ 創建了 ${mode} 的學習進度`);
    }
    
    console.log('\n✅ 所有測試資料創建完成\n');
    return { testUserId, createdScenarios };
    
  } catch (_error) {
    console.error('❌ 創建測試資料失敗:', error);
    throw error;
  }
}

// Detailed browser tests
async function runDetailedTests(browser: Browser, _testData: Record<string, unknown>) {
  const page = await browser.newPage();
  console.log('\n🌐 開始詳細的瀏覽器測試...\n');
  
  // Test 1: Homepage without login
  console.log('📍 測試 1: 未登入首頁\n');
  const start1 = Date.now();
  try {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Check for login button
    const loginButton = await page.locator('a[href="/login"], button:has-text("Login"), button:has-text("登入")').first();
    const loginVisible = await loginButton.isVisible();
    
    recordDetailedResult(
      '訪問首頁',
      '顯示登入按鈕',
      loginVisible ? '找到登入按鈕' : '未找到登入按鈕',
      loginVisible ? 'pass' : 'fail',
      undefined,
      Date.now() - start1
    );
    
    await page.screenshot({ path: 'test-screenshots/1-homepage.png' });
  } catch (_error) {
    recordDetailedResult(
      '訪問首頁',
      '頁面正常載入',
      '頁面載入失敗',
      'fail',
      error instanceof Error ? error.message : String(error)
    );
  }
  
  // Test 2: Login process
  console.log('📍 測試 2: 登入流程\n');
  const start2 = Date.now();
  try {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('input[type="email"], input[name="email"]');
    
    // Fill login form
    await page.fill('input[type="email"], input[name="email"]', 'teacher@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'teacher123');
    
    // Submit
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 10000 });
    
    recordDetailedResult(
      '登入流程',
      '成功登入並跳轉',
      '登入成功',
      'pass',
      undefined,
      Date.now() - start2
    );
    
    // Wait for page to stabilize
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/2-after-login.png' });
    
  } catch (_error) {
    recordDetailedResult(
      '登入流程',
      '成功登入',
      '登入失敗',
      'fail',
      error instanceof Error ? error.message : String(error)
    );
  }
  
  // Test 3: Check user menu
  console.log('📍 測試 3: 用戶選單\n');
  const start3 = Date.now();
  try {
    // Look for user avatar button (the "T" button)
    const userAvatar = await page.locator('button:has-text("T"), button[class*="rounded-full"]').first();
    const avatarVisible = await userAvatar.isVisible();
    
    recordDetailedResult(
      '查找用戶頭像',
      '右上角顯示用戶頭像按鈕',
      avatarVisible ? '找到頭像按鈕 "T"' : '未找到頭像按鈕',
      avatarVisible ? 'pass' : 'fail',
      undefined,
      Date.now() - start3
    );
    
    if (avatarVisible) {
      // Click to open menu
      await userAvatar.click();
      await page.waitForTimeout(500);
      
      // Check menu contents
      const userName = await page.locator('text="Teacher User"').isVisible();
      const userEmail = await page.locator('text="teacher@example.com"').isVisible();
      const signOutButton = await page.locator('text="Sign out"').isVisible();
      
      recordDetailedResult(
        '用戶選單內容',
        '顯示用戶名、郵箱、登出按鈕',
        `用戶名: ${userName}, 郵箱: ${userEmail}, 登出: ${signOutButton}`,
        userName && userEmail && signOutButton ? 'pass' : 'fail'
      );
      
      await page.screenshot({ path: 'test-screenshots/3-user-menu-open.png' });
      
      // Close menu by clicking outside
      await page.click('body', { position: { x: 10, y: 10 } });
      await page.waitForTimeout(500);
    }
  } catch (_error) {
    recordDetailedResult(
      '用戶選單測試',
      '正常顯示用戶資訊',
      '測試失敗',
      'fail',
      error instanceof Error ? error.message : String(error)
    );
  }
  
  // Test 4: Navigate to PBL
  console.log('📍 測試 4: PBL 模組\n');
  const start4 = Date.now();
  try {
    await page.goto(`${BASE_URL}/pbl`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for data to load
    
    // Check if scenarios are displayed
    const scenarioCards = await page.locator('article, [class*="card"], [class*="hover:shadow"]').count();
    
    recordDetailedResult(
      'PBL 頁面 scenarios',
      '顯示 3 個 PBL scenarios',
      `找到 ${scenarioCards} 個 scenario 卡片`,
      scenarioCards > 0 ? 'pass' : 'fail',
      undefined,
      Date.now() - start4
    );
    
    await page.screenshot({ path: 'test-screenshots/4-pbl-page.png' });
    
    if (scenarioCards > 0) {
      // Click first scenario
      const firstScenario = await page.locator('article, [class*="card"]').first();
      await firstScenario.click();
      await page.waitForLoadState('networkidle');
      
      // Check scenario detail page
      const url = page.url();
      const onDetailPage = url.includes('/scenarios/');
      
      recordDetailedResult(
        '點擊 PBL scenario',
        '進入 scenario 詳情頁',
        onDetailPage ? `進入詳情頁: ${url}` : '未能進入詳情頁',
        onDetailPage ? 'pass' : 'fail'
      );
      
      await page.screenshot({ path: 'test-screenshots/5-pbl-detail.png' });
    }
    
  } catch (_error) {
    recordDetailedResult(
      'PBL 模組測試',
      '正常顯示並可互動',
      '測試失敗',
      'fail',
      error instanceof Error ? error.message : String(error)
    );
  }
  
  // Test 5: Assessment module
  console.log('📍 測試 5: Assessment 模組\n');
  const start5 = Date.now();
  try {
    await page.goto(`${BASE_URL}/assessment`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const assessmentCards = await page.locator('article, [class*="card"], [class*="hover:shadow"]').count();
    
    recordDetailedResult(
      'Assessment 頁面',
      '顯示 3 個 assessment scenarios',
      `找到 ${assessmentCards} 個 scenario 卡片`,
      assessmentCards > 0 ? 'pass' : 'fail',
      undefined,
      Date.now() - start5
    );
    
    await page.screenshot({ path: 'test-screenshots/6-assessment-page.png' });
    
  } catch (_error) {
    recordDetailedResult(
      'Assessment 模組測試',
      '正常顯示',
      '測試失敗',
      'fail',
      error instanceof Error ? error.message : String(error)
    );
  }
  
  // Test 6: Discovery module
  console.log('📍 測試 6: Discovery 模組\n');
  const start6 = Date.now();
  try {
    await page.goto(`${BASE_URL}/discovery`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const discoveryCards = await page.locator('article, [class*="card"], [class*="hover:shadow"]').count();
    
    recordDetailedResult(
      'Discovery 頁面',
      '顯示 3 個 discovery scenarios',
      `找到 ${discoveryCards} 個 scenario 卡片`,
      discoveryCards > 0 ? 'pass' : 'fail',
      undefined,
      Date.now() - start6
    );
    
    await page.screenshot({ path: 'test-screenshots/7-discovery-page.png' });
    
  } catch (_error) {
    recordDetailedResult(
      'Discovery 模組測試',
      '正常顯示',
      '測試失敗',
      'fail',
      error instanceof Error ? error.message : String(error)
    );
  }
  
  // Test 7: Language switching
  console.log('📍 測試 7: 語言切換\n');
  const start7 = Date.now();
  try {
    await page.goto(BASE_URL);
    
    // Look for language selector (might be in header)
    const langSelectors = [
      'button:has-text("EN")',
      'button:has-text("中文")',
      '[aria-label*="language"]',
      'button[class*="language"]'
    ];
    
    let langButton = null;
    for (const selector of langSelectors) {
      const element = await page.locator(selector).first();
      if (await element.isVisible()) {
        langButton = element;
        break;
      }
    }
    
    if (langButton) {
      await langButton.click();
      await page.waitForTimeout(500);
      
      // Try to switch to Chinese
      const zhOption = await page.locator('text=/中文|繁體|Chinese/').first();
      if (await zhOption.isVisible()) {
        await zhOption.click();
        await page.waitForTimeout(1000);
        
        // Check if language changed
        const pageText = await page.textContent('body');
        const hasChineseText = pageText?.includes('首頁') || pageText?.includes('探索') || pageText?.includes('評估');
        
        recordDetailedResult(
          '語言切換',
          '切換到中文介面',
          hasChineseText ? '成功切換到中文' : '未能切換語言',
          hasChineseText ? 'pass' : 'fail',
          undefined,
          Date.now() - start7
        );
      } else {
        recordDetailedResult(
          '語言選項',
          '顯示語言選項',
          '未找到語言選項',
          'fail'
        );
      }
    } else {
      recordDetailedResult(
        '語言選擇器',
        '找到語言切換按鈕',
        '未找到語言選擇器',
        'fail'
      );
    }
    
    await page.screenshot({ path: 'test-screenshots/8-language-switch.png' });
    
  } catch (_error) {
    recordDetailedResult(
      '語言切換測試',
      '可切換語言',
      '測試失敗',
      'fail',
      error instanceof Error ? error.message : String(error)
    );
  }
  
  // Test 8: Logout
  console.log('📍 測試 8: 登出功能\n');
  const start8 = Date.now();
  try {
    // Open user menu
    const userAvatar = await page.locator('button:has-text("T"), button[class*="rounded-full"]').first();
    await userAvatar.click();
    await page.waitForTimeout(500);
    
    // Click sign out
    const signOutButton = await page.locator('text="Sign out"');
    await signOutButton.click();
    await page.waitForTimeout(2000);
    
    // Check if logged out
    const loginButton = await page.locator('a[href="/login"], button:has-text("Login")').first();
    const isLoggedOut = await loginButton.isVisible();
    
    recordDetailedResult(
      '登出功能',
      '成功登出並顯示登入按鈕',
      isLoggedOut ? '成功登出' : '登出失敗',
      isLoggedOut ? 'pass' : 'fail',
      undefined,
      Date.now() - start8
    );
    
    await page.screenshot({ path: 'test-screenshots/9-after-logout.png' });
    
  } catch (_error) {
    recordDetailedResult(
      '登出測試',
      '正常登出',
      '測試失敗',
      'fail',
      error instanceof Error ? error.message : String(error)
    );
  }
  
  // Test 9: Protected routes after logout
  console.log('📍 測試 9: 登出後的路由保護\n');
  const start9 = Date.now();
  try {
    await page.goto(`${BASE_URL}/pbl`);
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    const isProtected = currentUrl.includes('/login') || currentUrl.includes('/auth');
    
    recordDetailedResult(
      '登出後訪問保護頁面',
      '應該重定向到登入頁',
      isProtected ? '已重定向到登入頁' : `仍可訪問: ${currentUrl}`,
      isProtected ? 'pass' : 'fail',
      undefined,
      Date.now() - start9
    );
    
  } catch (_error) {
    recordDetailedResult(
      '路由保護測試',
      '未登入不能訪問',
      '測試失敗',
      'fail',
      error instanceof Error ? error.message : String(error)
    );
  }
  
  await page.close();
}

// Generate detailed report
function generateDetailedReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 詳細測試報告');
  console.log('='.repeat(80));
  console.log(`測試時間: ${new Date().toLocaleString('zh-TW')}`);
  console.log(`測試環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`測試網址: ${BASE_URL}`);
  
  const totalTests = results.length;
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const successRate = ((passed / totalTests) * 100).toFixed(1);
  
  console.log('\n📈 測試統計:');
  console.log(`  總測試數: ${totalTests}`);
  console.log(`  通過: ${passed}`);
  console.log(`  失敗: ${failed}`);
  console.log(`  成功率: ${successRate}%`);
  
  if (failed > 0) {
    console.log('\n❌ 失敗的測試:');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => {
        console.log(`\n  操作: ${r.action}`);
        console.log(`  期望: ${r.expected}`);
        console.log(`  實際: ${r.actual}`);
        if (r.error) {
          console.log(`  錯誤: ${r.error}`);
        }
      });
  }
  
  console.log('\n💡 測試發現:');
  
  // Check specific issues
  const scenarioTests = results.filter(r => r.action.includes('scenarios'));
  const hasScenarioIssue = scenarioTests.some(r => r.actual.includes('0 個'));
  
  if (hasScenarioIssue) {
    console.log('  ⚠️  Scenarios 顯示問題 - DB 有資料但前端顯示為空');
  }
  
  const authTests = results.filter(r => r.action.includes('保護'));
  const hasAuthIssue = authTests.some(r => r.status === 'fail');
  
  if (hasAuthIssue) {
    console.log('  ⚠️  認證保護問題 - 未登入可以訪問保護頁面');
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Save detailed report
  const { promises: fs } = await import('fs');
  await fs.writeFile(
    'test-results/detailed-test-report.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      baseUrl: BASE_URL,
      summary: {
        total: totalTests,
        passed,
        failed,
        successRate
      },
      results
    }, null, 2)
  );
  
  console.log('\n📄 詳細報告已保存到: test-results/detailed-test-report.json');
}

// Main execution
async function main() {
  console.log('🚀 開始詳細的 DB-driven 架構測試');
  console.log('測試每個具體操作，確保 YAML 到 DB 轉換後功能正常\n');
  
  let browser: Browser | null = null;
  
  try {
    // Setup test data
    const testData = await setupDetailedTestData();
    
    // Launch browser
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      slowMo: 100 // Slower for better visibility
    });
    
    // Create screenshots directory
    const { existsSync, mkdirSync } = await import('fs');
    if (!existsSync('test-screenshots')) {
      mkdirSync('test-screenshots');
    }
    
    // Run detailed tests
    await runDetailedTests(browser, testData);
    
    // Generate report
    generateDetailedReport();
    
    // Cleanup
    console.log('\n🧹 清理測試資料...');
    await pool.query(`
      DELETE FROM users 
      WHERE email IN ('test@example.com', 'student@example.com', 'teacher@example.com')
    `);
    
    const failedCount = results.filter(r => r.status === 'fail').length;
    process.exit(failedCount === 0 ? 0 : 1);
    
  } catch (_error) {
    console.error('\n❌ 測試失敗:', error);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    await pool.end();
  }
}

// Run tests
main().catch(console.error);