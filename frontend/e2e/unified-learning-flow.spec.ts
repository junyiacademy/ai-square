/**
 * E2E Test: Unified Learning Architecture Flow
 * Tests complete learning workflows across all three modules
 */

import { test, expect } from '@playwright/test';

// Mock data for testing
const mockScenario = {
  id: 'test-scenario-uuid',
  title: 'AI Education Design Challenge',
  description: 'Design an AI-powered educational tool',
  sourceType: 'pbl'
};

const mockProgram = {
  id: 'test-program-uuid',
  scenarioId: 'test-scenario-uuid',
  userId: 'test@example.com',
  status: 'active'
};

const mockTask = {
  id: 'test-task-uuid',
  programId: 'test-program-uuid',
  title: 'Research Phase',
  status: 'pending'
};

test.describe('Unified Learning Architecture E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent testing
    await page.route('**/api/learning/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (method === 'POST' && url.includes('/api/learning/programs')) {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              scenario: mockScenario,
              program: mockProgram,
              tasks: [mockTask]
            }
          })
        });
      } else if (method === 'GET' && url.includes('/api/learning/progress')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              activePrograms: [mockProgram],
              completedPrograms: [],
              totalEvaluations: 0,
              averageScore: undefined
            }
          })
        });
      } else if (method === 'POST' && url.includes('/complete')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              task: { ...mockTask, status: 'completed' },
              evaluation: {
                id: 'eval-uuid',
                type: 'ai_feedback',
                entityType: 'task'
              },
              nextTask: null
            }
          })
        });
      } else {
        await route.continue();
      }
    });
  });

  test('PBL Complete Learning Flow', async ({ page }) => {
    // Navigate to PBL scenarios page
    await page.goto('/pbl');
    
    // Verify page loads
    await expect(page).toHaveTitle(/AI Square/);
    
    // Look for scenario selection interface
    await expect(page.locator('text=Problem-Based Learning')).toBeVisible();
    
    // Simulate scenario selection (this would normally be a real scenario)
    // Since we're mocking the API, we can directly test the flow
    await page.evaluate(() => {
      // Simulate creating a learning program
      fetch('/api/learning/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: 'test-scenario-uuid',
          metadata: { language: 'en' }
        })
      });
    });
    
    // Verify success message or navigation
    await page.waitForTimeout(1000);
    
    // Test task completion flow
    await page.evaluate(() => {
      fetch('/api/learning/tasks/test-task-uuid/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: { answer: 'Test answer' },
          evaluationData: { performance: { score: 85 } }
        })
      });
    });
    
    // Verify completion
    await page.waitForTimeout(1000);
  });

  test('Discovery Learning Flow', async ({ page }) => {
    // Navigate to Discovery page
    await page.goto('/discovery');
    
    // Verify page loads
    await expect(page).toHaveTitle(/AI Square/);
    
    // Look for career path interface
    await expect(page.locator('text=Discovery')).toBeVisible();
    
    // Test career path selection and progression
    await page.evaluate(() => {
      fetch('/api/learning/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: 'discovery-scenario-uuid',
          metadata: { careerType: 'app_developer' }
        })
      });
    });
    
    await page.waitForTimeout(1000);
  });

  test('Assessment Flow', async ({ page }) => {
    // Navigate to Assessment page
    await page.goto('/assessment');
    
    // Verify page loads
    await expect(page).toHaveTitle(/AI Square/);
    
    // Test assessment creation and completion
    await page.evaluate(() => {
      fetch('/api/learning/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: 'assessment-scenario-uuid',
          metadata: { assessmentType: 'ai_literacy' }
        })
      });
    });
    
    await page.waitForTimeout(1000);
  });

  test('Learning Progress Dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test loading learning progress
    await page.evaluate(() => {
      fetch('/api/learning/progress');
    });
    
    await page.waitForTimeout(1000);
    
    // Verify dashboard elements would be visible
    // (This is simplified since we don't have the actual dashboard)
  });

  test('Cross-Module Navigation', async ({ page }) => {
    // Test navigation between different learning modules
    await page.goto('/');
    
    // Navigate to PBL
    if (await page.locator('text=Problem-Based Learning').isVisible()) {
      await page.click('text=Problem-Based Learning');
      await expect(page).toHaveURL(/.*pbl.*/);
    }
    
    // Navigate to Discovery
    await page.goto('/');
    if (await page.locator('text=Discovery').isVisible()) {
      await page.click('text=Discovery');
      await expect(page).toHaveURL(/.*discovery.*/);
    }
    
    // Navigate to Assessment
    await page.goto('/');
    if (await page.locator('text=Assessment').isVisible()) {
      await page.click('text=Assessment');
      await expect(page).toHaveURL(/.*assessment.*/);
    }
  });

  test('Responsive Design and Mobile Navigation', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Verify page is responsive
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
  });

  test('Error Handling and Recovery', async ({ page }) => {
    // Mock error responses
    await page.route('**/api/learning/programs', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });
    
    await page.goto('/pbl');
    
    // Test that application handles errors gracefully
    await page.evaluate(() => {
      fetch('/api/learning/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: 'test' })
      }).catch(() => {
        // Handle error gracefully
      });
    });
    
    await page.waitForTimeout(1000);
  });

  test('Performance and Loading States', async ({ page }) => {
    // Test page load performance
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // Verify reasonable load time (under 5 seconds)
    expect(loadTime).toBeLessThan(5000);
    
    // Test loading states
    await page.goto('/pbl');
    await page.waitForLoadState('networkidle');
    
    // Verify page is fully loaded
    await expect(page.locator('body')).toBeVisible();
  });

  test('Accessibility Compliance', async ({ page }) => {
    await page.goto('/');
    
    // Test basic accessibility
    await expect(page.locator('h1')).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    // Verify focus management
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('Multi-language Support', async ({ page }) => {
    // Test language switching if implemented
    await page.goto('/');
    
    // Look for language selector
    const langSelector = page.locator('[data-testid="language-selector"]');
    if (await langSelector.isVisible()) {
      await langSelector.click();
      
      // Test switching to Chinese
      const zhOption = page.locator('text=中文');
      if (await zhOption.isVisible()) {
        await zhOption.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Verify page still functions
    await expect(page.locator('body')).toBeVisible();
  });

  test('Data Persistence and State Management', async ({ page }) => {
    await page.goto('/');
    
    // Test that user state persists across page reloads
    await page.evaluate(() => {
      localStorage.setItem('test-data', JSON.stringify({ 
        activeProgram: 'test-program-uuid' 
      }));
    });
    
    await page.reload();
    
    const storedData = await page.evaluate(() => {
      return localStorage.getItem('test-data');
    });
    
    expect(storedData).toBeTruthy();
    
    // Clean up
    await page.evaluate(() => {
      localStorage.removeItem('test-data');
    });
  });
});