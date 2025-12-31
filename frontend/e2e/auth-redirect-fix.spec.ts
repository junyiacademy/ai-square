import { test, expect } from "@playwright/test";

test.describe("Authentication Redirect Fix", () => {
  test("should NOT redirect to login when accessing protected routes after login", async ({
    page,
  }) => {
    // Navigate to login page
    await page.goto("/login");

    // Login with demo account
    await page.fill('input[name="email"]', "student@demo.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForURL("/onboarding/welcome");

    // Verify we're logged in by checking header
    await expect(page.locator("header")).toContainText("student@demo.com");

    // Now test accessing protected routes - they should NOT redirect to login
    const protectedRoutes = [
      "/discovery/overview",
      "/pbl/scenarios",
      "/assessment/scenarios",
      "/profile",
      "/dashboard",
    ];

    for (const route of protectedRoutes) {
      console.log(`Testing protected route: ${route}`);

      // Navigate to protected route
      await page.goto(route);

      // Verify we're NOT redirected to login
      await expect(page).not.toHaveURL(/\/login/);

      // Verify we're on the correct page
      await expect(page).toHaveURL(new RegExp(route));

      // Verify we're still logged in
      await expect(page.locator("header")).toContainText("student@demo.com");
    }
  });

  test("should redirect to login when accessing protected routes without authentication", async ({
    page,
  }) => {
    // Clear any existing session
    await page.context().clearCookies();

    // Try to access protected route without login
    await page.goto("/discovery/overview");

    // Should be redirected to login with redirect parameter
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdiscovery%2Foverview/);
  });

  test("should maintain session across page refreshes", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('input[name="email"]', "student@demo.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL("/onboarding/welcome");

    // Navigate to a protected route
    await page.goto("/discovery/overview");

    // Refresh the page
    await page.reload();

    // Should still be on the same page, not redirected to login
    await expect(page).toHaveURL(/\/discovery\/overview/);
    await expect(page).not.toHaveURL(/\/login/);

    // Should still show user email in header
    await expect(page.locator("header")).toContainText("student@demo.com");
  });
});
