import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3004";

test.describe("Assessment Completion Debug", () => {
  test("Complete assessment flow and check completion generation", async ({
    page,
  }) => {
    const errors: string[] = [];
    const failed401s: string[] = [];

    // Monitor console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Monitor failed authentication
    page.on("response", (response) => {
      if (response.status() === 401) {
        failed401s.push(response.url());
      }
    });

    // Step 1: Login
    console.log("🔐 Step 1: Login with demo account");
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "student@example.com");
    await page.fill('input[type="password"]', "student123");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Verify login successful
    const currentUrl = page.url();
    console.log("📍 Current URL after login:", currentUrl);

    // Check for authentication
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === "accessToken");
    console.log("🍪 Access token present:", !!accessToken);

    // Step 2: Go to Assessment
    console.log("📝 Step 2: Navigate to Assessment");
    await page.goto(`${BASE_URL}/assessment/scenarios`);
    await page.waitForTimeout(3000);

    // Check if assessments loaded
    const assessmentTitle = page.locator("h1, h2, .title").first();
    const titleText = await assessmentTitle.textContent().catch(() => "");
    console.log("📋 Assessment page title:", titleText);

    // Step 3: Start an assessment
    console.log("🚀 Step 3: Start an assessment");
    const startButton = page
      .locator("button, a")
      .filter({ hasText: /start|開始|begin/i })
      .first();
    const startButtonExists = await startButton.isVisible();
    console.log("🔘 Start button visible:", startButtonExists);

    if (startButtonExists) {
      await startButton.click();
      await page.waitForTimeout(3000);

      console.log("📍 URL after starting assessment:", page.url());
    }

    // Step 4: Try to access completion page directly to test the API
    console.log("🎯 Step 4: Test completion API directly");

    // Get scenario ID (assume first scenario)
    const apiResponse = await page.request.get(
      `${BASE_URL}/api/assessment/scenarios?lang=en`,
    );
    const scenarios = await apiResponse.json().catch(() => []);
    console.log("📊 Available scenarios:", scenarios.length);

    if (scenarios.length > 0) {
      const scenarioId = scenarios[0].id;
      console.log("🎯 Testing scenario ID:", scenarioId);

      // Try to create a program
      console.log("📋 Step 5: Create assessment program");
      const programResponse = await page.request.post(
        `${BASE_URL}/api/assessment/scenarios/${scenarioId}/start`,
        {
          data: { userId: "test-user" },
        },
      );

      console.log("📝 Program creation status:", programResponse.status());

      if (programResponse.ok()) {
        const programData = await programResponse.json();
        const programId = programData.program?.id;
        console.log("✅ Program created with ID:", programId);

        if (programId) {
          // Test completion endpoint
          console.log("🏁 Step 6: Test completion endpoint");
          const completionResponse = await page.request.post(
            `${BASE_URL}/api/assessment/programs/${programId}/complete`,
          );

          console.log("🎉 Completion API status:", completionResponse.status());

          if (completionResponse.ok()) {
            const completionData = await completionResponse.json();
            console.log(
              "✅ Completion successful:",
              !!completionData.evaluation,
            );
            console.log(
              "📊 Evaluation data:",
              JSON.stringify(completionData, null, 2),
            );
          } else {
            const errorText = await completionResponse.text();
            console.error("❌ Completion failed:", errorText);
          }

          // Try accessing completion page
          console.log("🌐 Step 7: Test completion page");
          await page.goto(
            `${BASE_URL}/assessment/scenarios/${scenarioId}/programs/${programId}/complete`,
          );
          await page.waitForTimeout(5000);

          console.log("📍 Final URL:", page.url());

          // Check for completion content
          const pageContent = await page.textContent("body");
          const hasResults =
            pageContent?.includes("results") ||
            pageContent?.includes("評估結果") ||
            pageContent?.includes("completed");
          console.log("📋 Page has results content:", hasResults);
        }
      } else {
        const errorText = await programResponse.text();
        console.error("❌ Program creation failed:", errorText);
      }
    }

    // Final error report
    console.log("🚨 Console errors:", errors.length);
    if (errors.length > 0) {
      console.log("❌ Errors found:", errors);
    }

    console.log("🔒 401 errors:", failed401s.length);
    if (failed401s.length > 0) {
      console.log("❌ Auth failures:", failed401s);
    }

    // Test should not have critical errors
    expect(errors.length).toBe(0);
    expect(failed401s.length).toBe(0);
  });
});
