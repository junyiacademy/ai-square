# AI Square Visual Inspection Guide

## How to Capture Screenshots

Since I cannot directly capture screenshots, here's a guide for manually capturing and reviewing each page:

### Prerequisites
1. Start the development server: `npm run dev`
2. Open browser developer tools (F12)
3. Use device toolbar for responsive testing

### Pages to Capture

#### 1. Landing Page
- **URL**: http://localhost:3000/
- **States**: Default, hover states, mobile view
- **Languages**: EN, zhTW, zhCN

#### 2. Relations/Competency Map
- **URL**: http://localhost:3000/relations
- **States**: Collapsed, expanded domains, mobile overlay
- **Check**: Gradient backgrounds, icon alignment

#### 3. Assessment Module
- **URL**: http://localhost:3000/assessment
- **States**: Start, in-progress, results
- **Check**: Form validation, progress indicators

#### 4. PBL Scenarios
- **URL**: http://localhost:3000/pbl
- **States**: List view, detail view, chat interface
- **Check**: Card layouts, AI chat responses

#### 5. Discovery Welcome
- **URL**: http://localhost:3000/discovery
- **States**: Animation states, feature cards
- **Check**: Responsive grid, CTA buttons

#### 6. Discovery Scenarios List
- **URL**: http://localhost:3000/discovery/scenarios
- **States**: Grid view, loading, empty state
- **Check**: Career icons, skill tags

#### 7. Discovery Program Detail
- **URL**: http://localhost:3000/discovery/scenarios/[id]
- **States**: Program list, active/completed states
- **Check**: Progress bars, status badges

#### 8. Discovery Task Execution
- **URL**: http://localhost:3000/discovery/scenarios/[id]/programs/[programId]/tasks/[taskId]
- **States**: Task types, chat interface
- **Check**: AI interactions, response formatting

#### 9. Discovery Completion
- **URL**: http://localhost:3000/discovery/scenarios/[id]/programs/[programId]/complete
- **States**: Results display, AI feedback
- **Check**: Markdown rendering, metrics display

### Screenshot Checklist

For each page, capture:
- [ ] Desktop view (1920x1080)
- [ ] Tablet view (768x1024)
- [ ] Mobile view (375x667)
- [ ] Language variants (EN, zhTW minimum)
- [ ] Interactive states (hover, focus, active)
- [ ] Loading states
- [ ] Error states
- [ ] Empty states

### Visual Elements to Verify

1. **Typography**
   - Font sizes and weights
   - Line heights and spacing
   - Text overflow handling

2. **Colors**
   - Gradient consistency
   - Contrast ratios
   - Theme consistency

3. **Layout**
   - Grid alignment
   - Spacing consistency
   - Responsive breakpoints

4. **Components**
   - Button styles
   - Card designs
   - Form elements
   - Navigation items

5. **Icons**
   - Size consistency
   - Color matching
   - Alignment

6. **Animations**
   - Smooth transitions
   - Loading spinners
   - Hover effects

### Tools for Screenshot Capture

1. **Full Page Screenshots**
   - Chrome DevTools: Cmd+Shift+P → "Capture full size screenshot"
   - Firefox: Screenshot button in toolbar
   - Extensions: Full Page Screen Capture

2. **Responsive Testing**
   - Chrome DevTools Device Mode
   - Responsively App
   - BrowserStack

3. **Automated Tools**
   - Playwright for automated screenshots
   - Percy for visual regression testing
   - Chromatic for Storybook integration

### Storage Structure
```
docs/screenshots/
├── 2025-01/
│   ├── desktop/
│   │   ├── home-en.png
│   │   ├── home-zhtw.png
│   │   └── ...
│   ├── tablet/
│   └── mobile/
└── README.md
```

### Visual Regression Testing

Consider implementing automated visual testing:

```javascript
// Example Playwright script
const { test } = require('@playwright/test');

test('capture homepage', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.screenshot({ path: 'homepage.png', fullPage: true });
});
```

---

*Note: Actual screenshots should be captured using the methods above and stored in the project for reference.*