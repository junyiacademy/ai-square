import { test, expect } from "@playwright/test";

test.describe("SQL Injection Prevention Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3004");
  });

  test("should prevent SQL injection in login form", async ({ page }) => {
    await page.goto("http://localhost:3004/auth/login");

    // Try various SQL injection patterns
    const sqlInjectionPatterns = [
      "' OR '1'='1",
      "admin'--",
      "'; DROP TABLE users;--",
      "1' UNION SELECT * FROM users--",
      "admin' OR '1'='1'/*",
      "') OR '1'='1'--",
      "' OR 1=1--",
      '" OR "1"="1',
      "' OR '1'='1' /*",
    ];

    for (const pattern of sqlInjectionPatterns) {
      await page.fill('input[name="email"]', pattern);
      await page.fill('input[name="password"]', pattern);
      await page.click('button[type="submit"]');

      // Should not succeed or cause errors
      await expect(page.locator("text=Invalid credentials")).toBeVisible({
        timeout: 5000,
      });

      // Check that we're still on login page
      await expect(page).toHaveURL(/.*\/auth\/login/);
    }
  });

  test("should sanitize SQL injection in search parameters", async ({
    page,
  }) => {
    const injectionPatterns = [
      "'; DROP TABLE scenarios;--",
      "1' OR '1'='1",
      '" OR 1=1--',
    ];

    for (const pattern of injectionPatterns) {
      // Test search endpoints
      const response = await page.goto(
        `http://localhost:3004/api/pbl/scenarios?search=${encodeURIComponent(pattern)}`,
      );

      // Should return valid response, not error
      expect(response?.status()).toBeLessThan(500);

      // Check response is valid JSON
      const body = await response?.json();
      expect(body).toBeDefined();
      expect(body.error).toBeUndefined();
    }
  });

  test("should prevent SQL injection in API parameters", async ({ page }) => {
    const endpoints = [
      "/api/pbl/scenarios/",
      "/api/assessment/scenarios/",
      "/api/discovery/scenarios/",
      "/api/users/",
    ];

    const injectionId = "1' OR '1'='1";

    for (const endpoint of endpoints) {
      const response = await page.request.get(
        `http://localhost:3004${endpoint}${encodeURIComponent(injectionId)}`,
      );

      // Should return 404 or 400, not 500
      expect([400, 404, 401, 403]).toContain(response.status());

      // Should not expose database errors
      const body = await response.json();
      expect(JSON.stringify(body)).not.toContain("syntax error");
      expect(JSON.stringify(body)).not.toContain("PostgreSQL");
      expect(JSON.stringify(body)).not.toContain("column");
      expect(JSON.stringify(body)).not.toContain("table");
    }
  });

  test("should use parameterized queries in database calls", async ({
    page,
  }) => {
    // This test verifies that the API uses parameterized queries
    // by attempting to inject SQL through various input methods

    const testData = {
      title: "Test'; DROP TABLE test;--",
      description: "'); DELETE FROM users WHERE '1'='1",
      content: '" OR 1=1--',
    };

    // Attempt to create a scenario with SQL injection in data
    const response = await page.request.post(
      "http://localhost:3004/api/pbl/scenarios",
      {
        data: testData,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    // Should either require auth or reject invalid data, but not SQL error
    expect([400, 401, 403, 422]).toContain(response.status());

    // Verify no SQL error messages in response
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("syntax error");
    expect(JSON.stringify(body)).not.toContain("SQL");
  });

  test("should escape special characters in user input", async ({ page }) => {
    // Test that special SQL characters are properly escaped
    const specialChars = [
      { input: "Test's data", desc: "Single quote" },
      { input: 'Test"s data', desc: "Double quote" },
      { input: "Test\\data", desc: "Backslash" },
      { input: "Test;data", desc: "Semicolon" },
      { input: "Test--data", desc: "SQL comment" },
      { input: "Test/*data*/", desc: "Multi-line comment" },
    ];

    for (const testCase of specialChars) {
      const response = await page.request.get(
        `http://localhost:3004/api/pbl/scenarios?search=${encodeURIComponent(testCase.input)}`,
      );

      // Should handle special characters gracefully
      expect(response.status()).toBeLessThan(500);

      const body = await response.json();
      expect(body).toBeDefined();

      // If data is returned, it should be properly escaped
      if (body.data) {
        expect(body.error).toBeUndefined();
      }
    }
  });
});
