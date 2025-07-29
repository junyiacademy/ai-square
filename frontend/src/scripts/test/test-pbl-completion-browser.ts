/* eslint-disable @typescript-eslint/no-unused-vars */
#!/usr/bin/env tsx

/**
 * Browser test for PBL completion page
 * Tests the complete flow from starting a scenario to viewing completion results
 */

import { chromium, Browser, Page } from 'playwright'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') })

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

interface TestResult {
  testName: string
  status: 'passed' | 'failed'
  error?: string
  duration: number
}

class PBLCompletionBrowserTest {
  private browser: Browser | null = null
  private page: Page | null = null
  private results: TestResult[] = []

  async setup() {
    console.log('🚀 Setting up browser...')
    this.browser = await chromium.launch({
      headless: false, // Set to true for CI
      slowMo: 50, // Slow down for visibility
    })
    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      // Set authentication cookies
      storageState: {
        cookies: [
          {
            name: 'isLoggedIn',
            value: 'true',
            domain: new URL(BASE_URL).hostname,
            path: '/',
          },
          {
            name: 'user',
            value: encodeURIComponent(JSON.stringify({
              email: 'student@example.com',
              name: 'Test Student'
            })),
            domain: new URL(BASE_URL).hostname,
            path: '/',
          }
        ],
        origins: []
      }
    })
    this.page = await context.newPage()
  }

  async teardown() {
    console.log('🧹 Cleaning up...')
    if (this.page) await this.page.close()
    if (this.browser) await this.browser.close()
  }

  async runTest(testName: string, testFn: () => Promise<void>) {
    const startTime = Date.now()
    try {
      await testFn()
      this.results.push({
        testName,
        status: 'passed',
        duration: Date.now() - startTime
      })
      console.log(`✅ ${testName}`)
    } catch (_error) {
      this.results.push({
        testName,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      })
      console.error(`❌ ${testName}: ${error}`)
    }
  }

  async testCompletionPageLoading() {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log('📍 Testing completion page loading...')
    
    // Use a known program ID from the database
    const programId = '0940a243-4df4-4f65-b497-bb59795809b1'
    const scenarioId = '8fb1f265-cd53-4199-9d5c-c2ab2297621d'
    
    await this.page.goto(`${BASE_URL}/pbl/scenarios/${scenarioId}/programs/${programId}/complete`)
    
    // Wait for the page to load
    await this.page.waitForSelector('h1', { timeout: 10000 })
    
    // Check for completion page elements
    const heading = await this.page.textContent('h1')
    if (!heading?.includes('Congratulations') && !heading?.includes('恭喜')) {
      throw new Error('Completion page heading not found')
    }
    
    // Check for overall score
    await this.page.waitForSelector('text=Overall Score', { timeout: 5000 })
    const scoreElement = await this.page.locator('[data-testid="overall-score"]').first()
    const scoreText = await scoreElement.textContent()
    console.log(`   Overall score: ${scoreText}`)
    
    // Check for domain scores
    await this.page.waitForSelector('text=Engaging with AI', { timeout: 5000 })
    const domainScores = await this.page.locator('[data-testid="domain-score"]').all()
    console.log(`   Found ${domainScores.length} domain scores`)
  }

  async testFeedbackGeneration() {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log('📍 Testing feedback generation...')
    
    // Check if feedback already exists
    const existingFeedback = await this.page.locator('[data-testid="qualitative-feedback"]').count()
    
    if (existingFeedback === 0) {
      // Click generate feedback button
      console.log('   No existing feedback, generating new...')
      const generateButton = await this.page.locator('button:has-text("Generate AI Feedback")')
      await generateButton.click()
      
      // Wait for feedback to appear
      await this.page.waitForSelector('[data-testid="qualitative-feedback"]', { timeout: 30000 })
      console.log('   ✓ Feedback generated successfully')
    } else {
      console.log('   ✓ Feedback already exists')
      
      // Test regeneration
      const regenerateButton = await this.page.locator('button:has-text("Regenerate Feedback")')
      if (await regenerateButton.isVisible()) {
        console.log('   Testing feedback regeneration...')
        await regenerateButton.click()
        
        // Wait for loading state
        await this.page.waitForSelector('text=Generating feedback...', { timeout: 5000 })
        
        // Wait for new feedback
        await this.page.waitForSelector('[data-testid="qualitative-feedback"]', { timeout: 30000 })
        console.log('   ✓ Feedback regenerated successfully')
      }
    }
    
    // Verify feedback content
    const feedbackContent = await this.page.locator('[data-testid="qualitative-feedback"]').textContent()
    if (!feedbackContent || feedbackContent.length < 50) {
      throw new Error('Feedback content seems too short or empty')
    }
    
    // Check for feedback sections
    const sections = ['Strengths', 'Areas for Improvement', 'Next Steps']
    for (const section of sections) {
      const sectionExists = await this.page.locator(`text=${section}`).count() > 0
      if (!sectionExists) {
        console.log(`   ⚠️  Section "${section}" not found`)
      }
    }
  }

  async testLanguageSwitching() {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log('📍 Testing language switching...')
    
    // Check if language selector exists
    const languageSelector = await this.page.locator('select[name="language"]')
    if (!await languageSelector.isVisible()) {
      console.log('   Language selector not found, skipping test')
      return
    }
    
    // Get current language
    const currentLang = await languageSelector.inputValue()
    console.log(`   Current language: ${currentLang}`)
    
    // Switch to a different language
    const targetLang = currentLang === 'en' ? 'zhTW' : 'en'
    await languageSelector.selectOption(targetLang)
    
    // Wait for page to update
    await this.page.waitForTimeout(2000)
    
    // Check if UI updated
    if (targetLang === 'zhTW') {
      await this.page.waitForSelector('text=整體分數', { timeout: 5000 })
      console.log('   ✓ Switched to Traditional Chinese')
    } else {
      await this.page.waitForSelector('text=Overall Score', { timeout: 5000 })
      console.log('   ✓ Switched to English')
    }
    
    // Switch back
    await languageSelector.selectOption(currentLang)
    await this.page.waitForTimeout(1000)
  }

  async testTaskDetails() {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log('📍 Testing task details...')
    
    // Check for task list
    const taskItems = await this.page.locator('[data-testid="task-item"]').all()
    console.log(`   Found ${taskItems.length} tasks`)
    
    if (taskItems.length === 0) {
      throw new Error('No tasks found on completion page')
    }
    
    // Click on first task to see details
    const firstTask = taskItems[0]
    await firstTask.click()
    
    // Check if task details expanded
    await this.page.waitForTimeout(500)
    const taskDetails = await this.page.locator('[data-testid="task-details"]').first()
    if (await taskDetails.isVisible()) {
      console.log('   ✓ Task details expanded')
      
      // Check for evaluation score
      const scoreElement = await taskDetails.locator('[data-testid="task-score"]')
      if (await scoreElement.isVisible()) {
        const score = await scoreElement.textContent()
        console.log(`   Task score: ${score}`)
      }
    }
  }

  async testDomainVisualization() {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log('📍 Testing domain visualization...')
    
    // Check for radar chart or domain score bars
    const radarChart = await this.page.locator('[data-testid="domain-radar-chart"]')
    const domainBars = await this.page.locator('[data-testid="domain-score-bar"]').all()
    
    if (await radarChart.isVisible()) {
      console.log('   ✓ Radar chart visualization found')
    } else if (domainBars.length > 0) {
      console.log(`   ✓ Domain score bars found: ${domainBars.length}`)
      
      // Check each domain
      const domains = ['Engaging with AI', 'Creating with AI', 'Managing with AI', 'Designing with AI']
      for (const domain of domains) {
        const domainElement = await this.page.locator(`text=${domain}`).first()
        if (await domainElement.isVisible()) {
          console.log(`   ✓ ${domain} displayed`)
        }
      }
    } else {
      throw new Error('No domain visualization found')
    }
  }

  async testPrintAndShare() {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log('📍 Testing print and share features...')
    
    // Check for print button
    const printButton = await this.page.locator('button:has-text("Print")')
    if (await printButton.isVisible()) {
      console.log('   ✓ Print button found')
      
      // Test print dialog (don't actually print)
      this.page.on('dialog', dialog => dialog.dismiss())
      await printButton.click()
      await this.page.waitForTimeout(1000)
    }
    
    // Check for share button
    const shareButton = await this.page.locator('button:has-text("Share")')
    if (await shareButton.isVisible()) {
      console.log('   ✓ Share button found')
    }
    
    // Check for download certificate button
    const certificateButton = await this.page.locator('button:has-text("Download Certificate")')
    if (await certificateButton.isVisible()) {
      console.log('   ✓ Certificate download button found')
    }
  }

  async testErrorHandling() {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log('📍 Testing error handling...')
    
    // Navigate to non-existent program
    await this.page.goto(`${BASE_URL}/pbl/scenarios/test/programs/non-existent/complete`)
    
    // Should show error message
    await this.page.waitForSelector('text=not found', { timeout: 10000 })
    console.log('   ✓ Error message displayed for invalid program')
    
    // Check for retry or back button
    const retryButton = await this.page.locator('button:has-text("Retry")')
    const backButton = await this.page.locator('button:has-text("Back")')
    
    if (await retryButton.isVisible() || await backButton.isVisible()) {
      console.log('   ✓ Recovery options available')
    }
  }

  async runAllTests() {
    console.log('🧪 Starting PBL Completion Browser Tests\n')
    
    try {
      await this.setup()
      
      // Run all tests
      await this.runTest('Completion Page Loading', () => this.testCompletionPageLoading())
      await this.runTest('Feedback Generation', () => this.testFeedbackGeneration())
      await this.runTest('Language Switching', () => this.testLanguageSwitching())
      await this.runTest('Task Details', () => this.testTaskDetails())
      await this.runTest('Domain Visualization', () => this.testDomainVisualization())
      await this.runTest('Print and Share Features', () => this.testPrintAndShare())
      await this.runTest('Error Handling', () => this.testErrorHandling())
      
      // Print summary
      this.printSummary()
      
    } finally {
      await this.teardown()
    }
  }

  private printSummary() {
    console.log('\n📊 Test Summary')
    console.log('═══════════════')
    
    const passed = this.results.filter(r => r.status === 'passed').length
    const failed = this.results.filter(r => r.status === 'failed').length
    const total = this.results.length
    
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`)
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`)
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`   - ${r.testName}: ${r.error}`)
        })
    }
    
    console.log('\n⏱️  Test Durations:')
    this.results.forEach(r => {
      console.log(`   - ${r.testName}: ${r.duration}ms`)
    })
    
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)
    console.log(`\nTotal Duration: ${totalDuration}ms`)
  }
}

// Run the tests
if (require.main === module) {
  const tester = new PBLCompletionBrowserTest()
  tester.runAllTests().catch(console.error)
}