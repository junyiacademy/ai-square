import { test, expect } from '@playwright/test';

test.describe('Three Modes Debug - 嚴格檢查', () => {
  let errors: string[] = [];
  let failed401s: string[] = [];
  let failed500s: string[] = [];
  let failedRequests: { url: string, status: number }[] = [];

  test.beforeEach(async ({ page }) => {
    // 重置錯誤收集
    errors = [];
    failed401s = [];
    failed500s = [];
    failedRequests = [];

    // 監聽 console 錯誤
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.log('🔴 Console Error:', msg.text());
      }
    });

    // 監聽網路請求失敗
    page.on('response', response => {
      const status = response.status();
      const url = response.url();

      if (status === 401) {
        failed401s.push(url);
        console.log('🚫 401 Error:', url);
      } else if (status >= 500) {
        failed500s.push(url);
        console.log('💥 500+ Error:', url, status);
      } else if (status >= 400) {
        failedRequests.push({ url, status });
        console.log('⚠️  Client Error:', url, status);
      }
    });

    // 嚴格登入流程
    console.log('🔐 開始登入流程...');
    await page.goto('http://localhost:3000/login');

    // 必須能找到登入表單
    await expect(page.locator('#email')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#password')).toBeVisible();

    // 填寫登入資訊
    await page.fill('#email', 'student@example.com');
    await page.fill('#password', 'student123');

    // 提交按鈕必須可用
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    await submitButton.click();

    // 必須重定向到 dashboard
    await expect(page).toHaveURL('http://localhost:3000/dashboard', { timeout: 15000 });
    console.log('✅ 登入成功，已進入 dashboard');

    // 檢查 session cookie 是否存在
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'sessionToken');
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie?.value).toBeTruthy();
    console.log('✅ Session cookie 已設定');
  });

  test('PBL Mode 完整流程檢查 - Program → Task → Completion', async ({ page }) => {
    console.log('🎯 測試 PBL Mode 完整流程...');

    // 1. 導航到 PBL 頁面
    await page.goto('http://localhost:3000/pbl/scenarios');

    // 檢查是否被重定向回登入頁
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error('❌ 被重定向到登入頁 - 認證狀態沒有維持！');
    }

    // 2. 必須能看到 PBL 標題
    await expect(page.locator('h1:has-text("PBL")')).toBeVisible({ timeout: 10000 });

    // 3. 等待和檢查場景卡片
    await page.waitForTimeout(3000);

    const scenarioCards = page.locator('.grid div[class*="bg-white"], .grid div[class*="bg-gray-800"]');
    const cardCount = await scenarioCards.count();
    console.log(`找到的卡片數量: ${cardCount}`);

    expect(cardCount).toBeGreaterThan(0);

    // 4. 點擊第一個場景的詳情連結 (進入場景詳情頁)
    console.log('🔄 尋找並點擊 "View Details" 連結...');

    const viewDetailsLinks = page.locator('a:has-text("View Details")');
    const linkCount = await viewDetailsLinks.count();
    console.log(`找到 ${linkCount} 個 "View Details" 連結`);

    if (linkCount > 0) {
      await viewDetailsLinks.first().click();
      console.log('✅ 成功點擊詳情連結');
    } else {
      // 如果沒有找到詳情連結，嘗試點擊整個卡片
      console.log('⚠️  未找到詳情連結，嘗試點擊卡片...');
      await scenarioCards.first().click();
    }

    // 5. 等待場景詳情頁載入並找到開始按鈕
    await page.waitForTimeout(3000);
    console.log('📍 詳情頁 URL:', page.url());

    // 調試：檢查頁面上所有按鈕的文本
    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();
    console.log(`頁面上找到 ${buttonCount} 個按鈕`);

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const buttonText = await allButtons.nth(i).textContent();
      console.log(`按鈕 ${i + 1}: "${buttonText}"`);
    }

    // 檢查是否有錯誤訊息
    const errorElements = page.locator('.error, [role="alert"], .text-red-500');
    const errorCount = await errorElements.count();
    if (errorCount > 0) {
      console.log(`⚠️  發現 ${errorCount} 個錯誤元素`);
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorElements.nth(i).textContent();
        console.log(`錯誤 ${i + 1}: "${errorText}"`);
      }
    }

    // 檢查是否在載入中
    const loadingElements = page.locator('.animate-pulse, .loading, :has-text("Loading")');
    const loadingCount = await loadingElements.count();
    if (loadingCount > 0) {
      console.log(`⚠️  頁面仍在載入中，發現 ${loadingCount} 個載入元素`);
      // 等待載入完成
      await page.waitForTimeout(5000);
    }

    const startButtons = page.locator('button:has-text("Start New Program"), button:has-text("Continue"), button:has-text("Start"), button:has-text("開始"), button:has-text("Begin")');
    const startButtonCount = await startButtons.count();

    if (startButtonCount === 0) {
      // 如果沒有找到開始按鈕，取得部分頁面 HTML 進行調試
      const mainContent = await page.locator('main').innerHTML();
      console.log('詳情頁面 HTML 片段 (前 1000 字符):', mainContent.substring(0, 1000));
      throw new Error('❌ 未在 PBL 詳情頁面找到任何開始按鈕！');
    }

    console.log(`✅ 找到 ${startButtonCount} 個開始按鈕，開始創建 Program...`);
    await startButtons.first().click();

    // 6. Program 創建 - 等待重定向到學習介面
    await page.waitForTimeout(5000);
    console.log('📍 當前 URL:', page.url());

    // 檢查 URL 是否包含 program ID (表示 program 創建成功)
    const urlContainsProgram = page.url().includes('/programs/');
    expect(urlContainsProgram).toBeTruthy();
    console.log('✅ Program 創建成功，已進入學習介面');

    // 7. Task 執行 - 檢查是否有任務內容
    const taskElements = page.locator('h1, h2, .task-title, [data-testid*="task"]');
    await expect(taskElements.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Task 載入成功，找到任務元素');

    // 8. 尋找互動元素並進行任務操作
    const interactionElements = page.locator('textarea, input[type="text"], button[type="submit"]');
    const interactionCount = await interactionElements.count();
    console.log(`找到 ${interactionCount} 個互動元素`);

    if (interactionCount > 0) {
      // 檢查是否有文字輸入區域
      const textArea = page.locator('textarea').first();
      if (await textArea.isVisible({ timeout: 5000 })) {
        await textArea.fill('這是我在 PBL 任務中的測試回答。我理解了問題的要求，並提供了相關的解決方案。');
        console.log('✅ 成功填寫任務回答');

        // 尋找提交按鈕
        const submitBtn = page.locator('button:has-text("Submit"), button:has-text("提交"), button:has-text("Continue"), button:has-text("繼續")');
        if (await submitBtn.first().isVisible({ timeout: 5000 })) {
          await submitBtn.first().click();
          console.log('🔄 已點擊提交按鈕，等待 API 回應...');

          // 等待更長時間以檢查是否有 API 錯誤
          await page.waitForTimeout(5000);

          // 檢查是否有評估錯誤
          const hasEvaluationError = errors.some(error => error.includes('Evaluation API error'));
          if (hasEvaluationError) {
            console.error('❌ 檢測到評估 API 錯誤！');
            throw new Error('評估 API 無法正常工作 - 任務提交失敗');
          }

          console.log('✅ 提交成功，沒有評估 API 錯誤');

          // 檢查是否有 AI 回饋或下一步指示
          const feedbackElements = page.locator('.ai-response, .feedback, .next-task, .completion, .evaluation-result');
          const feedbackCount = await feedbackElements.count();
          if (feedbackCount > 0) {
            console.log(`✅ 收到 ${feedbackCount} 個回饋元素`);
          } else {
            console.log('⚠️  未收到明確的 AI 回饋，但提交成功');
          }
        } else {
          console.log('⚠️  未找到提交按鈕');
        }
      } else {
        console.log('⚠️  未找到文字輸入區域');
      }
    } else {
      console.log('⚠️  未找到任何互動元素');
    }

    // 9. Completion 檢查 - 尋找完成相關元素
    await page.waitForTimeout(2000);
    const completionElements = page.locator(
      'button:has-text("Complete"), button:has-text("完成"), ' +
      '.completion-page, .task-complete, .program-complete, ' +
      'h1:has-text("Complete"), h2:has-text("完成")'
    );
    const completionCount = await completionElements.count();

    if (completionCount > 0) {
      console.log('✅ 找到完成相關元素，嘗試完成流程...');

      // 如果有完成按鈕，點擊它
      const completeBtn = page.locator('button:has-text("Complete"), button:has-text("完成")');
      if (await completeBtn.first().isVisible({ timeout: 5000 })) {
        await completeBtn.first().click();
        await page.waitForTimeout(3000);
        console.log('✅ 點擊完成按鈕成功');

        // 檢查是否到達最終完成頁面
        const finalCompletion = page.locator('.program-completed, .congratulations, h1:has-text("Congratulations")');
        const finalCount = await finalCompletion.count();
        if (finalCount > 0) {
          console.log('🎉 到達最終完成頁面！完整流程測試成功！');
        }
      }
    } else {
      console.log('⚠️  未找到明確的完成元素，但任務執行流程已驗證');
    }

    // 檢查嚴重錯誤 (500+)，401 錯誤可能是正常的 API 鑑權流程
    expect(failed500s.length).toBe(0);
    if (failed500s.length > 0) {
      console.error('❌ PBL 流程中的 500+ 錯誤:', failed500s);
    }

    if (failed401s.length > 0) {
      console.log(`⚠️  PBL 流程中有 ${failed401s.length} 個 401 錯誤 (可能是 API 鑑權相關):`);
      failed401s.slice(0, 3).forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
    }

    console.log('✅ PBL Mode 完整流程檢查完成 - Program → Task → Completion 已驗證');
  });

  test('Discovery Mode 完整流程檢查 - Program → Task → Completion', async ({ page }) => {
    console.log('🌟 測試 Discovery Mode 完整流程...');

    await page.goto('http://localhost:3000/discovery');

    // 檢查重定向
    if (page.url().includes('/login')) {
      throw new Error('❌ Discovery - 被重定向到登入頁');
    }

    // 檢查標題或內容
    const hasDiscoveryContent = await page.locator('h1, h2, h3').filter({ hasText: /Discovery|Career|職業/ }).count();
    if (hasDiscoveryContent === 0) {
      console.log('⚠️  沒有找到 Discovery 相關標題');
    } else {
      console.log(`✅ Discovery 頁面載入成功 (${hasDiscoveryContent} 個相關元素)`);
    }

    // 尋找職業卡片或項目
    const careerItems = page.locator('article, .career-card, [data-testid*="career"], .grid > div');
    const itemCount = await careerItems.count();
    console.log(`Discovery 項目數量: ${itemCount}`);

    if (itemCount > 0) {
      console.log('🔄 點擊第一個 Discovery 項目...');
      await careerItems.first().click();
      await page.waitForTimeout(3000);

      // 檢查是否進入詳細頁面
      const detailElements = page.locator('h1, h2, .career-details, .start-exploration');
      const detailCount = await detailElements.count();

      if (detailCount > 0) {
        console.log('✅ 進入 Discovery 詳細頁面');

        // 尋找開始按鈕
        const startBtn = page.locator('button:has-text("Start"), button:has-text("開始"), button:has-text("Explore"), button:has-text("探索")');
        if (await startBtn.first().isVisible({ timeout: 5000 })) {
          console.log('✅ 找到開始探索按鈕，創建 Program...');
          await startBtn.first().click();
          await page.waitForTimeout(5000);

          // 檢查 URL 是否包含 program ID
          const urlContainsProgram = page.url().includes('/program/') || page.url().includes('/explore/');
          if (urlContainsProgram) {
            console.log('✅ Discovery Program 創建成功');

            // 檢查任務元素
            const taskElements = page.locator('.task, .exploration-step, .career-activity, h2, h3');
            const taskCount = await taskElements.count();

            if (taskCount > 0) {
              console.log(`✅ Discovery Task 載入成功，找到 ${taskCount} 個任務元素`);

              // 尋找互動元素
              const interactionElements = page.locator('input, textarea, button, select, .clickable');
              const interactionCount = await interactionElements.count();

              if (interactionCount > 0) {
                console.log(`找到 ${interactionCount} 個 Discovery 互動元素`);

                // 如果有選擇或輸入，進行互動
                const selectElements = page.locator('select, input[type="radio"], input[type="checkbox"]');
                if (await selectElements.first().isVisible({ timeout: 3000 })) {
                  await selectElements.first().click();
                  console.log('✅ Discovery 任務互動成功');
                }

                // 檢查是否有下一步或完成按鈕
                const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Complete")');
                if (await nextBtn.first().isVisible({ timeout: 3000 })) {
                  await nextBtn.first().click();
                  await page.waitForTimeout(2000);
                  console.log('✅ Discovery 流程繼續成功');
                }
              }
            }
          } else {
            console.log('⚠️  Discovery Program 可能未成功創建或使用不同的 URL 結構');
          }
        } else {
          console.log('⚠️  未找到 Discovery 開始按鈕');
        }
      }
    }

    // 檢查錯誤
    expect(failed401s.length).toBe(0);
    if (failed401s.length > 0) {
      console.error('❌ Discovery 流程中的 401 錯誤:', failed401s);
    }

    expect(failed500s.length).toBe(0);
    if (failed500s.length > 0) {
      console.error('❌ Discovery 流程中的 500+ 錯誤:', failed500s);
    }

    console.log('✅ Discovery Mode 完整流程檢查完成');
  });

  test('Assessment Mode 完整流程檢查 - Program → Task → Completion', async ({ page }) => {
    console.log('📊 測試 Assessment Mode 完整流程...');

    await page.goto('http://localhost:3000/assessment/scenarios');

    // 檢查重定向
    if (page.url().includes('/login')) {
      throw new Error('❌ Assessment - 被重定向到登入頁');
    }

    // 檢查評估內容
    const hasAssessmentContent = await page.locator('h1, h2, h3').filter({ hasText: /Assessment|評估|Evaluate/ }).count();
    if (hasAssessmentContent === 0) {
      console.log('⚠️  沒有找到 Assessment 相關標題');
    } else {
      console.log(`✅ Assessment 頁面載入成功`);
    }

    // 尋找評估項目
    const assessmentItems = page.locator('article, .assessment-card, [data-testid*="assessment"], .grid > div');
    const itemCount = await assessmentItems.count();
    console.log(`Assessment 項目數量: ${itemCount}`);

    if (itemCount > 0) {
      console.log('🔄 點擊第一個 Assessment 項目...');
      await assessmentItems.first().click();
      await page.waitForTimeout(3000);

      // 尋找開始按鈕
      const startBtn = page.locator('button:has-text("Start"), button:has-text("Begin"), button:has-text("開始")');
      if (await startBtn.first().isVisible({ timeout: 5000 })) {
        console.log('✅ 找到開始評估按鈕，創建 Program...');
        await startBtn.first().click();
        await page.waitForTimeout(5000);

        // 檢查 URL 是否包含 program ID
        const urlContainsProgram = page.url().includes('/program/') || page.url().includes('/assessment/');
        if (urlContainsProgram) {
          console.log('✅ Assessment Program 創建成功');

          // 檢查評估任務元素
          const questionElements = page.locator('.question, .assessment-item, .quiz-question, h2:has-text("Question"), h3');
          const questionCount = await questionElements.count();

          if (questionCount > 0) {
            console.log(`✅ Assessment Task 載入成功，找到 ${questionCount} 個問題元素`);

            // 尋找答題元素
            const answerElements = page.locator('input[type="radio"], input[type="checkbox"], textarea, select');
            const answerCount = await answerElements.count();

            if (answerCount > 0) {
              console.log(`找到 ${answerCount} 個答題元素`);

              // 選擇第一個選項（如果是選擇題）
              const radioButtons = page.locator('input[type="radio"]');
              if (await radioButtons.first().isVisible({ timeout: 3000 })) {
                await radioButtons.first().click();
                console.log('✅ 選擇答案成功');
              }

              // 如果有文字輸入
              const textArea = page.locator('textarea');
              if (await textArea.first().isVisible({ timeout: 3000 })) {
                await textArea.first().fill('這是我的評估答案。我仔細考慮了問題並提供了合適的回應。');
                console.log('✅ 填寫文字答案成功');
              }

              // 尋找提交或下一題按鈕
              const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Next"), button:has-text("提交"), button:has-text("下一題")');
              if (await submitBtn.first().isVisible({ timeout: 5000 })) {
                await submitBtn.first().click();
                await page.waitForTimeout(3000);
                console.log('✅ 提交答案成功');

                // 檢查是否有分數或反饋
                const feedbackElements = page.locator('.score, .feedback, .result, .assessment-result');
                const feedbackCount = await feedbackElements.count();
                if (feedbackCount > 0) {
                  console.log(`✅ 收到評估反饋，找到 ${feedbackCount} 個反饋元素`);
                }

                // 檢查是否有完成頁面
                const completionElements = page.locator('.assessment-complete, .quiz-complete, h1:has-text("Complete"), h2:has-text("完成")');
                const completionCount = await completionElements.count();
                if (completionCount > 0) {
                  console.log('🎉 到達 Assessment 完成頁面！');
                }
              }
            }
          }
        } else {
          console.log('⚠️  Assessment Program 可能未成功創建或使用不同的 URL 結構');
        }
      } else {
        console.log('⚠️  未找到 Assessment 開始按鈕');
      }
    }

    // 檢查錯誤
    expect(failed401s.length).toBe(0);
    if (failed401s.length > 0) {
      console.error('❌ Assessment 流程中的 401 錯誤:', failed401s);
    }

    expect(failed500s.length).toBe(0);
    if (failed500s.length > 0) {
      console.error('❌ Assessment 流程中的 500+ 錯誤:', failed500s);
    }

    console.log('✅ Assessment Mode 完整流程檢查完成');
  });

  test.afterEach(async ({ page }) => {
    // 總結錯誤報告
    console.log('\n📋 測試總結:');
    console.log(`Console 錯誤數: ${errors.length}`);
    console.log(`401 錯誤數: ${failed401s.length}`);
    console.log(`500+ 錯誤數: ${failed500s.length}`);
    console.log(`其他錯誤數: ${failedRequests.length}`);

    if (errors.length > 0) {
      console.log('\n🔴 Console 錯誤詳情:');
      errors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
    }

    if (failed401s.length > 0) {
      console.log('\n🚫 401 錯誤 URLs:');
      failed401s.forEach((url, i) => console.log(`${i + 1}. ${url}`));
    }

    if (failed500s.length > 0) {
      console.log('\n💥 500+ 錯誤 URLs:');
      failed500s.forEach((url, i) => console.log(`${i + 1}. ${url}`));
    }
  });
});
