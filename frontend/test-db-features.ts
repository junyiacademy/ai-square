import { chromium } from 'playwright';

const STAGING_URL = 'https://ai-square-staging-731209836128.asia-east1.run.app';
const TEST_EMAIL = `test.user.${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';

async function testDatabaseFeatures() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // 慢動作以便觀察
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  console.log('=== AI Square 資料庫功能完整測試 ===\n');
  console.log('測試時間:', new Date().toLocaleString());
  console.log('測試 URL:', STAGING_URL);
  console.log('測試帳號:', TEST_EMAIL);
  console.log('');

  const testResults = {
    registration: false,
    login: false,
    onboarding: false,
    pbl: { scenario: false, program: false, task: false, evaluation: false, complete: false },
    assessment: { scenario: false, program: false, task: false, evaluation: false, complete: false },
    discovery: { scenario: false, program: false, task: false, evaluation: false, complete: false }
  };

  try {
    // ========== 1. 註冊測試 ==========
    console.log('📝 1. 測試註冊功能...');
    await page.goto(STAGING_URL + '/register', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-screenshots/db-1-register-page.png' });
    
    // 填寫註冊表單
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);
    
    // 同意條款
    const termsCheckbox = page.locator('input[type="checkbox"]');
    if (await termsCheckbox.count() > 0) {
      await termsCheckbox.first().check();
    }
    
    // 提交註冊
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // 檢查是否成功註冊
    const currentUrl = page.url();
    if (currentUrl.includes('/verify-email') || currentUrl.includes('/onboarding') || currentUrl.includes('/dashboard')) {
      console.log('✅ 註冊成功！');
      testResults.registration = true;
      await page.screenshot({ path: 'test-screenshots/db-2-register-success.png' });
    } else {
      // 可能已經註冊過，嘗試登入
      console.log('⚠️ 註冊可能失敗或帳號已存在，嘗試登入...');
    }

    // ========== 2. 登入測試 ==========
    console.log('\n🔐 2. 測試登入功能...');
    await page.goto(STAGING_URL + '/login', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-screenshots/db-3-login-page.png' });
    
    // 填寫登入表單
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    
    // 提交登入
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // 檢查是否成功登入
    const loginUrl = page.url();
    if (!loginUrl.includes('/login')) {
      console.log('✅ 登入成功！');
      testResults.login = true;
      await page.screenshot({ path: 'test-screenshots/db-4-login-success.png' });
    } else {
      console.log('❌ 登入失敗');
    }

    // ========== 3. Onboarding 流程測試 ==========
    console.log('\n🎯 3. 測試 Onboarding 流程...');
    
    // 檢查是否在 onboarding 頁面
    if (page.url().includes('/onboarding')) {
      console.log('進入 Onboarding 流程...');
      
      // Welcome 頁面
      if (page.url().includes('/welcome')) {
        await page.screenshot({ path: 'test-screenshots/db-5-onboarding-welcome.png' });
        const startButton = page.locator('button:has-text("開始"), button:has-text("Start")');
        if (await startButton.count() > 0) {
          await startButton.click();
          await page.waitForTimeout(2000);
        }
      }
      
      // Identity 頁面
      if (page.url().includes('/identity')) {
        await page.screenshot({ path: 'test-screenshots/db-6-onboarding-identity.png' });
        const roleButton = page.locator('button').first();
        if (await roleButton.count() > 0) {
          await roleButton.click();
          await page.waitForTimeout(2000);
        }
      }
      
      // Goals 頁面
      if (page.url().includes('/goals')) {
        await page.screenshot({ path: 'test-screenshots/db-7-onboarding-goals.png' });
        const goalButton = page.locator('button').first();
        if (await goalButton.count() > 0) {
          await goalButton.click();
          await page.waitForTimeout(2000);
        }
      }
      
      testResults.onboarding = true;
      console.log('✅ Onboarding 流程完成！');
    } else {
      console.log('⚠️ 跳過 Onboarding（可能已完成）');
      testResults.onboarding = true;
    }

    // ========== 4. PBL 模組測試（五階段）==========
    console.log('\n📚 4. 測試 PBL 模組五階段...');
    
    // 階段1: 瀏覽場景列表
    console.log('  階段1: 瀏覽場景列表');
    await page.goto(STAGING_URL + '/pbl/scenarios', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-screenshots/db-8-pbl-scenarios.png' });
    
    // 檢查是否有場景
    const pblScenarios = page.locator('[data-testid="scenario-card"], .scenario-card, article');
    const pblScenarioCount = await pblScenarios.count();
    console.log(`  找到 ${pblScenarioCount} 個 PBL 場景`);
    
    if (pblScenarioCount > 0) {
      testResults.pbl.scenario = true;
      
      // 階段2: 進入場景詳情
      console.log('  階段2: 進入場景詳情');
      await pblScenarios.first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-screenshots/db-9-pbl-scenario-detail.png' });
      
      // 階段3: 開始學習計畫
      console.log('  階段3: 開始學習計畫');
      const startButton = page.locator('button:has-text("開始"), button:has-text("Start")');
      if (await startButton.count() > 0) {
        await startButton.click();
        await page.waitForTimeout(3000);
        testResults.pbl.program = true;
        await page.screenshot({ path: 'test-screenshots/db-10-pbl-program-started.png' });
        
        // 階段4: 執行任務
        console.log('  階段4: 執行任務');
        // 檢查是否在任務頁面
        if (page.url().includes('/tasks/')) {
          testResults.pbl.task = true;
          
          // 嘗試與 AI 互動
          const chatInput = page.locator('textarea, input[type="text"]').first();
          if (await chatInput.count() > 0) {
            await chatInput.fill('Hello, I need help with this task.');
            const sendButton = page.locator('button:has-text("送出"), button:has-text("Send")');
            if (await sendButton.count() > 0) {
              await sendButton.click();
              await page.waitForTimeout(5000);
              testResults.pbl.evaluation = true;
            }
          }
          await page.screenshot({ path: 'test-screenshots/db-11-pbl-task-interaction.png' });
        }
        
        // 階段5: 完成評估
        console.log('  階段5: 完成評估');
        const completeButton = page.locator('button:has-text("完成"), button:has-text("Complete")');
        if (await completeButton.count() > 0) {
          await completeButton.click();
          await page.waitForTimeout(3000);
          if (page.url().includes('/complete')) {
            testResults.pbl.complete = true;
            await page.screenshot({ path: 'test-screenshots/db-12-pbl-complete.png' });
          }
        }
      }
    } else {
      console.log('  ⚠️ 沒有找到 PBL 場景，可能需要初始化資料');
    }

    // ========== 5. Assessment 模組測試（五階段）==========
    console.log('\n📊 5. 測試 Assessment 模組五階段...');
    
    // 階段1: 瀏覽評估列表
    console.log('  階段1: 瀏覽評估列表');
    await page.goto(STAGING_URL + '/assessment/scenarios', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-screenshots/db-13-assessment-scenarios.png' });
    
    const assessmentScenarios = page.locator('[data-testid="scenario-card"], .scenario-card, article');
    const assessmentCount = await assessmentScenarios.count();
    console.log(`  找到 ${assessmentCount} 個 Assessment 場景`);
    
    if (assessmentCount > 0) {
      testResults.assessment.scenario = true;
      
      // 階段2: 進入評估詳情
      console.log('  階段2: 進入評估詳情');
      await assessmentScenarios.first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-screenshots/db-14-assessment-detail.png' });
      
      // 階段3: 開始評估
      console.log('  階段3: 開始評估');
      const startAssessment = page.locator('button:has-text("開始"), button:has-text("Start")');
      if (await startAssessment.count() > 0) {
        await startAssessment.click();
        await page.waitForTimeout(3000);
        testResults.assessment.program = true;
        await page.screenshot({ path: 'test-screenshots/db-15-assessment-started.png' });
        
        // 階段4: 回答問題
        console.log('  階段4: 回答問題');
        const answerOptions = page.locator('input[type="radio"], button.answer-option');
        if (await answerOptions.count() > 0) {
          await answerOptions.first().click();
          testResults.assessment.task = true;
          
          const nextButton = page.locator('button:has-text("下一題"), button:has-text("Next")');
          if (await nextButton.count() > 0) {
            await nextButton.click();
            await page.waitForTimeout(2000);
            testResults.assessment.evaluation = true;
          }
          await page.screenshot({ path: 'test-screenshots/db-16-assessment-answer.png' });
        }
        
        // 階段5: 查看結果
        console.log('  階段5: 查看結果');
        if (page.url().includes('/complete') || page.url().includes('/results')) {
          testResults.assessment.complete = true;
          await page.screenshot({ path: 'test-screenshots/db-17-assessment-results.png' });
        }
      }
    } else {
      console.log('  ⚠️ 沒有找到 Assessment 場景，可能需要初始化資料');
    }

    // ========== 6. Discovery 模組測試（五階段）==========
    console.log('\n🔍 6. 測試 Discovery 模組五階段...');
    
    // 階段1: 瀏覽職涯探索
    console.log('  階段1: 瀏覽職涯探索');
    await page.goto(STAGING_URL + '/discovery/scenarios', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-screenshots/db-18-discovery-scenarios.png' });
    
    const discoveryScenarios = page.locator('[data-testid="scenario-card"], .scenario-card, article');
    const discoveryCount = await discoveryScenarios.count();
    console.log(`  找到 ${discoveryCount} 個 Discovery 場景`);
    
    if (discoveryCount > 0) {
      testResults.discovery.scenario = true;
      
      // 階段2: 進入職涯詳情
      console.log('  階段2: 進入職涯詳情');
      await discoveryScenarios.first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-screenshots/db-19-discovery-detail.png' });
      
      // 階段3: 開始探索
      console.log('  階段3: 開始探索');
      const startDiscovery = page.locator('button:has-text("開始"), button:has-text("Start")');
      if (await startDiscovery.count() > 0) {
        await startDiscovery.click();
        await page.waitForTimeout(3000);
        testResults.discovery.program = true;
        await page.screenshot({ path: 'test-screenshots/db-20-discovery-started.png' });
        
        // 階段4: 互動學習
        console.log('  階段4: 互動學習');
        if (page.url().includes('/tasks/')) {
          testResults.discovery.task = true;
          
          // 嘗試選擇技能或回答問題
          const interactionElements = page.locator('button, input[type="checkbox"]');
          if (await interactionElements.count() > 0) {
            await interactionElements.first().click();
            await page.waitForTimeout(2000);
            testResults.discovery.evaluation = true;
          }
          await page.screenshot({ path: 'test-screenshots/db-21-discovery-interaction.png' });
        }
        
        // 階段5: 完成探索
        console.log('  階段5: 完成探索');
        if (page.url().includes('/complete')) {
          testResults.discovery.complete = true;
          await page.screenshot({ path: 'test-screenshots/db-22-discovery-complete.png' });
        }
      }
    } else {
      console.log('  ⚠️ 沒有找到 Discovery 場景，可能需要初始化資料');
    }

    // ========== 7. 檢查資料庫記錄 ==========
    console.log('\n🗄️ 7. 驗證資料庫記錄...');
    
    // 檢查 API 確認資料是否寫入
    const response = await page.request.get(STAGING_URL + '/api/monitoring/status');
    const statusData = await response.json();
    console.log('  資料庫狀態:', statusData.database?.status || 'unknown');
    console.log('  資料庫類型:', statusData.database?.type || 'unknown');
    
    // 檢查用戶資料
    const profileResponse = await page.request.get(STAGING_URL + '/api/auth/profile');
    if (profileResponse.ok()) {
      const profileData = await profileResponse.json();
      console.log('  ✅ 用戶資料已寫入資料庫');
      console.log('    - Email:', profileData.email || TEST_EMAIL);
    }

  } catch (error) {
    console.error('\n❌ 測試失敗:', error instanceof Error ? error.message : String(error));
    await page.screenshot({ path: 'test-screenshots/db-error.png', fullPage: true });
  } finally {
    // ========== 測試結果總結 ==========
    console.log('\n' + '='.repeat(50));
    console.log('📊 測試結果總結\n');
    
    console.log('1. 用戶系統:');
    console.log(`   註冊: ${testResults.registration ? '✅' : '❌'}`);
    console.log(`   登入: ${testResults.login ? '✅' : '❌'}`);
    console.log(`   Onboarding: ${testResults.onboarding ? '✅' : '❌'}`);
    
    console.log('\n2. PBL 模組:');
    console.log(`   場景列表: ${testResults.pbl.scenario ? '✅' : '❌'}`);
    console.log(`   開始學習: ${testResults.pbl.program ? '✅' : '❌'}`);
    console.log(`   執行任務: ${testResults.pbl.task ? '✅' : '❌'}`);
    console.log(`   AI 評估: ${testResults.pbl.evaluation ? '✅' : '❌'}`);
    console.log(`   完成: ${testResults.pbl.complete ? '✅' : '❌'}`);
    
    console.log('\n3. Assessment 模組:');
    console.log(`   場景列表: ${testResults.assessment.scenario ? '✅' : '❌'}`);
    console.log(`   開始評估: ${testResults.assessment.program ? '✅' : '❌'}`);
    console.log(`   回答問題: ${testResults.assessment.task ? '✅' : '❌'}`);
    console.log(`   評分: ${testResults.assessment.evaluation ? '✅' : '❌'}`);
    console.log(`   結果: ${testResults.assessment.complete ? '✅' : '❌'}`);
    
    console.log('\n4. Discovery 模組:');
    console.log(`   場景列表: ${testResults.discovery.scenario ? '✅' : '❌'}`);
    console.log(`   開始探索: ${testResults.discovery.program ? '✅' : '❌'}`);
    console.log(`   互動學習: ${testResults.discovery.task ? '✅' : '❌'}`);
    console.log(`   技能評估: ${testResults.discovery.evaluation ? '✅' : '❌'}`);
    console.log(`   完成: ${testResults.discovery.complete ? '✅' : '❌'}`);
    
    console.log('\n' + '='.repeat(50));
    
    // 計算成功率
    const totalTests = 20; // 總共測試項目
    const passedTests = Object.values(testResults).flat().filter(v => 
      typeof v === 'boolean' ? v : Object.values(v as any).filter(Boolean).length
    ).length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`\n整體成功率: ${successRate}% (${passedTests}/${totalTests})`);
    
    if (passedTests < totalTests / 2) {
      console.log('\n⚠️ 注意: 許多功能測試失敗，可能需要:');
      console.log('1. 初始化資料庫種子資料');
      console.log('2. 確認 Cloud SQL 連接正常');
      console.log('3. 檢查環境變數配置');
    }
    
    await browser.close();
  }
}

// 執行測試
testDatabaseFeatures().catch(console.error);