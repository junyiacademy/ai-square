import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import crypto from 'crypto'

// Mock auth session
const mockGetServerSession = jest.fn()
jest.mock('@/lib/auth/session', () => ({
  getServerSession: () => mockGetServerSession()
}))

// Mock repository factory
const mockRepositoryFactory = {
  getProgramRepository: jest.fn(),
  getTaskRepository: jest.fn(),
  getEvaluationRepository: jest.fn(),
  getUserRepository: jest.fn(),
}

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: mockRepositoryFactory
}))

// Mock crypto
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn(() => ({
      digest: jest.fn(() => 'mockhash123')
    }))
  }))
}))

describe.skip('/api/pbl/programs/[programId]/complete', () => {
  // Mock repositories
  const mockProgramRepo = {
    findById: jest.fn(),
    update: jest.fn(),
  }
  const mockTaskRepo = {
    findByProgram: jest.fn(),
    getTaskWithInteractions: jest.fn(),
  }
  const mockEvalRepo = {
    findById: jest.fn(),
    findByTask: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  }
  const mockUserRepo = {
    findByEmail: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo)
    mockRepositoryFactory.getTaskRepository.mockReturnValue(mockTaskRepo)
    mockRepositoryFactory.getEvaluationRepository.mockReturnValue(mockEvalRepo)
    mockRepositoryFactory.getUserRepository.mockReturnValue(mockUserRepo)
    
    // Setup default mocks
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' }
    })
  })

  describe('GET', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog1/complete')

      const response = await GET(request, { params: Promise.resolve({ programId: 'prog1' }) })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })

    it('should return existing evaluation when up to date', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const mockProgram = {
        id: 'prog1',
        userId: 'user123',
        status: 'completed',
        metadata: { evaluationId: 'eval123' }
      }
      const mockEvaluation = {
        id: 'eval123',
        score: 85,
        metadata: {
          domainScores: {
            engaging_with_ai: 85,
            creating_with_ai: 90,
            managing_with_ai: 80,
            designing_with_ai: 85
          },
          ksaScores: {
            knowledge: 85,
            skills: 80,
            attitudes: 90
          },
          isLatest: true,
          syncChecksum: 'mockhash',
          lastSyncedAt: '2024-01-01T00:00:00Z'
        }
      }

      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockProgramRepo.findById.mockResolvedValue(mockProgram)
      mockEvalRepo.findById.mockResolvedValue(mockEvaluation)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog1/complete')

      const response = await GET(request, { params: Promise.resolve({ programId: 'prog1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.evaluation).toEqual(mockEvaluation)
      expect(data.updateReason).toBe('existing')
    })

    it('should return needs update when evaluation is missing', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const mockProgram = {
        id: 'prog1',
        userId: 'user123',
        status: 'completed',
        metadata: {}
      }

      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockProgramRepo.findById.mockResolvedValue(mockProgram)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog1/complete')

      const response = await GET(request, { params: Promise.resolve({ programId: 'prog1' }) })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.needsUpdate).toBe(true)
      expect(data.reason).toBe('no_evaluation')
    })

    it('should return needs update when checksum mismatch', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const mockProgram = {
        id: 'prog1',
        userId: 'user123',
        status: 'completed',
        metadata: { evaluationId: 'eval123' }
      }
      const mockEvaluation = {
        id: 'eval123',
        score: 85,
        metadata: {
          isLatest: true,
          syncChecksum: 'oldhash'
        }
      }
      const mockTasks = [
        { id: 'task1', metadata: { evaluationId: 'task-eval1' }, completedAt: '2024-01-01' }
      ]

      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockProgramRepo.findById.mockResolvedValue(mockProgram)
      mockEvalRepo.findById.mockResolvedValue(mockEvaluation)
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog1/complete')

      const response = await GET(request, { params: Promise.resolve({ programId: 'prog1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.needsUpdate).toBe(true)
      expect(data.reason).toBe('checksum_mismatch')
    })

    it('should return 403 for unauthorized access', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const mockProgram = {
        id: 'prog1',
        userId: 'different-user',
        metadata: {}
      }

      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockProgramRepo.findById.mockResolvedValue(mockProgram)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog1/complete')

      const response = await GET(request, { params: Promise.resolve({ programId: 'prog1' }) })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })
  })

  describe('POST', () => {
    it('should create new evaluation when none exists', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const mockProgram = {
        id: 'prog1',
        userId: 'user123',
        status: 'active',
        metadata: {}
      }
      const mockTasks = [
        { 
          id: 'task1', 
          status: 'completed',
          metadata: { evaluationId: 'task-eval1' } 
        },
        { 
          id: 'task2', 
          status: 'completed',
          metadata: { evaluationId: 'task-eval2' } 
        }
      ]
      const mockTaskEvaluations = [
        {
          id: 'task-eval1',
          score: 85,
          metadata: {
            domainScores: { engaging_with_ai: 85 },
            ksaScores: { knowledge: 85, skills: 80, attitudes: 90 }
          }
        },
        {
          id: 'task-eval2',
          score: 90,
          metadata: {
            domainScores: { creating_with_ai: 90 },
            ksaScores: { knowledge: 90, skills: 85, attitudes: 95 }
          }
        }
      ]
      const mockTaskWithInteractions = {
        id: 'task1',
        interactions: [
          { type: 'user_input', timestamp: '2024-01-01T00:00:00Z' },
          { type: 'assistant', timestamp: '2024-01-01T00:10:00Z' }
        ]
      }
      const mockCreatedEvaluation = {
        id: 'new-eval-123',
        score: 87.5,
        metadata: {
          domainScores: {
            engaging_with_ai: 85,
            creating_with_ai: 90,
            managing_with_ai: 0,
            designing_with_ai: 0
          }
        }
      }

      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockProgramRepo.findById.mockResolvedValue(mockProgram)
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks)
      mockEvalRepo.findByTask.mockImplementation((taskId) => {
        const task = mockTaskEvaluations.find(t => t.id === mockTasks.find(mt => mt.metadata.evaluationId === t.id)?.metadata.evaluationId)
        return Promise.resolve(task ? [task] : [])
      })
      mockTaskRepo.getTaskWithInteractions.mockResolvedValue(mockTaskWithInteractions)
      mockEvalRepo.create.mockResolvedValue(mockCreatedEvaluation)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog1/complete', {
        method: 'POST'
      })

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.evaluation).toEqual(mockCreatedEvaluation)
      expect(data.debug.updateReason).toBe('new_evaluation')
      
      // Should update program status
      expect(mockProgramRepo.update).toHaveBeenCalledWith('prog1', {
        status: 'completed',
        completedAt: expect.any(String),
        metadata: expect.objectContaining({
          evaluationId: 'new-eval-123'
        })
      })
    })

    it('should update existing evaluation when scores change', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const mockProgram = {
        id: 'prog1',
        userId: 'user123',
        status: 'completed',
        metadata: { evaluationId: 'eval123' }
      }
      const mockExistingEvaluation = {
        id: 'eval123',
        score: 75,
        metadata: {
          evaluatedTaskCount: 1,
          qualitativeFeedback: {
            en: { content: 'Old feedback', isValid: true }
          }
        }
      }
      const mockTasks = [
        { 
          id: 'task1', 
          status: 'completed',
          metadata: { evaluationId: 'task-eval1' } 
        },
        { 
          id: 'task2', 
          status: 'completed',
          metadata: { evaluationId: 'task-eval2' } 
        }
      ]
      const mockTaskEvaluations = [
        {
          id: 'task-eval1',
          score: 85,
          metadata: {
            domainScores: { engaging_with_ai: 85 },
            ksaScores: { knowledge: 85, skills: 80, attitudes: 90 }
          }
        },
        {
          id: 'task-eval2',
          score: 90,
          metadata: {
            domainScores: { creating_with_ai: 90 },
            ksaScores: { knowledge: 90, skills: 85, attitudes: 95 }
          }
        }
      ]
      const mockUpdatedEvaluation = {
        id: 'eval123',
        score: 87.5,
        metadata: {
          domainScores: {
            engaging_with_ai: 85,
            creating_with_ai: 90,
            managing_with_ai: 0,
            designing_with_ai: 0
          },
          qualitativeFeedback: {
            en: { content: 'Old feedback', isValid: false }
          },
          lastSyncedAt: '2024-01-02T00:00:00Z'
        }
      }

      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockProgramRepo.findById.mockResolvedValue(mockProgram)
      mockEvalRepo.findById.mockResolvedValue(mockExistingEvaluation)
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks)
      mockEvalRepo.findByTask.mockImplementation((taskId) => {
        const task = mockTaskEvaluations.find(t => t.id === mockTasks.find(mt => mt.metadata.evaluationId === t.id)?.metadata.evaluationId)
        return Promise.resolve(task ? [task] : [])
      })
      mockTaskRepo.getTaskWithInteractions.mockResolvedValue({ id: 'task1', interactions: [] })
      mockEvalRepo.update.mockResolvedValue(mockUpdatedEvaluation)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog1/complete', {
        method: 'POST'
      })

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.evaluation).toEqual(mockUpdatedEvaluation)
      expect(data.debug.updateReason).toBe('score_update')
      
      // Should update evaluation with new scores
      expect(mockEvalRepo.update).toHaveBeenCalledWith('eval123', {
        score: 87.5,
        domainScores: expect.objectContaining({
          engaging_with_ai: 85,
          creating_with_ai: 90
        }),
        metadata: expect.objectContaining({
          lastSyncedAt: expect.any(String),
          qualitativeFeedback: expect.objectContaining({
            en: { content: 'Old feedback', isValid: false }
          })
        })
      })
    })

    it('should handle empty domain scores gracefully', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const mockProgram = {
        id: 'prog1',
        userId: 'user123',
        status: 'active',
        metadata: {}
      }
      const mockTasks = [
        { 
          id: 'task1', 
          status: 'completed',
          metadata: { evaluationId: 'task-eval1' } 
        }
      ]
      const mockTaskEvaluation = {
        id: 'task-eval1',
        score: 50,
        metadata: {} // No domain scores
      }
      const mockCreatedEvaluation = {
        id: 'new-eval-123',
        score: 50,
        metadata: {
          domainScores: {}
        }
      }

      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockProgramRepo.findById.mockResolvedValue(mockProgram)
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks)
      mockEvalRepo.findByTask.mockResolvedValue([mockTaskEvaluation])
      mockTaskRepo.getTaskWithInteractions.mockResolvedValue({ id: 'task1', interactions: [] })
      mockEvalRepo.create.mockResolvedValue(mockCreatedEvaluation)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog1/complete', {
        method: 'POST'
      })

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.evaluation.score).toBe(50)
      expect(data.evaluation.metadata.domainScores).toEqual({})
    })

    it('should handle no evaluated tasks', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const mockProgram = {
        id: 'prog1',
        userId: 'user123',
        status: 'active',
        metadata: {}
      }
      const mockTasks = [
        { id: 'task1', status: 'pending', metadata: {} },
        { id: 'task2', status: 'pending', metadata: {} }
      ]
      const mockCreatedEvaluation = {
        id: 'new-eval-123',
        score: 0,
        metadata: {
          domainScores: {},
          evaluatedTasks: 0
        }
      }

      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockProgramRepo.findById.mockResolvedValue(mockProgram)
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks)
      mockEvalRepo.findByTask.mockResolvedValue([])
      mockTaskRepo.getTaskWithInteractions.mockResolvedValue({ id: 'task1', interactions: [] })
      mockEvalRepo.create.mockResolvedValue(mockCreatedEvaluation)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog1/complete', {
        method: 'POST'
      })

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.evaluation.score).toBe(0)
      expect(data.evaluation.metadata.evaluatedTasks).toBe(0)
    })

    it('should return 404 for non-existent program', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' }

      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockProgramRepo.findById.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog1/complete', {
        method: 'POST'
      })

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog1' }) })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Program not found')
    })

    it('should return 403 for unauthorized access', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const mockProgram = {
        id: 'prog1',
        userId: 'different-user',
        metadata: {}
      }

      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockProgramRepo.findById.mockResolvedValue(mockProgram)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog1/complete', {
        method: 'POST'
      })

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog1' }) })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should handle invalid scores with NaN', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const mockProgram = {
        id: 'prog1',
        userId: 'user123',
        status: 'active',
        metadata: {}
      }
      const mockTasks = [
        { 
          id: 'task1', 
          status: 'completed',
          metadata: { evaluationId: 'task-eval1' } 
        }
      ]
      const mockTaskEvaluation = {
        id: 'task-eval1',
        score: 'invalid', // This will cause NaN
        metadata: {}
      }
      const mockCreatedEvaluation = {
        id: 'new-eval-123',
        score: 0, // Should default to 0
        metadata: {}
      }

      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockProgramRepo.findById.mockResolvedValue(mockProgram)
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks)
      mockEvalRepo.findByTask.mockResolvedValue([mockTaskEvaluation])
      mockTaskRepo.getTaskWithInteractions.mockResolvedValue({ id: 'task1', interactions: [] })
      mockEvalRepo.create.mockResolvedValue(mockCreatedEvaluation)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog1/complete', {
        method: 'POST'
      })

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.evaluation.score).toBe(0)
      
      // Should create evaluation with score 0
      expect(mockEvalRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 0
        })
      )
    })
  })
})