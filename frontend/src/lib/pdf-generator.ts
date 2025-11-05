/**
 * PDF Generator using Puppeteer
 * Server-side PDF generation for certificates
 */

import puppeteer, { Browser } from 'puppeteer';

// Singleton browser instance for performance
let browserInstance: Browser | null = null;

/**
 * Get or create browser instance (reuse for performance)
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  browserInstance = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  return browserInstance;
}

/**
 * Generate PDF from HTML content
 */
export async function generatePDFFromHTML(
  html: string,
  options: {
    format?: 'A4' | 'Letter';
    landscape?: boolean;
    margin?: { top: string; right: string; bottom: string; left: string };
    printBackground?: boolean;
  } = {}
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    // Generate PDF
    const pdf = await page.pdf({
      format: options.format || 'A4',
      landscape: options.landscape || false,
      margin: options.margin || { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: options.printBackground !== false,
      preferCSSPageSize: false,
    });

    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

/**
 * Close browser instance (cleanup)
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// Cleanup on process exit
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});
# Trigger rebuild for memory increase
