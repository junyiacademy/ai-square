import { test, expect } from '@playwright/test'

test.describe('PBL Completion Flow', () => {
  // Setup authenticated session
  test.beforeEach(async ({ page, context }) => {
    // Set authentication cookies
    await context.addCookies([
      {
        name: 'isLoggedIn',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'user',
        value: encodeURIComponent(JSON.stringify({
          email: 'student@example.com',
          name: 'Test Student'
        })),
        domain: 'localhost',
        path: '/',
      }
    ])

    // Mock API responses for initial data
    await page.route('**/api/pbl/scenarios**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          scenarios: [{
            id: 'test-scenario-1',
            title: { en: 'AI-Powered Smart City Solutions' },
            description: { en: 'Design and implement AI solutions for urban challenges' },
            difficulty: 'intermediate',
            estimatedMinutes: 60,
            metadata: {
              ksaCodes: ['K1.1', 'K2.1', 'S1.1', 'A1.1']
            }
          }]
        })
      })
    })
  })

  test('should complete a PBL scenario from start to finish', async ({ page }) => {
    // 1. Navigate to PBL scenarios page
    await page.goto('/pbl')
    await expect(page).toHaveTitle(/Problem-Based Learning/)

    // 2. Click on a scenario card
    await page.click('text=AI-Powered Smart City Solutions')
    await page.waitForURL(/\/pbl\/scenarios\/test-scenario-1/)

    // 3. Start the scenario
    await page.click('button:has-text("Start Scenario")')
    
    // Mock program creation API
    await page.route('**/api/pbl/scenarios/*/start', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          programId: 'test-program-1',
          tasks: [
            { id: 'task-1', type: 'question', title: { en: 'Task 1' } },
            { id: 'task-2', type: 'chat', title: { en: 'Task 2' } },
            { id: 'task-3', type: 'creation', title: { en: 'Task 3' } }
          ]
        })
      })
    })

    // 4. Complete tasks
    for (let i = 1; i <= 3; i++) {
      await page.waitForURL(/\/tasks\/task-/)
      
      // Mock task interactions
      await page.route('**/api/pbl/tasks/*/interactions', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            interactions: [{
              id: `interaction-${i}`,
              type: 'user_input',
              content: 'Test answer',
              timestamp: new Date().toISOString()
            }]
          })
        })
      })

      // Submit answer
      await page.fill('textarea', `Answer for task ${i}`)
      await page.click('button:has-text("Submit")')

      // Mock evaluation
      await page.route('**/api/pbl/tasks/*/evaluate', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            evaluation: {
              id: `eval-${i}`,
              score: 85 + i,
              domainScores: {
                engaging_with_ai: 85,
                creating_with_ai: 85,
                managing_with_ai: 85,
                designing_with_ai: 85
              }
            }
          })
        })
      })

      // Click Next Task button
      if (i < 3) {
        await page.click('button:has-text("Next Task")')
      }
    }

    // 5. Navigate to completion page
    await page.click('button:has-text("Complete Scenario")')
    await page.waitForURL(/\/complete/)

    // Mock completion API
    await page.route('**/api/pbl/completion**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            programId: 'test-program-1',
            scenarioId: 'test-scenario-1',
            status: 'completed',
            overallScore: 86,
            domainScores: {
              engaging_with_ai: 85,
              creating_with_ai: 87,
              managing_with_ai: 86,
              designing_with_ai: 86
            },
            totalTasks: 3,
            evaluatedTasks: 3,
            tasks: [
              { taskId: 'task-1', evaluation: { score: 85 } },
              { taskId: 'task-2', evaluation: { score: 86 } },
              { taskId: 'task-3', evaluation: { score: 87 } }
            ],
            qualitativeFeedback: null
          }
        })
      })
    })

    // 6. Verify completion page elements
    await expect(page.locator('h1')).toContainText('Congratulations!')
    await expect(page.locator('text=Overall Score')).toBeVisible()
    await expect(page.locator('text=86%')).toBeVisible()
    await expect(page.locator('text=3/3 Tasks Evaluated')).toBeVisible()

    // 7. Check domain scores
    await expect(page.locator('text=Engaging with AI')).toBeVisible()
    await expect(page.locator('text=Creating with AI')).toBeVisible()
    await expect(page.locator('text=Managing with AI')).toBeVisible()
    await expect(page.locator('text=Designing with AI')).toBeVisible()

    // 8. Generate feedback
    await page.route('**/api/pbl/generate-feedback', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          feedback: {
            overallAssessment: 'Excellent performance in the AI literacy scenario',
            strengths: [{
              area: 'Critical Thinking',
              description: 'Demonstrated strong analytical skills',
              example: 'Asked insightful questions'
            }],
            areasForImprovement: [{
              area: 'Exploration',
              description: 'Could explore more approaches',
              suggestion: 'Try different strategies'
            }],
            nextSteps: ['Practice with more scenarios'],
            encouragement: 'Great job!'
          },
          cached: false
        })
      })
    })

    await page.click('button:has-text("Generate AI Feedback")')
    await expect(page.locator('text=Excellent performance')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Critical Thinking')).toBeVisible()
    await expect(page.locator('text=Great job!')).toBeVisible()
  })

  test('should handle feedback regeneration', async ({ page }) => {
    // Navigate directly to completion page
    await page.goto('/pbl/scenarios/test-scenario-1/programs/test-program-1/complete')

    // Mock initial completion data with existing feedback
    await page.route('**/api/pbl/completion**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            programId: 'test-program-1',
            scenarioId: 'test-scenario-1',
            status: 'completed',
            overallScore: 86,
            domainScores: {
              engaging_with_ai: 85,
              creating_with_ai: 87,
              managing_with_ai: 86,
              designing_with_ai: 86
            },
            qualitativeFeedback: {
              en: {
                content: {
                  overallAssessment: 'Good performance',
                  strengths: [],
                  areasForImprovement: [],
                  nextSteps: [],
                  encouragement: 'Keep it up!'
                },
                isValid: true,
                generatedAt: '2024-01-01T00:00:00Z'
              }
            }
          }
        })
      })
    })

    // Verify existing feedback is shown
    await expect(page.locator('text=Good performance')).toBeVisible()

    // Mock feedback regeneration
    let regenerateCount = 0
    await page.route('**/api/pbl/generate-feedback', async route => {
      regenerateCount++
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          feedback: {
            overallAssessment: 'Updated excellent performance',
            strengths: [{
              area: 'Problem Solving',
              description: 'New strength identified',
              example: 'Creative solutions'
            }],
            areasForImprovement: [],
            nextSteps: ['Continue learning'],
            encouragement: 'Amazing progress!'
          },
          cached: false
        })
      })
    })

    // Click regenerate button
    await page.click('button:has-text("Regenerate Feedback")')
    
    // Verify new feedback is shown
    await expect(page.locator('text=Updated excellent performance')).toBeVisible()
    await expect(page.locator('text=Problem Solving')).toBeVisible()
    await expect(page.locator('text=Amazing progress!')).toBeVisible()
    
    // Verify API was called with forceRegenerate
    expect(regenerateCount).toBe(1)
  })

  test('should handle language switching for feedback', async ({ page }) => {
    // Navigate to completion page
    await page.goto('/pbl/scenarios/test-scenario-1/programs/test-program-1/complete')

    // Mock completion data
    await page.route('**/api/pbl/completion**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            programId: 'test-program-1',
            scenarioId: 'test-scenario-1',
            status: 'completed',
            overallScore: 86,
            domainScores: {
              engaging_with_ai: 85,
              creating_with_ai: 87,
              managing_with_ai: 86,
              designing_with_ai: 86
            },
            qualitativeFeedback: {
              en: {
                content: {
                  overallAssessment: 'English feedback',
                  strengths: [],
                  areasForImprovement: [],
                  nextSteps: [],
                  encouragement: 'Great job!'
                }
              }
            },
            feedbackLanguages: ['en']
          }
        })
      })
    })

    // Verify English feedback
    await expect(page.locator('text=English feedback')).toBeVisible()

    // Mock Japanese feedback generation
    await page.route('**/api/pbl/generate-feedback', async route => {
      const body = await route.request().postDataJSON()
      if (body.language === 'ja') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            feedback: {
              overallAssessment: '日本語のフィードバック',
              strengths: [],
              areasForImprovement: [],
              nextSteps: [],
              encouragement: 'よくできました！'
            },
            language: 'ja',
            cached: false
          })
        })
      } else {
        await route.continue()
      }
    })

    // Switch language to Japanese
    await page.selectOption('select[name="language"]', 'ja')
    
    // Verify Japanese feedback is generated
    await expect(page.locator('text=日本語のフィードバック')).toBeVisible()
    await expect(page.locator('text=よくできました！')).toBeVisible()
  })

  test('should show loading states properly', async ({ page }) => {
    // Navigate to completion page
    await page.goto('/pbl/scenarios/test-scenario-1/programs/test-program-1/complete')

    // Mock slow completion API
    await page.route('**/api/pbl/completion**', async route => {
      await page.waitForTimeout(1000) // Simulate delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            programId: 'test-program-1',
            scenarioId: 'test-scenario-1',
            status: 'completed',
            overallScore: 86,
            domainScores: {},
            qualitativeFeedback: null
          }
        })
      })
    })

    // Verify loading skeleton is shown
    await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible()
    
    // Wait for content to load
    await expect(page.locator('text=Overall Score')).toBeVisible()
    
    // Mock slow feedback generation
    await page.route('**/api/pbl/generate-feedback', async route => {
      await page.waitForTimeout(2000) // Simulate delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          feedback: {
            overallAssessment: 'Feedback loaded',
            strengths: [],
            areasForImprovement: [],
            nextSteps: [],
            encouragement: 'Done!'
          }
        })
      })
    })

    // Click generate feedback
    await page.click('button:has-text("Generate AI Feedback")')
    
    // Verify loading state for feedback
    await expect(page.locator('text=Generating feedback...')).toBeVisible()
    
    // Verify feedback appears
    await expect(page.locator('text=Feedback loaded')).toBeVisible({ timeout: 5000 })
  })

  test('should handle errors gracefully', async ({ page }) => {
    // Navigate to completion page
    await page.goto('/pbl/scenarios/test-scenario-1/programs/test-program-1/complete')

    // Mock API error
    await page.route('**/api/pbl/completion**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Failed to load completion data'
        })
      })
    })

    // Verify error message is shown
    await expect(page.locator('text=Failed to load completion data')).toBeVisible()
    
    // Mock successful retry
    await page.route('**/api/pbl/completion**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            programId: 'test-program-1',
            scenarioId: 'test-scenario-1',
            status: 'completed',
            overallScore: 86,
            domainScores: {},
            qualitativeFeedback: null
          }
        })
      })
    })

    // Click retry button
    await page.click('button:has-text("Retry")')
    
    // Verify data loads successfully
    await expect(page.locator('text=Overall Score')).toBeVisible()
    await expect(page.locator('text=86%')).toBeVisible()
  })
})