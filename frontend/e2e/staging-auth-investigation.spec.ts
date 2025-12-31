import { test, expect } from "@playwright/test";

test.describe("Staging Authentication Investigation", () => {
  const STAGING_URL =
    "https://ai-square-staging-731209836128.asia-east1.run.app";

  test("Investigate authentication redirect loop on staging", async ({
    page,
  }) => {
    console.log("🔍 Starting staging authentication investigation...");

    // Enable detailed logging
    page.on("console", (msg) =>
      console.log(`🌐 Browser Console: ${msg.text()}`),
    );
    page.on("request", (request) =>
      console.log(`📤 Request: ${request.method()} ${request.url()}`),
    );
    page.on("response", (response) =>
      console.log(`📥 Response: ${response.status()} ${response.url()}`),
    );

    // Step 1: Try to access protected route directly
    console.log("📋 Step 1: Accessing /assessment/scenarios directly...");
    await page.goto(`${STAGING_URL}/assessment/scenarios`);

    // Wait a bit for any redirects
    await page.waitForTimeout(3000);

    const currentUrl1 = page.url();
    console.log(`🔗 Current URL after direct access: ${currentUrl1}`);

    // Check if we got redirected to login
    if (currentUrl1.includes("/login")) {
      console.log(
        "✅ Expected behavior: Redirected to login page for unauthenticated access",
      );
    } else {
      console.log("⚠️ Unexpected: No redirect to login page");
    }

    // Step 2: Login process
    console.log("📋 Step 2: Attempting to login...");

    // Go to login page if not already there
    if (!currentUrl1.includes("/login")) {
      await page.goto(`${STAGING_URL}/login`);
      await page.waitForTimeout(2000);
    }

    // Fill login form
    await page.fill(
      'input[type="email"], input[name="email"]',
      "student@example.com",
    );
    await page.fill(
      'input[type="password"], input[name="password"]',
      "student123",
    );

    // Click submit button
    await page.click(
      'button[type="submit"], button:has-text("Sign in"), button:has-text("Login")',
    );

    // Wait for login response
    await page.waitForTimeout(5000);

    const currentUrl2 = page.url();
    console.log(`🔗 Current URL after login: ${currentUrl2}`);

    // Check cookies after login
    const cookies = await page.context().cookies();
    console.log("🍪 Cookies after login:");
    cookies.forEach((cookie) => {
      console.log(
        `  ${cookie.name}: ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? "..." : ""}`,
      );
    });

    // Step 3: Check authentication status
    console.log("📋 Step 3: Checking authentication status...");

    // Try to check auth API
    try {
      const authResponse = await page.goto(`${STAGING_URL}/api/auth/check`);
      const authData = await authResponse.json();
      console.log("✅ Auth check API response:", authData);
    } catch (error) {
      console.log("❌ Error checking auth API:", error.message);
    }

    // Step 4: Try to access protected route again
    console.log("📋 Step 4: Accessing /assessment/scenarios after login...");
    await page.goto(`${STAGING_URL}/assessment/scenarios`);
    await page.waitForTimeout(5000);

    const currentUrl3 = page.url();
    console.log(`🔗 Current URL after login attempt: ${currentUrl3}`);

    // Check if we're still being redirected
    if (currentUrl3.includes("/login")) {
      console.log(
        "🚨 PROBLEM CONFIRMED: Still redirected to login after successful login!",
      );

      // Take screenshot for debugging
      await page.screenshot({
        path: "staging-auth-problem.png",
        fullPage: true,
      });
      console.log("📸 Screenshot saved as staging-auth-problem.png");

      // Check browser developer tools
      console.log("🔍 Checking browser storage...");

      // Check localStorage
      const localStorage = await page.evaluate(() => {
        const storage: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            storage[key] = window.localStorage.getItem(key) || "";
          }
        }
        return storage;
      });
      console.log("💾 localStorage:", localStorage);

      // Check sessionStorage
      const sessionStorage = await page.evaluate(() => {
        const storage: Record<string, string> = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) {
            storage[key] = window.sessionStorage.getItem(key) || "";
          }
        }
        return storage;
      });
      console.log("🗄️ sessionStorage:", sessionStorage);
    } else {
      console.log(
        "✅ SUCCESS: Successfully accessed protected route after login",
      );

      // Check what's displayed on the page
      const pageTitle = await page.title();
      const h1Text = await page.textContent("h1").catch(() => "No h1 found");
      console.log(`📄 Page title: ${pageTitle}`);
      console.log(`📝 H1 content: ${h1Text}`);
    }

    // Step 5: Test session persistence with page refresh
    console.log("📋 Step 5: Testing session persistence with page refresh...");
    await page.reload();
    await page.waitForTimeout(3000);

    const currentUrl4 = page.url();
    console.log(`🔗 Current URL after page refresh: ${currentUrl4}`);

    if (currentUrl4.includes("/login")) {
      console.log("🚨 PROBLEM: Session lost after page refresh!");
    } else {
      console.log("✅ SUCCESS: Session persisted after page refresh");
    }

    // Final summary
    console.log("\n📊 INVESTIGATION SUMMARY:");
    console.log("================================");
    console.log(`Direct access URL: ${currentUrl1}`);
    console.log(`After login URL: ${currentUrl2}`);
    console.log(`Protected route URL: ${currentUrl3}`);
    console.log(`After refresh URL: ${currentUrl4}`);
    console.log(`Cookies count: ${cookies.length}`);
    console.log(`localStorage keys: ${Object.keys(localStorage || {}).length}`);
    console.log(
      `sessionStorage keys: ${Object.keys(sessionStorage || {}).length}`,
    );

    // This test should always pass - we're just investigating
    expect(true).toBe(true);
  });
});
