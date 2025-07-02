import { chromium } from 'playwright';

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'zhTW'
  });
  const page = await context.newPage();

  // 登入函數
  async function login() {
    await page.goto('https://ai-square-frontend-731209836128.asia-east1.run.app/login');
    await page.fill('input[type="email"]', 'teacher@example.com');
    await page.fill('input[type="password"]', 'teacher123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    console.log('✅ 登入成功');
  }

  // 五大路徑截圖
  const paths = [
    {
      name: '1-dashboard',
      url: '/dashboard',
      title: '儀表板 - 學習指揮中心',
      waitFor: 'text=AI 素養進度'
    },
    {
      name: '2-assessment',
      url: '/assessment',
      title: '評估 - AI 素養測驗',
      waitFor: 'text=AI 素養評估'
    },
    {
      name: '3-learning-path',
      url: '/learning-path',
      title: '學習路徑 - 個人化推薦',
      waitFor: 'text=AI 學習路徑'
    },
    {
      name: '4-pbl',
      url: '/pbl',
      title: 'PBL - 實作情境',
      waitFor: 'text=問題導向學習'
    },
    {
      name: '5-chat',
      url: '/chat',
      title: 'AI 顧問 - 隨時諮詢',
      waitFor: 'text=AI 學習顧問'
    }
  ];

  try {
    // 先登入
    await login();

    // 截圖每個路徑
    for (const path of paths) {
      console.log(`📸 正在截圖: ${path.title}`);
      
      await page.goto(`https://ai-square-frontend-731209836128.asia-east1.run.app${path.url}`);
      
      // 等待關鍵元素載入
      await page.waitForSelector(`:has-text("${path.waitFor}")`, { timeout: 10000 }).catch(() => {
        console.log(`⚠️ 找不到元素 "${path.waitFor}"，繼續截圖`);
      });
      
      // 等待動畫完成
      await page.waitForTimeout(2000);
      
      // 截圖
      await page.screenshot({
        path: `screenshots/${path.name}-${path.title}.png`,
        fullPage: false
      });
      
      console.log(`✅ 完成: ${path.title}`);
    }

    // 額外截圖：評估結果頁（雷達圖）
    console.log('📸 額外截圖: 評估結果雷達圖');
    await page.goto('https://ai-square-frontend-731209836128.asia-east1.run.app/assessment/history');
    await page.waitForTimeout(2000);
    
    // 如果有歷史記錄，點擊第一個
    const hasHistory = await page.locator('text=查看詳情').first().isVisible().catch(() => false);
    if (hasHistory) {
      await page.click('text=查看詳情');
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: 'screenshots/6-assessment-result-評估結果雷達圖.png',
        fullPage: false
      });
      console.log('✅ 完成: 評估結果雷達圖');
    }

    // PBL 互動學習截圖
    console.log('📸 額外截圖: PBL 互動學習');
    await page.goto('https://ai-square-frontend-731209836128.asia-east1.run.app/pbl/scenarios/ai_robotics_development_scenario');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'screenshots/7-pbl-scenario-AI機器人開發情境.png',
      fullPage: false
    });
    console.log('✅ 完成: PBL 情境詳情');

  } catch (error) {
    console.error('❌ 截圖失敗:', error);
  } finally {
    await browser.close();
    console.log('🎉 所有截圖完成！');
  }
}

// 執行截圖
captureScreenshots().catch(console.error);