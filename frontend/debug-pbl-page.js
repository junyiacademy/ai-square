// Debug script to check PBL page behavior
const puppeteer = require('puppeteer');

async function debugPBLPage() {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  // 監聽 console 輸出
  page.on('console', msg => {
    console.log('🖥️  Browser Console:', msg.type(), msg.text());
  });
  
  // 監聽錯誤
  page.on('pageerror', err => {
    console.log('❌ Page Error:', err.message);
  });
  
  // 監聽網路請求
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/')) {
      console.log('🌐 API Request:', response.status(), url);
    }
  });
  
  try {
    console.log('🔐 登入中...');
    await page.goto('http://localhost:3000/login');
    
    // 登入
    await page.type('#email', 'student@example.com');
    await page.type('#password', 'student123');
    await page.click('button[type="submit"]');
    
    // 等待重定向
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('✅ 登入成功，當前 URL:', page.url());
    
    console.log('🎯 導航到 PBL 頁面...');
    await page.goto('http://localhost:3000/pbl/scenarios');
    await page.waitForTimeout(3000);
    
    // 檢查頁面內容
    const title = await page.$eval('h1', el => el.textContent);
    console.log('📄 頁面標題:', title);
    
    // 檢查 scenarios 陣列
    const scenariosCount = await page.evaluate(() => {
      // 尋找 React 組件的狀態
      const reactFiberKey = Object.keys(window).find(key => key.startsWith('__REACT_DEVTOOLS_GLOBAL_HOOK__'));
      if (reactFiberKey) {
        console.log('Found React DevTools');
      }
      
      // 檢查是否有場景卡片
      const cards = document.querySelectorAll('.grid > div');
      console.log('Grid children:', cards.length);
      
      // 檢查每個卡片的內容
      Array.from(cards).forEach((card, i) => {
        console.log(`Card ${i}:`, card.innerHTML.length, 'chars');
      });
      
      return cards.length;
    });
    
    console.log('🎴 找到的卡片數量:', scenariosCount);
    
    // 等待一段時間觀察
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await browser.close();
  }
}

debugPBLPage();