/**
 * Integration Tests - PBL Unified Architecture APIs
 * 測試更新後的 PBL API 端點是否正確使用新架構
 */

import { NextRequest } from 'next/server'
import { POST as chatPOST } from '../chat/route'
import { POST as evaluatePOST } from '../evaluate/route'
import { GET as scenariosGET } from '../scenarios/route'
import { GET as programsGET } from '../programs/[id]/route'

// Mock dependencies
jest.mock('@/lib/core/services/service-factory')
jest.mock('@/lib/services/pbl-scenario.service')
jest.mock('@google-cloud/vertexai')

// Mock service factory
const mockServices = {
  trackService: {
    getTrack: jest.fn(),
    createTrack: jest.fn()
  },
  programService: {
    getProgram: jest.fn(),
    createProgram: jest.fn()
  },
  taskService: {
    getTask: jest.fn(),
    createTask: jest.fn(),
    updateTaskProgress: jest.fn()
  },
  logService: {
    createLog: jest.fn(),
    getLogs: jest.fn()
  }
}

const { getServices } = require('@/lib/core/services/service-factory')
getServices.mockReturnValue(mockServices)

// Mock PBL scenario service
const mockPblScenarioService = {
  loadScenario: jest.fn(),
  getTaskConfig: jest.fn(),
  getAvailableScenarios: jest.fn()
}

const { pblScenarioService } = require('@/lib/services/pbl-scenario.service')
Object.assign(pblScenarioService, mockPblScenarioService)

// Mock Vertex AI
const mockVertexAI = {
  getGenerativeModel: jest.fn(() => ({
    generateContent: jest.fn(() => ({
      response: {
        candidates: [{
          content: {
            parts: [{
              text: 'Mock AI response'
            }]
          }
        }]
      }
    }))
  }))
}

const { VertexAI } = require('@google-cloud/vertexai')
VertexAI.mockImplementation(() => mockVertexAI)

// Helper function to create mock request
function createMockRequest(method: string, url: string, body?: any, cookies?: Record<string, string>) {
  const request = {
    method,
    url,
    json: jest.fn().mockResolvedValue(body),
    cookies: {
      get: jest.fn((name: string) => ({
        value: cookies?.[name] ? JSON.stringify({ email: cookies[name] }) : undefined
      }))
    },
    headers: {
      get: jest.fn((name: string) => {
        if (name === 'accept-language') return 'en-US,en;q=0.9'
        return null
      })
    }
  } as unknown as NextRequest

  return request
}

