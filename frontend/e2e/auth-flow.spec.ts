import { test, expect } from "@playwright/test";

const demoStudent = {
  email: "student@example.com",
  password: "student123",
};

test.describe("Auth and Learning Flow", () => {
  test("user can register", async ({ page }) => {
    const uniqueEmail = `demo-${Date.now()}@example.com`;

    await page.goto("/register");

    await page.fill("#name", "Demo User");
    await page.fill("#email", uniqueEmail);
    await page.fill("#password", "DemoPass123!");
    await page.fill("#confirmPassword", "DemoPass123!");
    await page.check("#acceptTerms");

    await page.click('button[type="submit"]');

    await expect(page.getByTestId("register-success")).toBeVisible();
    await expect(page.getByTestId("register-success")).toContainText(
      uniqueEmail,
    );
  });

  test("guest login works without registration", async ({ page }) => {
    await page.goto("/login");

    await page.getByTestId("guest-login-button").click();
    await page.getByTestId("guest-login-modal").waitFor();
    await page.getByTestId("guest-login-skip").click();

    await expect(page).toHaveURL(/\/pbl\/scenarios/);
    await expect(page.getByTestId("header-user-menu")).toBeVisible();
  });

  test("login shows user panel and PBL can start and continue", async ({
    page,
  }) => {
    page.on("dialog", async (dialog) => {
      await dialog.dismiss();
      throw new Error(`Unexpected dialog: ${dialog.message()}`);
    });

    await page.goto("/login");
    await page.fill("#email", demoStudent.email);
    await page.fill("#password", demoStudent.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/pbl\/scenarios/);
    await expect(page.getByTestId("header-user-menu")).toBeVisible();

    const firstScenarioLink = page.getByTestId("pbl-scenario-view").first();
    const scenarioHref = await firstScenarioLink.getAttribute("href");
    await firstScenarioLink.click();

    await expect(page.getByTestId("pbl-start-program")).toBeVisible();
    await page.getByTestId("pbl-start-program").click();

    await expect(page).toHaveURL(/\/tasks\//);

    if (scenarioHref) {
      await page.goto(scenarioHref);
    } else {
      await page.goto("/pbl/scenarios");
      await firstScenarioLink.click();
    }

    await expect(page.getByTestId("pbl-continue-program")).toBeVisible();
    await page.getByTestId("pbl-continue-program").click();

    await expect(page).toHaveURL(/\/tasks\//);

    await page.getByTestId("header-user-menu").hover();
    await page.getByTestId("header-sign-out").click();
    await expect(page.getByTestId("header-sign-in")).toBeVisible();
  });
});
