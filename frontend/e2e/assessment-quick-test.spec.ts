import { test, expect } from "@playwright/test";

test.describe("Assessment Quick Test", () => {
  test.setTimeout(60000); // 1 minute timeout

  test("should test assessment completion flow", async ({ page }) => {
    const baseUrl = "https://ai-square-staging-731209836128.asia-east1.run.app";
    const scenarioId = "078f8bbe-d004-4d3f-b74f-cb8fe8630898";

    // Track errors and 401s
    const consoleErrors: string[] = [];
    const failed401s: string[] = [];
    const apiCalls: Array<{ url: string; status: number; method: string }> = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("response", (response) => {
      const url = response.url();
      const status = response.status();
      const method = response.request().method();

      apiCalls.push({ url, status, method });

      if (status === 401) {
        failed401s.push(`${method} ${url}`);
      }
    });

    console.log("🚀 Starting Assessment Quick Test");

    try {
      // Step 1: Login
      console.log("📝 Step 1: Login");
      await page.goto(`${baseUrl}/login`);
      await page.waitForTimeout(2000);

      await page.fill('input[name="email"]', "student@example.com");
      await page.fill('input[name="password"]', "student123");

      const loginButton = page.locator('button[type="submit"]');
      await loginButton.click();
      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      console.log(`After login URL: ${currentUrl}`);

      // Step 2: Check assessment API directly
      console.log("🔗 Step 2: Testing Assessment APIs");

      // Test create program API
      const createResponse = await page.request.post(
        `${baseUrl}/api/assessment/scenarios/${scenarioId}/programs`,
        {
          data: { action: "start" },
        },
      );

      console.log(`Create program API status: ${createResponse.status()}`);

      if (createResponse.ok()) {
        const programData = await createResponse.json();
        console.log("✅ Program created:", programData.program?.id);

        const programId = programData.program?.id;
        if (programId) {
          // Test completion API
          console.log("🎯 Testing completion API");
          const completionResponse = await page.request.post(
            `${baseUrl}/api/assessment/programs/${programId}/complete`,
          );

          console.log(`Completion API status: ${completionResponse.status()}`);

          if (completionResponse.ok()) {
            const completionData = await completionResponse.json();
            console.log("✅ Completion successful:", completionData.success);

            // Navigate to completion page
            await page.goto(
              `${baseUrl}/assessment/scenarios/${scenarioId}/program/${programId}/complete`,
            );
            await page.waitForTimeout(2000);

            const completionPageUrl = page.url();
            console.log(`Completion page URL: ${completionPageUrl}`);
          } else {
            const errorText = await completionResponse.text();
            console.log("❌ Completion API failed:", errorText);
          }
        }
      } else {
        const errorText = await createResponse.text();
        console.log("❌ Create program API failed:", errorText);
      }
    } catch (error) {
      console.error("❌ Test error:", error.message);
    }

    // Report results
    console.log("\n📊 Test Results:");
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`401 Auth Failures: ${failed401s.length}`);

    if (consoleErrors.length > 0) {
      console.log("Console Errors:", consoleErrors.slice(0, 3));
    }

    if (failed401s.length > 0) {
      console.log("Auth Failures:", failed401s.slice(0, 3));
    }

    // Show assessment-related API calls
    const assessmentAPIs = apiCalls.filter(
      (api) =>
        api.url.includes("/api/assessment") || api.url.includes("/api/auth"),
    );

    console.log("\n🔗 Assessment API Calls:");
    assessmentAPIs.forEach((api) => {
      const icon = api.status < 400 ? "✅" : "❌";
      console.log(
        `  ${icon} ${api.method} ${api.status} - ${api.url.split("/").slice(-3).join("/")}`,
      );
    });

    // Assertions
    expect(failed401s.length).toBe(0);

    console.log("\n✅ Assessment Quick Test Completed");
  });
});
