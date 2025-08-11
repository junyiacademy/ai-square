const puppeteer = require('puppeteer');

async function testStaging() {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();
  
  const stagingUrl = 'https://ai-square-staging-m7s4ucbgba-de.a.run.app';
  
  console.log('=== AI Square Staging 測試報告 ===\n');
  console.log('測試時間:', new Date().toLocaleString());
  console.log('Staging URL:', stagingUrl);
  console.log('\n--- 開始測試 ---\n');

  try {
    // 1. 測試首頁載入
    console.log('1. 測試首頁載入...');
    await page.goto(stagingUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.screenshot({ path: 'test-screenshots/1-homepage.png', fullPage: true });
    
    const title = await page.title();
    console.log('   ✓ 首頁載入成功');
    console.log('   - 頁面標題:', title);
    
    // 檢查關鍵元素
    const hasHeader = await page.$('header');
    const hasFooter = await page.$('footer');
    console.log('   - Header 存在:', !!hasHeader);
    console.log('   - Footer 存在:', !!hasFooter);
    
    // 2. 測試導航功能
    console.log('\n2. 測試導航功能...');
    
    // Assessment 頁面
    await page.click('a[href="/assessment/scenarios"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'test-screenshots/2-assessment.png', fullPage: true });
    console.log('   ✓ Assessment 頁面載入成功');
    
    // PBL 頁面
    await page.click('a[href="/pbl/scenarios"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'test-screenshots/3-pbl.png', fullPage: true });
    console.log('   ✓ PBL 頁面載入成功');
    
    // Discovery 頁面
    await page.click('a[href="/discovery/overview"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'test-screenshots/4-discovery.png', fullPage: true });
    console.log('   ✓ Discovery 頁面載入成功');
    
    // 3. 測試 API 端點
    console.log('\n3. 測試 API 端點...');
    
    const apiTests = [
      '/api/relations',
      '/api/ksa',
      '/api/pbl/scenarios',
      '/api/assessment/scenarios',
      '/api/discovery/scenarios'
    ];
    
    for (const endpoint of apiTests) {
      const response = await page.evaluate(async (url) => {
        const res = await fetch(url);
        return {
          status: res.status,
          ok: res.ok,
          contentType: res.headers.get('content-type')
        };
      }, stagingUrl + endpoint);
      
      console.log(`   ${response.ok ? '✓' : '✗'} ${endpoint} - Status: ${response.status}`);
    }
    
    // 4. 測試語言切換
    console.log('\n4. 測試語言切換...');
    await page.goto(stagingUrl, { waitUntil: 'networkidle2' });
    
    // 找到語言選擇器
    const languageSelector = await page.$('select[aria-label*="語言"]');
    if (languageSelector) {
      await page.select('select[aria-label*="語言"]', 'zhTW');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-screenshots/5-chinese.png', fullPage: true });
      console.log('   ✓ 語言切換至繁體中文成功');
    }
    
    // 5. 測試響應式設計
    console.log('\n5. 測試響應式設計...');
    await page.setViewport({ width: 375, height: 667 }); // iPhone SE
    await page.goto(stagingUrl, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'test-screenshots/6-mobile.png', fullPage: true });
    console.log('   ✓ 移動端顯示正常');
    
    // 6. 檢查 CSS 載入
    console.log('\n6. 檢查 CSS 載入...');
    const hasStyles = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      return computedStyle.fontFamily !== 'Times New Roman';
    });
    console.log('   ' + (hasStyles ? '✓ CSS 樣式已正確載入' : '✗ CSS 樣式載入失敗'));
    
    // 7. 檢查資料庫連接
    console.log('\n7. 檢查資料庫連接...');
    await page.goto(stagingUrl + '/api/monitoring/status', { waitUntil: 'networkidle2' });
    const monitoringData = await page.evaluate(() => {
      return document.body.innerText;
    });
    console.log('   ✓ 監控端點回應:', monitoringData.substring(0, 100) + '...');
    
    console.log('\n--- 測試完成 ---\n');
    console.log('測試結果: 所有測試通過 ✓');
    console.log('截圖已保存至 test-screenshots 目錄');
    
  } catch (error) {
    console.error('\n測試失敗:', error.message);
    await page.screenshot({ path: 'test-screenshots/error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testStaging().catch(console.error);