describe('PBL Unified Architecture APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Chat API (/api/pbl/chat)', () => {
    it('should use new architecture parameters', async () => {
      const mockTask = {
        taskId: 'test-task-123',
        programId: 'test-program-456',
        title: 'Test Task',
        description: 'Test Description',
        status: 'ACTIVE',
        progress: {
          attempts: 1,
          timeSpent: 300,
          completed: false
        }
      }

      const mockScenario = {
        id: 'ai-job-search',
        title: 'AI Job Search',
        tasks: [{
          id: 'test-task-123',
          title: 'Test Task',
          aiModule: {
            role: 'tutor',
            model: 'gemini-2.5-flash',
            persona: 'AI Assistant',
            initialPrompt: 'You are a helpful assistant'
          }
        }]
      }

      const mockTaskConfig = {
        id: 'test-task-123',
        title: 'Test Task',
        description: 'Test Description',
        aiModule: {
          role: 'tutor',
          model: 'gemini-2.5-flash',
          persona: 'AI Assistant',
          initialPrompt: 'You are a helpful assistant'
        }
      }

      mockServices.taskService.getTask.mockResolvedValue(mockTask)
      mockPblScenarioService.loadScenario.mockResolvedValue(mockScenario)
      mockPblScenarioService.getTaskConfig.mockResolvedValue(mockTaskConfig)

      const request = createMockRequest('POST', '/api/pbl/chat', {
        message: 'Hello AI',
        trackId: 'test-track-789',
        programId: 'test-program-456',
        taskId: 'test-task-123',
        context: {
          scenarioId: 'ai-job-search',
          conversationHistory: []
        }
      }, { user: 'test@example.com' })

      const response = await chatPOST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.response).toBe('Mock AI response')

      // Verify new architecture services were called
      expect(mockServices.taskService.getTask).toHaveBeenCalledWith(
        'test@example.com',
        'test-program-456',
        'test-task-123'
      )

      expect(mockServices.logService.createLog).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          type: 'INTERACTION',
          severity: 'INFO',
          message: 'PBL Chat interaction',
          details: expect.objectContaining({
            trackId: 'test-track-789',
            programId: 'test-program-456',
            taskId: 'test-task-123'
          })
        })
      )
    })

    it('should reject requests missing new architecture parameters', async () => {
      const request = createMockRequest('POST', '/api/pbl/chat', {
        message: 'Hello AI',
        // Missing trackId, programId, taskId
        context: {
          scenarioId: 'ai-job-search'
        }
      }, { user: 'test@example.com' })

      const response = await chatPOST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Missing required fields')
    })
  })

  describe('Evaluate API (/api/pbl/evaluate)', () => {
    it('should save evaluation results to new architecture', async () => {
      const mockTask = {
        taskId: 'test-task-123',
        programId: 'test-program-456',
        progress: {
          attempts: 1,
          timeSpent: 1800,
          completed: false
        }
      }

      mockServices.taskService.getTask.mockResolvedValue(mockTask)

      const request = createMockRequest('POST', '/api/pbl/evaluate', {
        conversations: [
          { type: 'user', content: 'I want to find a job' },
          { type: 'assistant', content: 'I can help you with that' }
        ],
        task: {
          id: 'test-task-123',
          title: 'Job Search Task',
          description: 'Find suitable job opportunities'
        },
        trackId: 'test-track-789',
        programId: 'test-program-456',
        taskId: 'test-task-123',
        targetDomains: ['engaging_with_ai'],
        focusKSA: ['K1.1', 'S2.3']
      }, { user: 'test@example.com' })

      // Mock Vertex AI response schema
      mockVertexAI.getGenerativeModel().generateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  score: 75,
                  ksaScores: {
                    knowledge: 70,
                    skills: 75,
                    attitudes: 80
                  },
                  domainScores: {
                    engaging_with_ai: 75,
                    creating_with_ai: 70,
                    managing_with_ai: 75,
                    designing_with_ai: 70
                  },
                  rubricsScores: {
                    'Research Quality': 3,
                    'AI Utilization': 3,
                    'Content Quality': 3,
                    'Learning Progress': 3
                  },
                  conversationInsights: {
                    effectiveExamples: [],
                    improvementAreas: []
                  },
                  strengths: ['Good engagement with AI (A1.1)'],
                  improvements: ['Could explore more specific questions (K1.2)'],
                  nextSteps: ['Practice advanced search techniques (S2.1)']
                })
              }]
            }
          }]
        }
      })

      const response = await evaluatePOST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.evaluation.score).toBe(75)

      // Verify evaluation was saved to task progress
      expect(mockServices.taskService.updateTaskProgress).toHaveBeenCalledWith(
        'test@example.com',
        'test-program-456',
        'test-task-123',
        expect.objectContaining({
          score: 75,
          evaluation: expect.objectContaining({
            overallScore: 75,
            evaluatedBy: 'ai-system'
          })
        })
      )

      // Verify evaluation was logged
      expect(mockServices.logService.createLog).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          type: 'EVALUATION',
          severity: 'INFO',
          message: 'PBL Task evaluation completed'
        })
      )
    })
  })

  describe('Scenarios API (/api/pbl/scenarios)', () => {
    it('should use new PBLScenarioService', async () => {
      const mockScenarios = [
        {
          id: 'ai-job-search',
          title: 'AI Job Search',
          description: 'Learn to search for jobs with AI',
          difficulty: 'beginner',
          estimatedTime: 60,
          language: 'en'
        }
      ]

      mockPblScenarioService.getAvailableScenarios.mockResolvedValue(mockScenarios)

      const request = createMockRequest('GET', '/api/pbl/scenarios?lang=en')

      const response = await scenariosGET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.scenarios).toHaveLength(1)
      expect(responseData.data.scenarios[0].id).toBe('ai-job-search')

      // Verify new service was called
      expect(mockPblScenarioService.getAvailableScenarios).toHaveBeenCalledWith('en')
    })
  })

  describe('Programs API (/api/pbl/programs/[programId])', () => {
    it('should use new ProgramService', async () => {
      const mockProgram = {
        programId: 'test-program-456',
        trackId: 'test-track-789',
        type: 'PBL',
        status: 'ACTIVE',
        scenarioId: 'ai-job-search'
      }

      mockServices.programService.getProgram.mockResolvedValue(mockProgram)

      const request = createMockRequest(
        'GET', 
        '/api/pbl/programs/test-program-456?scenarioId=ai-job-search',
        undefined,
        { user: 'test@example.com' }
      )

      const response = await programsGET(request, { 
        params: Promise.resolve({ programId: 'test-program-456' }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.program.programId).toBe('test-program-456')

      // Verify new service was called
      expect(mockServices.programService.getProgram).toHaveBeenCalledWith(
        'test@example.com',
        'test-program-456'
      )
    })
  })

  describe('Authentication', () => {
    it('should require user authentication for all endpoints', async () => {
      const endpoints = [
        () => chatPOST(createMockRequest('POST', '/api/pbl/chat', {})),
        () => evaluatePOST(createMockRequest('POST', '/api/pbl/evaluate', {})),
        () => programsGET(createMockRequest('GET', '/api/pbl/programs/test'), { 
          params: Promise.resolve({ programId: 'test' }) 
        })
      ]

      for (const endpoint of endpoints) {
        const response = await endpoint()
        expect(response.status).toBe(401)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle service unavailability gracefully', async () => {
      getServices.mockImplementation(() => {
        throw new Error('Services not available')
      })

      const request = createMockRequest('POST', '/api/pbl/chat', {
        message: 'Hello',
        trackId: 'test',
        programId: 'test',
        taskId: 'test',
        context: { scenarioId: 'test' }
      }, { user: 'test@example.com' })

      const response = await chatPOST(request)
      const responseData = await response.json()

      expect(response.status).toBe(503)
      expect(responseData.error).toBe('Architecture services not available')
    })

    it('should handle missing tasks gracefully', async () => {
      mockServices.taskService.getTask.mockResolvedValue(null)

      const request = createMockRequest('POST', '/api/pbl/chat', {
        message: 'Hello',
        trackId: 'test',
        programId: 'test',
        taskId: 'non-existent',
        context: { scenarioId: 'test' }
      }, { user: 'test@example.com' })

      const response = await chatPOST(request)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('Task not found')
    })
  })
})

describe('Data Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getServices.mockReturnValue(mockServices)
  })

  it('should maintain data consistency across services', async () => {
    // Simulate a complete workflow: chat -> evaluation -> program update
    const trackId = 'test-track-123'
    const programId = 'test-program-456'
    const taskId = 'test-task-789'
    const userEmail = 'test@example.com'

    // Mock task and scenario data
    mockServices.taskService.getTask.mockResolvedValue({
      taskId,
      programId,
      title: 'Test Task',
      status: 'ACTIVE',
      progress: { attempts: 0, timeSpent: 0, completed: false }
    })

    mockPblScenarioService.loadScenario.mockResolvedValue({
      id: 'test-scenario',
      tasks: [{
        id: taskId,
        aiModule: {
          role: 'tutor',
          model: 'gemini-2.5-flash',
          persona: 'AI Assistant',
          initialPrompt: 'You are helpful'
        }
      }]
    })

    mockPblScenarioService.getTaskConfig.mockResolvedValue({
      id: taskId,
      title: 'Test Task',
      aiModule: {
        role: 'tutor',
        model: 'gemini-2.5-flash'
      }
    })

    // 1. Chat interaction
    const chatRequest = createMockRequest('POST', '/api/pbl/chat', {
      message: 'Hello AI',
      trackId,
      programId,
      taskId,
      context: { scenarioId: 'test-scenario' }
    }, { user: userEmail })

    const chatResponse = await chatPOST(chatRequest)
    expect(chatResponse.status).toBe(200)

    // Verify logging
    expect(mockServices.logService.createLog).toHaveBeenCalledWith(
      userEmail,
      expect.objectContaining({
        type: 'INTERACTION',
        details: expect.objectContaining({ trackId, programId, taskId })
      })
    )

    // 2. Evaluation
    mockVertexAI.getGenerativeModel().generateContent.mockResolvedValue({
      response: {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                score: 80,
                ksaScores: { knowledge: 80, skills: 80, attitudes: 80 },
                domainScores: {
                  engaging_with_ai: 80,
                  creating_with_ai: 80,
                  managing_with_ai: 80,
                  designing_with_ai: 80
                },
                rubricsScores: {
                  'Research Quality': 3,
                  'AI Utilization': 3,
                  'Content Quality': 3,
                  'Learning Progress': 3
                },
                conversationInsights: { effectiveExamples: [], improvementAreas: [] },
                strengths: ['Good performance'],
                improvements: ['Keep it up'],
                nextSteps: ['Continue learning']
              })
            }]
          }
        }]
      }
    })

    const evaluateRequest = createMockRequest('POST', '/api/pbl/evaluate', {
      conversations: [{ type: 'user', content: 'Hello AI' }],
      task: { id: taskId, title: 'Test Task' },
      trackId,
      programId,
      taskId
    }, { user: userEmail })

    const evaluateResponse = await evaluatePOST(evaluateRequest)
    expect(evaluateResponse.status).toBe(200)

    // Verify evaluation was saved and logged
    expect(mockServices.taskService.updateTaskProgress).toHaveBeenCalledWith(
      userEmail,
      programId,
      taskId,
      expect.objectContaining({
        score: 80,
        evaluation: expect.objectContaining({
          overallScore: 80,
          evaluatedBy: 'ai-system'
        })
      })
    )

    expect(mockServices.logService.createLog).toHaveBeenCalledWith(
      userEmail,
      expect.objectContaining({
        type: 'EVALUATION',
        details: expect.objectContaining({ trackId, programId, taskId })
      })
    )
  })
})