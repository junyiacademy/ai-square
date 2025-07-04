import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const PATHS = [
  { name: '1-dashboard', url: '/dashboard', title: 'Dashboard' },
  { name: '2-assessment', url: '/assessment', title: 'Assessment' },
  { name: '3-learning-path', url: '/learning-path', title: 'Learning Path' },
  { name: '4-pbl', url: '/pbl', title: 'PBL Practice' },
  { name: '5-chat', url: '/chat', title: 'AI Advisor' },
  { name: '6-discovery', url: '/discovery', title: 'Discovery' }
];

const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'public', 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshots() {
  console.log('🚀 Starting screenshot capture for 6 key paths...');
  
  const browser = await chromium.launch({
    headless: true
  });

  try {
    const context = await browser.newContext({
      viewport: {
        width: 1440,
        height: 900
      },
      deviceScaleFactor: 2
    });

    for (const pathInfo of PATHS) {
      console.log(`\n📸 Capturing ${pathInfo.title}...`);
      
      const page = await context.newPage();
      
      // Go to the page
      const url = `${BASE_URL}${pathInfo.url}`;
      console.log(`   Navigating to: ${url}`);
      
      try {
        await page.goto(url, { 
          waitUntil: 'networkidle',
          timeout: 60000
        });
        
        // Wait a bit for any animations to complete
        await page.waitForTimeout(3000);
        
        // For specific pages, wait for key elements
        switch (pathInfo.url) {
          case '/dashboard':
            // Wait for dashboard content
            await page.waitForSelector('[data-testid="dashboard-content"], .dashboard-container, main', {
              timeout: 10000
            }).catch(() => console.log('   Warning: Dashboard selector not found'));
            break;
            
          case '/assessment':
            // Wait for assessment content
            await page.waitForSelector('[data-testid="assessment-container"], .assessment-container, main', {
              timeout: 10000
            }).catch(() => console.log('   Warning: Assessment selector not found'));
            break;
            
          case '/learning-path':
            // Wait for learning path content
            await page.waitForSelector('[data-testid="learning-path-container"], .learning-path-container, main', {
              timeout: 10000
            }).catch(() => console.log('   Warning: Learning path selector not found'));
            break;
            
          case '/pbl':
            // Wait for PBL scenarios
            await page.waitForSelector('.scenario-card, [data-testid="pbl-scenarios"], main', {
              timeout: 10000
            }).catch(() => console.log('   Warning: PBL selector not found'));
            break;
            
          case '/chat':
            // Wait for chat interface
            await page.waitForSelector('.chat-container, [data-testid="chat-interface"], main', {
              timeout: 10000
            }).catch(() => console.log('   Warning: Chat selector not found'));
            break;
            
          case '/discovery':
            // Wait for discovery content
            await page.waitForSelector('[data-testid="discovery-container"], .discovery-container, main', {
              timeout: 10000
            }).catch(() => console.log('   Warning: Discovery selector not found'));
            break;
        }
        
        // Scroll to top to ensure we capture from the beginning
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(1000);
        
        // Take screenshot
        const screenshotPath = path.join(SCREENSHOTS_DIR, `${pathInfo.name}.png`);
        await page.screenshot({
          path: screenshotPath,
          fullPage: false, // Only capture viewport
          type: 'png'
        });
        
        console.log(`   ✅ Saved: ${screenshotPath}`);
        
      } catch (error) {
        console.error(`   ❌ Error capturing ${pathInfo.title}:`, error instanceof Error ? error.message : String(error));
        
        // Try to capture whatever is on the page
        const errorScreenshotPath = path.join(SCREENSHOTS_DIR, `${pathInfo.name}-error.png`);
        await page.screenshot({
          path: errorScreenshotPath,
          fullPage: false,
          type: 'png'
        });
        console.log(`   📸 Error screenshot saved: ${errorScreenshotPath}`);
      } finally {
        await page.close();
      }
    }
    
    console.log('\n✨ Screenshot capture completed!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }
}

// Run the capture
captureScreenshots().catch(console.error);