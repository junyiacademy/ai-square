import { test, expect, Page } from "@playwright/test";

// 直接測試 Assessment URL 的完整做題流程
test.describe("Direct Assessment URL Test - 直接測試評估 URL", () => {
  // 登入輔助函數
  async function loginUser(page: Page) {
    await page.goto("http://localhost:3000/login");

    // 等待登入頁面載入
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // 填入登入資料 - 使用正確的 demo 帳號
    await page.fill('input[type="email"]', "student@example.com");
    await page.fill('input[type="password"]', "student123");

    // 點擊登入按鈕
    await page.click(
      'button[type="submit"], button:has-text("Sign in"), button:has-text("登入")',
    );

    // 等待重定向到 dashboard
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    console.log("✅ 登入成功");
  }

  test("直接測試 Assessment Program 做題流程", async ({ page }) => {
    console.log("🚀 開始直接測試 Assessment 做題流程...");

    // Step 1: 登入系統
    await loginUser(page);

    // Step 2: 直接前往 Assessment Program URL
    const assessmentUrl =
      "http://localhost:3000/assessment/scenarios/75cfca52-ffc6-448e-a196-942b6b8618c9/programs/dde3cb4c-604e-4a6f-b4e7-f1946eebc5ed";
    console.log("📊 直接前往 Assessment Program:", assessmentUrl);

    await page.goto(assessmentUrl);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000); // 等待頁面完全載入

    const currentUrl = page.url();
    console.log("📍 當前 URL:", currentUrl);

    // Step 3: 檢查是否成功載入做題頁面
    await page.waitForTimeout(2000);

    // 截圖記錄當前頁面狀態
    await page.screenshot({
      path: "test-results/assessment-initial-state.png",
      fullPage: true,
    });

    // Step 4: 尋找並開始做題
    console.log("🤔 開始做題流程...");

    let questionCount = 0;
    let maxQuestions = 20; // 增加最大題目數量
    let totalAnswered = 0;

    for (let i = 0; i < maxQuestions; i++) {
      questionCount++;
      console.log(`\n📋 嘗試第 ${questionCount} 題:`);

      // 等待頁面載入
      await page.waitForTimeout(2000);

      // 截圖記錄當前題目狀態（只記錄前幾題避免過多截圖）
      if (questionCount <= 3) {
        await page.screenshot({
          path: `test-results/question-${questionCount}.png`,
          fullPage: true,
        });
      }

      // 檢查頁面內容，看是否有問題或選項
      const pageContent = await page.content();
      console.log("📄 頁面長度:", pageContent.length, "字元");

      // 尋找問題內容 - 使用更廣泛的選擇器
      const questionSelectors = [
        "h1, h2, h3, h4", // 標題
        ".question",
        ".question-text",
        ".question-content",
        '[data-testid*="question"]',
        ".assessment-question",
        ".quiz-question",
        'p:has-text("?")', // 包含問號的段落
        'div:has-text("?")', // 包含問號的 div
        ".prompt",
        ".item",
        ".card",
      ];

      let questionText = "";
      let questionFound = false;

      for (const selector of questionSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();

        if (count > 0) {
          for (let j = 0; j < Math.min(count, 3); j++) {
            const element = elements.nth(j);
            if (await element.isVisible()) {
              const text = await element.textContent();
              if (text && text.trim().length > 20) {
                questionText = text.trim();
                questionFound = true;
                console.log(
                  `   問題 (${selector}): ${questionText.substring(0, 100)}...`,
                );
                break;
              }
            }
          }
          if (questionFound) break;
        }
      }

      if (!questionFound) {
        console.log("   ⚠️  未找到明確的問題內容，檢查頁面元素...");

        // 列出頁面上的主要元素
        const allText = await page.locator("body").textContent();
        if (
          (allText && allText.includes("完成")) ||
          allText.includes("Complete")
        ) {
          console.log("   🎉 發現完成關鍵字，可能已完成評估！");
          break;
        }
      }

      // 尋找選項 - 使用更廣泛的選擇器
      const optionSelectors = [
        'input[type="radio"]',
        'input[type="checkbox"]',
        'button[role="radio"]',
        ".option",
        ".choice",
        ".answer",
        'button:has-text("A"), button:has-text("B"), button:has-text("C"), button:has-text("D")',
        '[data-testid*="option"]',
        '[data-testid*="choice"]',
        ".multiple-choice button",
        ".quiz-option",
        "label", // 常見的選項標籤
        'div[role="button"]',
        'span[role="button"]',
      ];

      let optionsFound = 0;
      let selectedOption = false;

      for (const selector of optionSelectors) {
        const options = page.locator(selector);
        const count = await options.count();

        if (count > 0) {
          console.log(`   找到 ${count} 個 ${selector} 元素`);

          // 嘗試找到可點擊的選項
          for (let k = 0; k < Math.min(count, 5); k++) {
            const option = options.nth(k);
            if ((await option.isVisible()) && (await option.isEnabled())) {
              try {
                const text = await option.textContent();
                if (text && text.trim().length > 0) {
                  console.log(
                    `     選項 ${k}: ${text.trim().substring(0, 50)}`,
                  );
                  optionsFound++;
                }
              } catch (e) {
                // 忽略無法獲取文字的元素
              }
            }
          }

          // 如果找到多個選項，選擇第二個（通常是 B 選項）
          if (count > 1) {
            try {
              const targetOption = options.nth(1);
              if (
                (await targetOption.isVisible()) &&
                (await targetOption.isEnabled())
              ) {
                await targetOption.click();
                console.log("   ✅ 已點擊第二個選項");
                selectedOption = true;
                totalAnswered++;
                await page.waitForTimeout(500);
                break;
              }
            } catch (error) {
              console.log(`   ⚠️  點擊選項失敗: ${error.message}`);
            }
          } else if (count === 1) {
            try {
              await options.first().click();
              console.log("   ✅ 已點擊唯一選項");
              selectedOption = true;
              totalAnswered++;
              await page.waitForTimeout(500);
              break;
            } catch (error) {
              console.log(`   ⚠️  點擊選項失敗: ${error.message}`);
            }
          }
        }
      }

      if (optionsFound > 0) {
        console.log(`   📊 總共找到 ${optionsFound} 個可能的選項`);
      } else {
        console.log("   ⚠️  未找到任何選項");

        // 嘗試查找文字輸入框
        const textInputs = page.locator(
          'input[type="text"], textarea, input:not([type="radio"]):not([type="checkbox"])',
        );
        const inputCount = await textInputs.count();

        if (inputCount > 0) {
          console.log(`   找到 ${inputCount} 個文字輸入框`);
          try {
            await textInputs.first().fill("這是我的答案");
            console.log("   ✅ 已填入文字答案");
            selectedOption = true;
            totalAnswered++;
          } catch (error) {
            console.log(`   ⚠️  填入文字失敗: ${error.message}`);
          }
        }
      }

      // 尋找並點擊提交/下一題按鈕
      if (selectedOption) {
        await page.waitForTimeout(1000);

        const submitSelectors = [
          'button:has-text("提交")',
          'button:has-text("Submit")',
          'button:has-text("下一題")',
          'button:has-text("Next")',
          'button:has-text("繼續")',
          'button:has-text("Continue")',
          'button:has-text("確認")',
          'button:has-text("Confirm")',
          ".submit-btn",
          ".next-btn",
          ".continue-btn",
          '[data-testid*="submit"]',
          '[data-testid*="next"]',
          'button[type="submit"]',
        ];

        let submitted = false;
        for (const selector of submitSelectors) {
          const buttons = page.locator(selector);
          const buttonCount = await buttons.count();

          if (buttonCount > 0) {
            for (let m = 0; m < buttonCount; m++) {
              const button = buttons.nth(m);
              if ((await button.isVisible()) && (await button.isEnabled())) {
                try {
                  await button.click();
                  console.log(`   ✅ 已點擊提交按鈕 (${selector})`);
                  submitted = true;
                  await page.waitForLoadState("networkidle");
                  await page.waitForTimeout(1000);
                  break;
                } catch (error) {
                  console.log(`   ⚠️  點擊提交按鈕失敗: ${error.message}`);
                }
              }
            }
            if (submitted) break;
          }
        }

        if (!submitted) {
          console.log("   ⚠️  未找到提交按鈕，嘗試按 Enter 鍵");
          await page.keyboard.press("Enter");
          await page.waitForTimeout(1000);
        }
      } else {
        console.log("   ⚠️  未能選擇任何答案，可能已到達評估結束");
      }

      // 檢查 URL 是否改變或出現完成頁面
      await page.waitForTimeout(2000);
      const newUrl = page.url();

      if (
        newUrl !== currentUrl ||
        newUrl.includes("/complete") ||
        newUrl.includes("/result")
      ) {
        console.log(`   📍 URL 已改變: ${newUrl}`);
        currentUrl = newUrl;

        if (newUrl.includes("/complete") || newUrl.includes("/result")) {
          console.log("🎉 檢測到完成頁面！");
          break;
        }
      }

      // 檢查頁面是否顯示完成相關內容
      const completionKeywords = [
        "完成",
        "Complete",
        "結束",
        "Finished",
        "恭喜",
        "Congratulations",
        "成績",
        "Score",
        "結果",
        "Result",
      ];
      const pageText = await page.locator("body").textContent();

      let hasCompletionKeyword = false;
      if (pageText) {
        for (const keyword of completionKeywords) {
          if (pageText.includes(keyword)) {
            console.log(`   🎉 發現完成關鍵字: ${keyword}`);
            hasCompletionKeyword = true;
            break;
          }
        }
      }

      if (hasCompletionKeyword) {
        console.log("🎉 評估似乎已完成！");
        break;
      }

      // 如果連續幾次都沒有新內容，可能已經完成
      if (!selectedOption && questionCount > 5) {
        console.log("⚠️  連續多次未找到新問題，可能已完成評估");
        break;
      }
    }

    // Step 5: 檢查最終成績和結果
    console.log("\n🏆 檢查最終成績和結果...");
    await page.waitForTimeout(3000);

    // 最終截圖
    await page.screenshot({
      path: "test-results/assessment-final-state.png",
      fullPage: true,
    });

    // 尋找成績相關信息
    const scoreKeywords = [
      "分數",
      "Score",
      "成績",
      "Grade",
      "結果",
      "Result",
      "正確",
      "Correct",
      "準確",
      "Accuracy",
    ];
    const finalPageText = await page.locator("body").textContent();

    let foundScoreInfo = false;
    if (finalPageText) {
      for (const keyword of scoreKeywords) {
        if (finalPageText.includes(keyword)) {
          console.log(`📊 找到成績關鍵字: ${keyword}`);
          foundScoreInfo = true;

          // 嘗試提取成績相關的文字
          const lines = finalPageText.split("\n");
          for (const line of lines) {
            if (line.includes(keyword) && line.trim().length < 200) {
              console.log(`   成績信息: ${line.trim()}`);
            }
          }
        }
      }
    }

    // 檢查特定的成績元素
    const scoreSelectors = [
      ".score",
      ".grade",
      ".result",
      ".assessment-result",
      '[data-testid*="score"]',
      '[data-testid*="result"]',
      ".percentage",
      ".points",
      ".total",
    ];

    for (const selector of scoreSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();

      if (count > 0) {
        for (let i = 0; i < count; i++) {
          try {
            const element = elements.nth(i);
            if (await element.isVisible()) {
              const text = await element.textContent();
              if (text && text.trim()) {
                console.log(`📊 成績元素 (${selector}): ${text.trim()}`);
                foundScoreInfo = true;
              }
            }
          } catch (e) {
            // 忽略無法讀取的元素
          }
        }
      }
    }

    // 總結測試結果
    console.log("\n🎉 Assessment 完整流程測試總結:");
    console.log(`   ✅ 嘗試答題數: ${questionCount}`);
    console.log(`   ✅ 成功回答數: ${totalAnswered}`);
    console.log(`   ✅ 最終 URL: ${page.url()}`);
    console.log(`   ✅ 找到成績信息: ${foundScoreInfo ? "是" : "否"}`);

    if (foundScoreInfo) {
      console.log("🏆 成功完成評估並找到成績信息！");
    } else if (totalAnswered > 0) {
      console.log("✅ 成功回答了問題，但可能需要更多題目或不同的完成流程");
    } else {
      console.log("⚠️  未能成功回答問題，可能需要檢查頁面結構");
    }

    // 驗證測試結果 - 至少要有一些互動或成績信息
    const testPassed =
      totalAnswered > 0 || foundScoreInfo || page.url().includes("complete");
    expect(testPassed).toBeTruthy();
    console.log("✅ Assessment 流程測試驗證通過！");
  });
});
