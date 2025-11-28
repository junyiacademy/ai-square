---
name: visual-test
description: Screenshot-based iteration workflow for frontend development with Playwright visual regression testing
color: purple
---

# Visual Test Workflow

## Purpose
Implement screenshot-based iteration for frontend development, enabling pixel-perfect UI implementation with automated visual regression testing.

## Workflow Overview

```
Design Mock → Implementation → Screenshot → Compare → Iterate → Visual Test
```

## Step-by-Step Process

### 1. Initial Setup
**User provides**:
- Design mock/reference screenshot
- Component requirements
- Target route/page

**Claude prepares**:
- Identifies component location
- Reviews design specifications
- Plans implementation approach

### 2. Implementation Phase
**Build the component**:
- Implement UI according to design
- Follow TypeScript + Tailwind CSS standards
- Ensure responsive design
- Add accessibility features (ARIA labels, keyboard navigation)

### 3. Screenshot Comparison
**User captures screenshot**:
```bash
# For local development
npm run dev
# Navigate to the page and take screenshot
```

**Claude analyzes**:
- Compare implementation vs design mock
- Identify visual discrepancies
- Note spacing, color, typography differences
- Check responsive behavior

### 4. Iteration Cycle
**Refinement loop**:
1. Claude suggests specific CSS/styling adjustments
2. User reviews changes
3. Take new screenshot
4. Compare again
5. Repeat until pixel-perfect

### 5. Automated Visual Regression Test
**Create Playwright test**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Visual Regression: ComponentName', () => {
  test('matches design snapshot', async ({ page }) => {
    await page.goto('/route-to-component');

    // Wait for component to fully render
    await page.waitForSelector('[data-testid="component-id"]');

    // Take screenshot and compare
    await expect(page).toHaveScreenshot('component-name.png', {
      maxDiffPixels: 100, // Allow minor anti-aliasing differences
      threshold: 0.2,
    });
  });

  test('responsive design on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/route-to-component');

    await expect(page).toHaveScreenshot('component-name-mobile.png');
  });

  test('responsive design on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/route-to-component');

    await expect(page).toHaveScreenshot('component-name-tablet.png');
  });
});
```

## Usage Example

```
User: "I want to implement this login form design [screenshot]"

Claude: "I'll implement this login form using our visual test workflow.

Step 1: Implementation
- Creating LoginForm component in src/components/auth/
- Using shadcn/ui form components
- Matching the design specifications

[Creates component code]

Step 2: Screenshot Request
Please run `npm run dev` and navigate to /auth/login
Take a screenshot of the form and share it with me.

Step 3: Comparison & Iteration
I'll compare your screenshot with the design mock and suggest adjustments.

Step 4: Visual Regression Test
Once pixel-perfect, I'll create a Playwright test to ensure the design stays consistent."
```

## Test Organization

### Directory Structure
```
tests/
  visual/
    auth/
      login-form.spec.ts
    dashboard/
      metrics-card.spec.ts
    components/
      button.spec.ts
```

### Baseline Screenshots
```
tests/
  visual/
    __screenshots__/
      auth-login-form-desktop.png
      auth-login-form-mobile.png
      dashboard-metrics-card-desktop.png
```

## Best Practices

### 1. Data Preparation
```typescript
test.beforeEach(async ({ page }) => {
  // Use test data that's consistent
  await page.route('**/api/user', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify(MOCK_USER_DATA)
    });
  });
});
```

### 2. Wait for Stability
```typescript
// Wait for animations to complete
await page.waitForTimeout(500);

// Wait for fonts to load
await page.evaluate(() => document.fonts.ready);

// Wait for images
await page.waitForLoadState('networkidle');
```

### 3. Mask Dynamic Content
```typescript
await expect(page).toHaveScreenshot({
  mask: [
    page.locator('[data-testid="timestamp"]'),
    page.locator('[data-testid="user-avatar"]'),
  ],
});
```

### 4. Handle Flakiness
```typescript
// Retry visual tests
test.describe.configure({ retries: 2 });

// Use higher thresholds for complex UIs
await expect(page).toHaveScreenshot({
  threshold: 0.3, // Allow 30% difference
  maxDiffPixels: 500,
});
```

## Integration with CI/CD

### GitHub Actions
```yaml
- name: Run Visual Regression Tests
  run: npm run test:visual

- name: Upload Visual Diffs
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: visual-test-diffs
    path: tests/visual/__screenshots__/
```

### Updating Baselines
```bash
# Locally update snapshots after intentional UI changes
npm run test:visual -- --update-snapshots

# Commit new baselines
git add tests/visual/__screenshots__/
git commit -m "test: update visual regression baselines"
```

## Common Scenarios

### Scenario 1: New Component
1. Implement component
2. Take screenshot
3. Create visual test
4. Generate baseline

### Scenario 2: Design Update
1. Update component styling
2. Take new screenshot
3. Compare with current baseline
4. Update baseline if intentional
5. Verify no unintended changes elsewhere

### Scenario 3: Responsive Design
1. Implement responsive styles
2. Screenshot at breakpoints: mobile (375px), tablet (768px), desktop (1440px)
3. Create tests for each viewport
4. Verify smooth transitions

## Troubleshooting

### Screenshots Don't Match
- Check for dynamic data (timestamps, random IDs)
- Verify font loading
- Check for CSS animations
- Ensure consistent viewport size

### Flaky Tests
- Increase wait times
- Mock network requests
- Use data-testid for stability
- Disable animations in test mode

### Performance Issues
- Run visual tests in parallel: `--workers=4`
- Use headed mode only when debugging
- Optimize screenshot areas (specific components vs full page)

## AI Square Specific Integration

### Component Library Testing
```typescript
// Test shadcn/ui customizations
test('custom button variants match design system', async ({ page }) => {
  await page.goto('/styleguide/buttons');
  await expect(page.locator('[data-testid="button-primary"]'))
    .toHaveScreenshot('button-primary.png');
});
```

### Multilingual UI Testing
```typescript
test.describe('i18n Visual Consistency', () => {
  for (const locale of ['en', 'zh']) {
    test(`renders correctly in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/dashboard`);
      await expect(page).toHaveScreenshot(`dashboard-${locale}.png`);
    });
  }
});
```

### Dark Mode Testing
```typescript
test.describe('Dark Mode', () => {
  test.use({ colorScheme: 'dark' });

  test('matches dark theme design', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveScreenshot('dashboard-dark.png');
  });
});
```

## Success Metrics

- Pixel-perfect implementation on first try: 80%+
- Visual regression test coverage: All user-facing components
- CI/CD visual test failures: Catch unintended UI changes before merge
- Design iteration cycles: Reduced from 5+ to 2-3

---

**Note**: This workflow implements Anthropic's 2025 best practice of visual iteration for frontend development, combining human screenshot feedback with automated visual regression testing for production-grade UI quality.
