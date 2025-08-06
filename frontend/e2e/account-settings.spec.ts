import { test, expect } from '@playwright/test';

test.describe('Account Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'Secure123!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('should display account settings page', async ({ page }) => {
    // Navigate to account settings
    await page.goto('http://localhost:3001/account-settings');
    
    // Check page title
    await expect(page.locator('h1')).toContainText('Account Settings');
    
    // Check legal documents section
    await expect(page.locator('h2').first()).toContainText('Legal Documents');
    
    // Check for new documents requiring consent
    await expect(page.locator('text=Terms of Service')).toBeVisible();
    await expect(page.locator('text=Privacy Policy')).toBeVisible();
    
    // Check danger zone
    await expect(page.locator('text=Danger Zone')).toBeVisible();
    await expect(page.locator('text=Delete My Account')).toBeVisible();
  });

  test('should accept legal documents', async ({ page }) => {
    await page.goto('http://localhost:3001/account-settings');
    
    // Find and click the first "Review and Accept" button
    const acceptButton = page.locator('button:has-text("Review and Accept")').first();
    await acceptButton.click();
    
    // Wait for consent to be recorded
    await page.waitForTimeout(1000);
    
    // Reload page
    await page.reload();
    
    // Check that the document is now in accepted documents
    await expect(page.locator('text=Accepted Documents')).toBeVisible();
  });

  test('should show account deletion modal', async ({ page }) => {
    await page.goto('http://localhost:3001/account-settings');
    
    // Click delete account button
    await page.click('button:has-text("Delete My Account")');
    
    // Check modal appears
    await expect(page.locator('text=Confirm Account Deletion')).toBeVisible();
    
    // Check form fields
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.locator('input[type="checkbox"]')).toBeVisible();
    
    // Check buttons
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Delete My Account Forever")')).toBeVisible();
  });

  test('should cancel account deletion', async ({ page }) => {
    await page.goto('http://localhost:3001/account-settings');
    
    // Open modal
    await page.click('button:has-text("Delete My Account")');
    
    // Click cancel
    await page.click('button:has-text("Cancel")');
    
    // Modal should close
    await expect(page.locator('text=Confirm Account Deletion')).not.toBeVisible();
  });
});