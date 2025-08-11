import { chromium } from 'playwright';

const STAGING_URL = 'https://ai-square-staging-731209836128.asia-east1.run.app';

async function testWithDemoAccount() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  console.log('=== AI Square 資料庫功能測試（使用 Demo 帳號）===\n');
  console.log('測試時間:', new Date().toLocaleString());
  console.log('測試 URL:', STAGING_URL);
  console.log('');

  const testResults = {
    database: false,
    login: false,
    pbl: { list: false, detail: false, start: false },
    assessment: { list: false, detail: false, start: false },
    discovery: { list: false, detail: false, start: false }
  };

  try {
    // ========== 1. 驗證資料庫連接 ==========
    console.log('📊 1. 驗證資料庫連接...');
    const apiResponse = await page.request.get(STAGING_URL + '/api/pbl/scenarios');
    const apiData = await apiResponse.json();
    
    if (apiData.success && apiData.data.scenarios.length > 0) {
      console.log(`  ✅ 資料庫連接正常，找到 ${apiData.data.scenarios.length} 個 PBL 場景`);
      testResults.database = true;
    }

    // ========== 2. 使用 Demo Student 帳號登入 ==========
    console.log('\n🔐 2. 使用 Demo Student 帳號登入...');
    await page.goto(STAGING_URL + '/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // 點擊 Student Demo 按鈕
    const studentDemoButton = page.locator('text=Student').first();
    if (await studentDemoButton.count() > 0) {
      console.log('  點擊 Student Demo 按鈕...');
      await studentDemoButton.click();
      await page.waitForTimeout(5000);
      
      // 檢查是否登入成功
      if (!page.url().includes('/login')) {
        console.log('  ✅ Demo 登入成功！');
        testResults.login = true;
        await page.screenshot({ path: 'test-screenshots/final-1-after-login.png' });
      } else {
        // 如果還在登入頁，嘗試手動填寫
        console.log('  嘗試手動填寫 Demo 帳號...');
        await page.fill('input[type="email"]', 'student@example.com');
        await page.fill('input[type="password"]', 'student123');
        await page.click('button:has-text("Login")');
        await page.waitForTimeout(5000);
        
        if (!page.url().includes('/login')) {
          console.log('  ✅ 手動登入成功！');
          testResults.login = true;
        } else {
          console.log('  ❌ 登入失敗');
        }
      }
    }

    // ========== 3. PBL 模組測試（五階段）==========
    console.log('\n📚 3. 測試 PBL 模組五階段...');
    
    // 階段1: 瀏覽場景列表
    console.log('  階段1: 瀏覽場景列表');
    await page.goto(STAGING_URL + '/pbl/scenarios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/final-2-pbl-list.png' });
    
    // 檢查是否被重定向到登入頁
    if (page.url().includes('/login')) {
      console.log('  ⚠️ 需要登入才能訪問 PBL');
    } else {
      const pblCards = await page.locator('article, .card, a[href*="/pbl/scenarios/"]').all();
      console.log(`  找到 ${pblCards.length} 個 PBL 場景卡片`);
      
      if (pblCards.length > 0) {
        testResults.pbl.list = true;
        
        // 階段2: 進入場景詳情
        console.log('  階段2: 進入場景詳情');
        await pblCards[0].click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-screenshots/final-3-pbl-detail.png' });
        
        if (!page.url().includes('/login')) {
          testResults.pbl.detail = true;
          
          // 階段3: 開始學習
          console.log('  階段3: 開始學習');
          const startButton = page.locator('button:has-text("Start"), button:has-text("開始")').first();
          if (await startButton.count() > 0) {
            await startButton.click();
            await page.waitForTimeout(5000);
            
            if (page.url().includes('/tasks/') || page.url().includes('/programs/')) {
              console.log('  ✅ 成功進入 PBL 學習任務');
              testResults.pbl.start = true;
              await page.screenshot({ path: 'test-screenshots/final-4-pbl-task.png' });
              
              // 階段4: 嘗試與 AI 互動
              console.log('  階段4: 與 AI 互動');
              const chatInput = page.locator('textarea, input[placeholder*="message"], input[placeholder*="question"]').first();
              if (await chatInput.count() > 0) {
                await chatInput.fill('Hello, I need help understanding this task.');
                const sendButton = page.locator('button[type="submit"], button:has-text("Send")').first();
                if (await sendButton.count() > 0) {
                  await sendButton.click();
                  await page.waitForTimeout(5000);
                  console.log('  ✅ AI 互動測試完成');
                  await page.screenshot({ path: 'test-screenshots/final-5-pbl-interaction.png' });
                }
              }
            }
          }
        }
      }
    }

    // ========== 4. Assessment 模組測試 ==========
    console.log('\n📊 4. 測試 Assessment 模組...');
    
    await page.goto(STAGING_URL + '/assessment/scenarios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/final-6-assessment-list.png' });
    
    if (!page.url().includes('/login')) {
      const assessmentCards = await page.locator('article, .card, a[href*="/assessment/scenarios/"]').all();
      console.log(`  找到 ${assessmentCards.length} 個 Assessment 場景`);
      
      if (assessmentCards.length > 0) {
        testResults.assessment.list = true;
        
        await assessmentCards[0].click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-screenshots/final-7-assessment-detail.png' });
        
        if (!page.url().includes('/login')) {
          testResults.assessment.detail = true;
          
          const startAssessment = page.locator('button:has-text("Start"), button:has-text("開始")').first();
          if (await startAssessment.count() > 0) {
            await startAssessment.click();
            await page.waitForTimeout(5000);
            
            if (page.url().includes('/programs/')) {
              console.log('  ✅ 成功進入 Assessment');
              testResults.assessment.start = true;
              await page.screenshot({ path: 'test-screenshots/final-8-assessment-question.png' });
              
              // 嘗試回答問題
              const answerOptions = page.locator('input[type="radio"], button.option').first();
              if (await answerOptions.count() > 0) {
                await answerOptions.click();
                await page.waitForTimeout(2000);
                console.log('  ✅ 回答問題測試完成');
              }
            }
          }
        }
      }
    }

    // ========== 5. Discovery 模組測試 ==========
    console.log('\n🔍 5. 測試 Discovery 模組...');
    
    await page.goto(STAGING_URL + '/discovery/scenarios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/final-9-discovery-list.png' });
    
    if (!page.url().includes('/login')) {
      const discoveryCards = await page.locator('article, .card, a[href*="/discovery/scenarios/"]').all();
      console.log(`  找到 ${discoveryCards.length} 個 Discovery 場景`);
      
      if (discoveryCards.length > 0) {
        testResults.discovery.list = true;
        
        await discoveryCards[0].click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-screenshots/final-10-discovery-detail.png' });
        
        if (!page.url().includes('/login')) {
          testResults.discovery.detail = true;
          
          const startDiscovery = page.locator('button:has-text("Start"), button:has-text("Explore")').first();
          if (await startDiscovery.count() > 0) {
            await startDiscovery.click();
            await page.waitForTimeout(5000);
            
            if (page.url().includes('/programs/')) {
              console.log('  ✅ 成功進入 Discovery');
              testResults.discovery.start = true;
              await page.screenshot({ path: 'test-screenshots/final-11-discovery-explore.png' });
            }
          }
        }
      }
    }

    // ========== 6. 測試資料持久化 ==========
    if (testResults.login) {
      console.log('\n💾 6. 驗證資料持久化...');
      
      // 測試學習進度 API
      const progressResponse = await page.request.get(STAGING_URL + '/api/learning/progress');
      if (progressResponse.ok()) {
        const progressData = await progressResponse.json();
        console.log('  ✅ 學習進度 API 正常');
        if (progressData.programs && progressData.programs.length > 0) {
          console.log(`  找到 ${progressData.programs.length} 個學習記錄`);
        }
      }
      
      // 測試用戶程式 API
      const programsResponse = await page.request.get(STAGING_URL + '/api/programs');
      if (programsResponse.ok()) {
        const programsData = await programsResponse.json();
        console.log('  ✅ 用戶程式 API 正常');
        if (programsData.programs && programsData.programs.length > 0) {
          console.log(`  找到 ${programsData.programs.length} 個用戶程式`);
        }
      }
    }

  } catch (error) {
    console.error('\n❌ 測試錯誤:', error instanceof Error ? error.message : String(error));
    await page.screenshot({ path: 'test-screenshots/final-error.png', fullPage: true });
  } finally {
    // ========== 測試結果總結 ==========
    console.log('\n' + '='.repeat(60));
    console.log('📊 測試結果總結\n');
    
    console.log('1. 基礎功能:');
    console.log(`   資料庫連接: ${testResults.database ? '✅' : '❌'}`);
    console.log(`   用戶登入: ${testResults.login ? '✅' : '❌'}`);
    
    console.log('\n2. PBL 模組:');
    console.log(`   場景列表: ${testResults.pbl.list ? '✅' : '❌'}`);
    console.log(`   場景詳情: ${testResults.pbl.detail ? '✅' : '❌'}`);
    console.log(`   開始學習: ${testResults.pbl.start ? '✅' : '❌'}`);
    
    console.log('\n3. Assessment 模組:');
    console.log(`   場景列表: ${testResults.assessment.list ? '✅' : '❌'}`);
    console.log(`   場景詳情: ${testResults.assessment.detail ? '✅' : '❌'}`);
    console.log(`   開始評估: ${testResults.assessment.start ? '✅' : '❌'}`);
    
    console.log('\n4. Discovery 模組:');
    console.log(`   場景列表: ${testResults.discovery.list ? '✅' : '❌'}`);
    console.log(`   場景詳情: ${testResults.discovery.detail ? '✅' : '❌'}`);
    console.log(`   開始探索: ${testResults.discovery.start ? '✅' : '❌'}`);
    
    // 計算成功率
    const allTests = [
      testResults.database,
      testResults.login,
      testResults.pbl.list,
      testResults.pbl.detail,
      testResults.pbl.start,
      testResults.assessment.list,
      testResults.assessment.detail,
      testResults.assessment.start,
      testResults.discovery.list,
      testResults.discovery.detail,
      testResults.discovery.start
    ];
    
    const passedTests = allTests.filter(Boolean).length;
    const totalTests = allTests.length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`\n整體成功率: ${successRate}% (${passedTests}/${totalTests})`);
    
    if (parseFloat(successRate) === 100) {
      console.log('\n🎉 完美！所有測試通過，資料庫功能完全正常。');
    } else if (parseFloat(successRate) >= 80) {
      console.log('\n✅ 優秀！大部分功能正常運作。');
    } else if (parseFloat(successRate) >= 60) {
      console.log('\n⚠️ 良好，但仍有一些功能需要修復。');
    } else {
      console.log('\n❌ 需要注意，多數功能有問題。');
    }
    
    console.log('\n截圖已保存在 test-screenshots 目錄。');
    console.log('='.repeat(60));
    
    await browser.close();
  }
}

// 執行測試
testWithDemoAccount().catch(console.error);