import { chromium } from 'playwright';
import * as path from 'path';

async function captureDiscoveryOverview() {
  console.log('📸 Capturing Discovery Overview page...');
  
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

    const page = await context.newPage();
    
    // Navigate to discovery overview
    const url = 'http://localhost:3000/discovery/overview';
    console.log(`Navigating to: ${url}`);
    
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // Wait for page to load completely
    await page.waitForTimeout(3000);
    
    // Wait for discovery content
    await page.waitForSelector('main, [data-testid="discovery-overview"]', {
      timeout: 10000
    }).catch(() => console.log('Warning: Main content selector not found'));
    
    // Take screenshot and save directly as 6-discovery.png
    const screenshotPath = path.join(__dirname, '..', 'public', 'screenshots', '6-discovery.png');
    
    await page.screenshot({
      path: screenshotPath,
      fullPage: false, // Only viewport to match other journey screenshots
      type: 'png'
    });
    
    console.log(`✅ Screenshot saved: ${screenshotPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

// Run the capture
captureDiscoveryOverview().catch(console.error);