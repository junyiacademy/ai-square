/**
 * Discovery Module Complete E2E Flow Tests
 * 包含登入、登出、完整的 Discovery 職涯探索流程
 */

import { test, expect, Page } from '@playwright/test';
import { performLogin, performLogout, TEST_USERS } from './helpers/auth-helpers';

// Test data
const DISCOVERY_USER = {
  email: 'discovery.test@example.com',
  password: 'Test123!@#',
  role: 'student' as const
};

test.describe('Discovery Module - Complete Flow with Auth', () => {
  test.use({
    // Set browser context
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
  });

  test('complete discovery career exploration flow', async ({ page, context }) => {
    // 1. Start from homepage without auth
    await test.step('Visit homepage as guest', async () => {
      await page.goto('/');
      await expect(page.locator('h1').first()).toContainText('AI Square');
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    });

    // 2. Try to access protected discovery route
    await test.step('Attempt to access discovery without login', async () => {
      await page.goto('/discovery/scenarios');
      // Should redirect to login
      await page.waitForURL('**/login*');
      // 修改期望的文字（根據實際 i18n 文字）
      await expect(page.locator('h2')).toContainText('Sign');
    });

    // 3. Login process
    await test.step('Login with test account', async () => {
      // 點擊 Student 示範帳號按鈕
      await page.locator('button:has-text("Student")').click();
      
      // Wait for successful login - 根據實際導航修改
      await page.waitForURL(/\/(onboarding|discovery|assessment|dashboard)/, { timeout: 10000 });
      
      // Verify we are on the correct page
      await expect(page.url()).toContain('/discovery/scenarios');
    });

    // 4. Browse Discovery Scenarios
    await test.step('Browse available career paths', async () => {
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // 檢查頁面標題或內容
      const pageTitle = await page.title();
      console.log('Page title:', pageTitle);
      
      // 等待任何內容載入
      await page.waitForTimeout(2000);
      
      // Verify multiple scenarios
      const scenarios = page.locator('[data-testid="scenario-card"]');
      const count = await scenarios.count();
      expect(count).toBeGreaterThanOrEqual(3);
      
      // Check scenario details are visible
      await expect(page.locator('text=Software Developer')).toBeVisible();
      await expect(page.locator('text=Data Scientist')).toBeVisible();
      await expect(page.locator('text=UX Designer')).toBeVisible();
      
      // Check difficulty badges
      await expect(page.locator('[data-testid="difficulty-intermediate"]')).toBeVisible();
      await expect(page.locator('[data-testid="difficulty-advanced"]')).toBeVisible();
    });

    // 5. Filter scenarios
    await test.step('Filter scenarios by difficulty', async () => {
      // Click intermediate filter
      await page.click('button[data-testid="filter-intermediate"]');
      
      // Wait for filter to apply
      await page.waitForTimeout(500);
      
      // Verify filtered results
      const filteredScenarios = page.locator('[data-testid="scenario-card"]');
      const filteredCount = await filteredScenarios.count();
      expect(filteredCount).toBeLessThan(count);
      
      // Clear filter
      await page.click('button[data-testid="clear-filters"]');
    });

    // 6. View scenario details
    await test.step('View Software Developer career details', async () => {
      // Click on Software Developer card
      await page.click('[data-testid="scenario-card"]:has-text("Software Developer")');
      
      // Wait for navigation
      await page.waitForURL(/\/discovery\/scenarios\/[\w-]+$/);
      
      // Verify scenario details page
      await expect(page.locator('h1:has-text("Software Developer")')).toBeVisible();
      
      // Check required skills section
      await expect(page.locator('h2:has-text("Required Skills")')).toBeVisible();
      await expect(page.locator('text=JavaScript')).toBeVisible();
      await expect(page.locator('text=Python')).toBeVisible();
      await expect(page.locator('text=Git')).toBeVisible();
      await expect(page.locator('text=Problem Solving')).toBeVisible();
      
      // Check salary information
      await expect(page.locator('[data-testid="salary-range"]')).toContainText('$60,000 - $120,000');
      
      // Check career insights
      await expect(page.locator('text=High Growth')).toBeVisible();
      await expect(page.locator('text=Very High Demand')).toBeVisible();
      
      // Check day in life section
      await expect(page.locator('h3:has-text("A Day in the Life")')).toBeVisible();
      await expect(page.locator('text=coding, debugging, and collaborating')).toBeVisible();
    });

    // 7. Start career exploration
    await test.step('Start career exploration program', async () => {
      // Check if already enrolled
      const isEnrolled = await page.locator('button:has-text("Continue Learning")').isVisible();
      
      if (!isEnrolled) {
        // Click start button
        await page.click('button[data-testid="start-exploration"]');
        
        // Confirm dialog
        await page.click('button:has-text("Yes, Start")');
        
        // Wait for program creation
        await page.waitForSelector('[data-testid="success-toast"]');
        await expect(page.locator('text=Career exploration started successfully!')).toBeVisible();
      }
      
      // Should navigate to first task
      await page.waitForURL(/\/discovery\/programs\/[\w-]+\/tasks\/[\w-]+$/);
    });

    // 8. Complete exploration task
    await test.step('Complete first exploration task', async () => {
      // Verify task page
      await expect(page.locator('h2:has-text("Task 1")')).toBeVisible();
      await expect(page.locator('text=Introduction to Software Development')).toBeVisible();
      
      // Read task instructions
      await expect(page.locator('[data-testid="task-instructions"]')).toBeVisible();
      
      // Interact with AI mentor
      const chatInput = page.locator('textarea[placeholder="Ask your AI mentor..."]');
      await chatInput.fill('What are the most important skills for a beginner software developer?');
      await page.click('button[data-testid="send-message"]');
      
      // Wait for AI response
      await page.waitForSelector('[data-testid="ai-response"]', { timeout: 30000 });
      await expect(page.locator('[data-testid="ai-response"]')).toContainText('important skills');
      
      // Complete task
      await page.click('button[data-testid="complete-task"]');
      
      // Confirm completion
      await page.click('button:has-text("Yes, Complete")');
      
      // Wait for completion feedback
      await expect(page.locator('text=Task completed!')).toBeVisible();
      await expect(page.locator('[data-testid="xp-earned"]')).toContainText('+100 XP');
    });

    // 9. View progress dashboard
    await test.step('Check learning progress', async () => {
      // Navigate to programs list
      await page.click('a[href="/discovery/my-programs"]');
      await page.waitForURL('**/discovery/my-programs');
      
      // Verify programs page
      await expect(page.locator('h1:has-text("My Discovery Programs")')).toBeVisible();
      
      // Check active program
      const programCard = page.locator('[data-testid="program-card"]:has-text("Software Developer")');
      await expect(programCard).toBeVisible();
      
      // Verify progress
      await expect(programCard.locator('[data-testid="progress-bar"]')).toBeVisible();
      await expect(programCard.locator('[data-testid="progress-percentage"]')).toContainText('%');
      
      // Check skill gaps
      await expect(programCard.locator('text=Skill Gaps: 4')).toBeVisible();
      await expect(programCard.locator('text=Career Readiness: 65%')).toBeVisible();
    });

    // 10. View skill gap analysis
    await test.step('Analyze skill gaps', async () => {
      // Click on program to view details
      await page.click('[data-testid="program-card"]:has-text("Software Developer")');
      
      // Navigate to skill gaps tab
      await page.click('button[data-testid="tab-skills"]');
      
      // Verify skill gap analysis
      await expect(page.locator('h2:has-text("Skill Gap Analysis")')).toBeVisible();
      
      // Check individual skills
      const jsSkill = page.locator('[data-testid="skill-JavaScript"]');
      await expect(jsSkill).toBeVisible();
      await expect(jsSkill.locator('text=Current: 60')).toBeVisible();
      await expect(jsSkill.locator('text=Required: 75')).toBeVisible();
      await expect(jsSkill.locator('[data-testid="skill-importance"]')).toContainText('Critical');
      
      // Check suggested resources
      await expect(page.locator('h3:has-text("Suggested Resources")')).toBeVisible();
      await expect(page.locator('text=Online course')).toBeVisible();
    });

    // 11. Create portfolio item
    await test.step('Add project to portfolio', async () => {
      // Navigate to portfolio tab
      await page.click('button[data-testid="tab-portfolio"]');
      
      // Click add portfolio item
      await page.click('button[data-testid="add-portfolio-item"]');
      
      // Fill portfolio form
      await page.fill('input[name="title"]', 'Todo List Application');
      await page.fill('textarea[name="description"]', 'Built a responsive todo list app using React and TypeScript');
      await page.fill('input[name="skills"]', 'React, TypeScript, CSS, Git');
      await page.fill('input[name="projectUrl"]', 'https://github.com/testuser/todo-app');
      
      // Upload screenshot (if file input exists)
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Create a test file
        await fileInput.setInputFiles({
          name: 'screenshot.png',
          mimeType: 'image/png',
          buffer: Buffer.from('fake-image-data')
        });
      }
      
      // Submit portfolio item
      await page.click('button[data-testid="save-portfolio-item"]');
      
      // Verify success
      await expect(page.locator('text=Portfolio item added successfully!')).toBeVisible();
      await expect(page.locator('[data-testid="portfolio-item"]:has-text("Todo List Application")')).toBeVisible();
    });

    // 12. Get career recommendations
    await test.step('View personalized career recommendations', async () => {
      // Navigate to recommendations
      await page.click('a[href="/discovery/recommendations"]');
      await page.waitForURL('**/discovery/recommendations');
      
      // Verify recommendations page
      await expect(page.locator('h1:has-text("Career Recommendations")')).toBeVisible();
      
      // Wait for recommendations to load
      await page.waitForSelector('[data-testid="recommendation-card"]');
      
      // Check recommendations
      const recommendations = page.locator('[data-testid="recommendation-card"]');
      const recCount = await recommendations.count();
      expect(recCount).toBeGreaterThanOrEqual(3);
      
      // Verify top recommendation
      const topRec = recommendations.first();
      await expect(topRec.locator('[data-testid="match-score"]')).toBeVisible();
      await expect(topRec.locator('text=% Match')).toBeVisible();
      await expect(topRec.locator('[data-testid="career-title"]')).toBeVisible();
      
      // Check recommendation details
      await topRec.click();
      await expect(page.locator('h2:has-text("Why This Career Matches You")')).toBeVisible();
      await expect(page.locator('text=Your skills align')).toBeVisible();
    });

    // 13. Complete program
    await test.step('Complete exploration program', async () => {
      // Navigate back to program
      await page.goto('/discovery/my-programs');
      await page.click('[data-testid="program-card"]:has-text("Software Developer")');
      
      // Complete remaining tasks (simplified)
      await page.click('button[data-testid="complete-all-tasks"]');
      await page.click('button:has-text("Yes, Complete All")');
      
      // Wait for program completion
      await page.waitForURL(/\/discovery\/programs\/[\w-]+\/complete$/);
      
      // Verify completion page
      await expect(page.locator('h1:has-text("Congratulations!")')).toBeVisible();
      await expect(page.locator('text=You have completed the Software Developer')).toBeVisible();
      
      // Check achievements
      await expect(page.locator('[data-testid="achievement-badge"]')).toBeVisible();
      await expect(page.locator('text=Explorer Badge')).toBeVisible();
      await expect(page.locator('text=1000 XP Earned')).toBeVisible();
      
      // Check certificate
      await expect(page.locator('[data-testid="completion-certificate"]')).toBeVisible();
      await expect(page.locator('button:has-text("Download Certificate")')).toBeVisible();
    });

    // 14. Logout process
    await test.step('Logout from application', async () => {
      // Open user menu
      await page.click('[data-testid="user-menu"]');
      
      // Check menu items
      await expect(page.locator('text=Profile')).toBeVisible();
      await expect(page.locator('text=Settings')).toBeVisible();
      await expect(page.locator('text=Sign Out')).toBeVisible();
      
      // Click logout
      await page.click('button:has-text("Sign Out")');
      
      // Confirm logout dialog
      await expect(page.locator('text=Are you sure you want to sign out?')).toBeVisible();
      await page.click('button:has-text("Yes, Sign Out")');
      
      // Wait for redirect to homepage
      await page.waitForURL('/');
      
      // Verify logged out state
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
      await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
    });

    // 15. Verify session persistence
    await test.step('Verify progress persists after logout/login', async () => {
      // Login again
      await performLogin(page, DISCOVERY_USER);
      
      // Navigate to programs
      await page.goto('/discovery/my-programs');
      
      // Verify completed program is still there
      const completedProgram = page.locator('[data-testid="program-card"]:has-text("Software Developer")');
      await expect(completedProgram).toBeVisible();
      await expect(completedProgram.locator('[data-testid="status-badge"]')).toContainText('Completed');
      await expect(completedProgram.locator('[data-testid="progress-percentage"]')).toContainText('100%');
      
      // Verify portfolio items persist
      await completedProgram.click();
      await page.click('button[data-testid="tab-portfolio"]');
      await expect(page.locator('[data-testid="portfolio-item"]:has-text("Todo List Application")')).toBeVisible();
    });
  });

  test('mobile responsive discovery flow', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X size
    
    await test.step('Login on mobile', async () => {
      await page.goto('/login');
      
      // 點擊 Student 示範帳號按鈕
      await page.locator('button:has-text("Student")').click();
      
      await page.waitForURL('**/discovery/scenarios');
    });

    await test.step('Browse scenarios on mobile', async () => {
      // Open mobile menu
      await page.click('[data-testid="mobile-menu-toggle"]');
      
      // Navigate to discovery
      await page.click('a:has-text("Discovery")');
      
      // Verify mobile layout
      const scenarioCards = page.locator('[data-testid="scenario-card"]');
      await expect(scenarioCards.first()).toHaveCSS('width', '100%');
      
      // Verify cards stack vertically
      const firstCard = await scenarioCards.first().boundingBox();
      const secondCard = await scenarioCards.nth(1).boundingBox();
      expect(firstCard?.y).toBeLessThan(secondCard?.y || 0);
    });

    await test.step('Complete task on mobile', async () => {
      // Select scenario
      await page.click('[data-testid="scenario-card"]:has-text("UX Designer")');
      await page.click('button[data-testid="start-exploration"]');
      
      // Verify mobile task layout
      await expect(page.locator('[data-testid="task-content"]')).toHaveCSS('padding', '16px');
      
      // Test swipe navigation
      const taskContent = page.locator('[data-testid="task-content"]');
      await taskContent.dragTo(taskContent, {
        sourcePosition: { x: 300, y: 100 },
        targetPosition: { x: 50, y: 100 }
      });
      
      // Verify navigation worked
      await expect(page.locator('text=Task 2')).toBeVisible();
    });

    await test.step('Logout on mobile', async () => {
      // Open mobile menu
      await page.click('[data-testid="mobile-menu-toggle"]');
      
      // Scroll to bottom of menu
      await page.locator('[data-testid="mobile-menu"]').evaluate(el => el.scrollTo(0, el.scrollHeight));
      
      // Click logout
      await page.click('button:has-text("Sign Out")');
      await page.click('button:has-text("Yes, Sign Out")');
      
      // Verify logout
      await page.waitForURL('/');
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    });
  });

  test('multilingual discovery experience', async ({ page }) => {
    await performLogin(page, DISCOVERY_USER);
    
    await test.step('Switch to Chinese', async () => {
      // Open language selector
      await page.click('[data-testid="language-selector"]');
      await page.click('button[data-value="zh"]');
      
      // Wait for language change
      await page.waitForTimeout(500);
      
      // Verify UI updated
      await expect(page.locator('h1')).toContainText('探索職業道路');
      await expect(page.locator('[data-testid="scenario-card"]:has-text("軟體開發工程師")')).toBeVisible();
    });

    await test.step('View scenario in Chinese', async () => {
      await page.click('[data-testid="scenario-card"]:has-text("軟體開發工程師")');
      
      // Verify Chinese content
      await expect(page.locator('h1')).toContainText('軟體開發工程師');
      await expect(page.locator('text=所需技能')).toBeVisible();
      await expect(page.locator('text=典型的一天')).toBeVisible();
      await expect(page.locator('button[data-testid="start-exploration"]')).toContainText('開始探索');
    });

    await test.step('Switch back to English', async () => {
      await page.click('[data-testid="language-selector"]');
      await page.click('button[data-value="en"]');
      
      // Verify English restored
      await page.waitForTimeout(500);
      await expect(page.locator('h1')).toContainText('Software Developer');
    });
  });

  test('handle errors gracefully', async ({ page }) => {
    await performLogin(page, DISCOVERY_USER);
    
    await test.step('Handle network error', async () => {
      // Simulate offline
      await page.context().setOffline(true);
      
      // Try to load scenarios
      await page.goto('/discovery/scenarios');
      
      // Should show error message
      await expect(page.locator('text=Unable to load scenarios')).toBeVisible();
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
      
      // Retry
      await page.click('button:has-text("Retry")');
      
      // Should load successfully
      await expect(page.locator('[data-testid="scenario-card"]')).toBeVisible();
    });

    await test.step('Handle invalid scenario', async () => {
      // Navigate to invalid scenario
      await page.goto('/discovery/scenarios/invalid-scenario-id-12345');
      
      // Should show 404
      await expect(page.locator('h1:has-text("Scenario Not Found")')).toBeVisible();
      await expect(page.locator('text=The career scenario you are looking for')).toBeVisible();
      await expect(page.locator('a:has-text("Browse All Scenarios")')).toBeVisible();
    });
  });
});