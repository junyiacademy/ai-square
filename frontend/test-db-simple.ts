import { chromium } from 'playwright';

const STAGING_URL = 'https://ai-square-staging-731209836128.asia-east1.run.app';

async function testDatabaseSimple() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  console.log('=== 簡化資料庫功能測試 ===\n');
  
  try {
    // 1. 檢查首頁
    console.log('1. 檢查首頁...');
    await page.goto(STAGING_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'test-screenshots/simple-1-home.png' });
    console.log('  ✅ 首頁載入成功');
    
    // 2. 檢查註冊頁面結構
    console.log('\n2. 檢查註冊頁面...');
    await page.goto(STAGING_URL + '/register', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000); // 等待客戶端渲染
    await page.screenshot({ path: 'test-screenshots/simple-2-register.png' });
    
    // 列出所有輸入欄位
    const inputs = await page.locator('input').all();
    console.log(`  找到 ${inputs.length} 個輸入欄位`);
    
    for (let i = 0; i < inputs.length; i++) {
      const type = await inputs[i].getAttribute('type');
      const name = await inputs[i].getAttribute('name');
      const id = await inputs[i].getAttribute('id');
      const placeholder = await inputs[i].getAttribute('placeholder');
      console.log(`  輸入欄位 ${i + 1}: type="${type}", name="${name}", id="${id}", placeholder="${placeholder}"`);
    }
    
    // 3. 檢查登入頁面結構
    console.log('\n3. 檢查登入頁面...');
    await page.goto(STAGING_URL + '/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/simple-3-login.png' });
    
    const loginInputs = await page.locator('input').all();
    console.log(`  找到 ${loginInputs.length} 個輸入欄位`);
    
    // 4. 測試 API 端點
    console.log('\n4. 測試 API 端點...');
    
    // 測試監控狀態
    const statusResponse = await page.request.get(STAGING_URL + '/api/monitoring/status');
    const statusData = await statusResponse.json();
    console.log('  監控狀態:', statusResponse.status());
    console.log('  資料庫:', statusData.database);
    
    // 測試場景 API
    console.log('\n5. 測試場景 API...');
    
    const pblResponse = await page.request.get(STAGING_URL + '/api/pbl/scenarios');
    const pblData = await pblResponse.json();
    console.log('  PBL 場景數量:', pblData.scenarios?.length || 0);
    
    const assessmentResponse = await page.request.get(STAGING_URL + '/api/assessment/scenarios');
    const assessmentData = await assessmentResponse.json();
    console.log('  Assessment 場景數量:', assessmentData.scenarios?.length || 0);
    
    const discoveryResponse = await page.request.get(STAGING_URL + '/api/discovery/scenarios');
    const discoveryData = await discoveryResponse.json();
    console.log('  Discovery 場景數量:', discoveryData.scenarios?.length || 0);
    
    // 6. 檢查場景頁面
    console.log('\n6. 檢查場景頁面...');
    
    // PBL
    await page.goto(STAGING_URL + '/pbl/scenarios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/simple-4-pbl.png' });
    const pblCards = await page.locator('article, .card, [role="article"]').count();
    console.log(`  PBL 頁面卡片數量: ${pblCards}`);
    
    // Assessment
    await page.goto(STAGING_URL + '/assessment/scenarios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/simple-5-assessment.png' });
    const assessmentCards = await page.locator('article, .card, [role="article"]').count();
    console.log(`  Assessment 頁面卡片數量: ${assessmentCards}`);
    
    // Discovery
    await page.goto(STAGING_URL + '/discovery/scenarios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/simple-6-discovery.png' });
    const discoveryCards = await page.locator('article, .card, [role="article"]').count();
    console.log(`  Discovery 頁面卡片數量: ${discoveryCards}`);
    
    // 7. 檢查資料庫連接
    console.log('\n7. 資料庫連接測試...');
    if (statusData.database?.status === 'connected') {
      console.log('  ✅ 資料庫連接正常');
      console.log('  類型:', statusData.database.type);
    } else {
      console.log('  ❌ 資料庫連接失敗');
    }
    
  } catch (error) {
    console.error('\n❌ 測試錯誤:', error instanceof Error ? error.message : String(error));
    await page.screenshot({ path: 'test-screenshots/simple-error.png' });
  } finally {
    console.log('\n測試完成！截圖保存在 test-screenshots 目錄。');
    await browser.close();
  }
}

testDatabaseSimple().catch(console.error);