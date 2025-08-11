import { chromium } from 'playwright';

async function testCSSFixed() {
  const browser = await chromium.launch({ 
    headless: false
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  const stagingUrl = 'https://ai-square-staging-731209836128.asia-east1.run.app';
  
  console.log('=== CSS 修復驗證測試 ===\n');
  console.log('時間:', new Date().toLocaleString());
  console.log('URL:', stagingUrl);
  
  try {
    // 1. 載入首頁
    console.log('\n1. 載入首頁...');
    await page.goto(stagingUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // 2. 檢查 CSS 是否載入
    console.log('\n2. 檢查 CSS 載入狀態...');
    const hasStyles = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      const hasBackground = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)';
      const hasFont = computedStyle.fontFamily !== '';
      
      // 檢查是否有 Tailwind 類
      const hasTailwindClasses = document.querySelectorAll('[class*="flex"]').length > 0 ||
                                document.querySelectorAll('[class*="grid"]').length > 0 ||
                                document.querySelectorAll('[class*="px-"]').length > 0 ||
                                document.querySelectorAll('[class*="py-"]').length > 0;
      
      // 檢查按鈕樣式
      const buttons = document.querySelectorAll('button');
      const hasStyledButtons = Array.from(buttons).some(btn => {
        const style = window.getComputedStyle(btn);
        return style.backgroundColor !== 'rgba(0, 0, 0, 0)' || 
               style.borderRadius !== '0px' ||
               style.padding !== '0px';
      });
      
      return {
        hasBackground,
        hasFont,
        hasTailwindClasses,
        hasStyledButtons,
        backgroundColor: computedStyle.backgroundColor,
        fontFamily: computedStyle.fontFamily
      };
    });
    
    console.log('✓ 背景色設置:', hasStyles.hasBackground, `(${hasStyles.backgroundColor})`);
    console.log('✓ 字體設置:', hasStyles.hasFont, `(${hasStyles.fontFamily})`);
    console.log('✓ Tailwind 類存在:', hasStyles.hasTailwindClasses);
    console.log('✓ 按鈕有樣式:', hasStyles.hasStyledButtons);
    
    // 3. 截圖對比
    console.log('\n3. 截圖首頁...');
    await page.screenshot({ path: 'test-screenshots/css-fixed-1-homepage.png', fullPage: true });
    
    // 4. 檢查導航欄樣式
    const hasNavStyles = await page.evaluate(() => {
      const nav = document.querySelector('nav') || document.querySelector('header');
      if (!nav) return false;
      const style = window.getComputedStyle(nav);
      return style.padding !== '0px' || style.backgroundColor !== 'rgba(0, 0, 0, 0)';
    });
    console.log('✓ 導航欄有樣式:', hasNavStyles);
    
    // 5. 測試其他頁面
    console.log('\n4. 測試 PBL 頁面...');
    await page.goto(stagingUrl + '/pbl/scenarios', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-screenshots/css-fixed-2-pbl.png', fullPage: true });
    
    // 檢查頁面標題樣式
    const hasTitleStyles = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (!h1) return false;
      const style = window.getComputedStyle(h1);
      return style.fontSize !== '16px' && style.fontWeight !== '400';
    });
    console.log('✓ 標題有樣式:', hasTitleStyles);
    
    // 6. 最終結論
    console.log('\n=== 測試結果 ===');
    if (hasStyles.hasTailwindClasses && hasStyles.hasStyledButtons) {
      console.log('✅ CSS 已成功修復！頁面樣式正常顯示。');
    } else {
      console.log('❌ CSS 問題仍然存在，需要進一步調查。');
    }
    
  } catch (error) {
    console.error('測試失敗:', error instanceof Error ? error.message : String(error));
    await page.screenshot({ path: 'test-screenshots/css-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testCSSFixed().catch(console.error);