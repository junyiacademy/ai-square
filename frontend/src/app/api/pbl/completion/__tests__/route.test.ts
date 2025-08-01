import { NextRequest } from 'next/server'

// Mock auth session
const mockGetServerSession = jest.fn()
jest.mock('@/lib/auth/session', () => ({
  getServerSession: mockGetServerSession
}))

// Mock repository factory
const mockGetProgramRepository = jest.fn()
const mockGetTaskRepository = jest.fn()
const mockGetEvaluationRepository = jest.fn()
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getProgramRepository: mockGetProgramRepository,
    getTaskRepository: mockGetTaskRepository,
    getEvaluationRepository: mockGetEvaluationRepository,
  }
}))

import { GET } from '../route'

describe('/api/pbl/completion', () => {
  // Mock repositories
  const mockProgramRepo = {
    findById: jest.fn(),
    update: jest.fn(),
  }
  const mockTaskRepo = {
    findByProgram: jest.fn(),
    getTaskWithInteractions: jest.fn(),
  }
  const mockEvaluationRepo = {
    findByProgram: jest.fn(),
    findByTask: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetProgramRepository.mockReturnValue(mockProgramRepo)
    mockGetTaskRepository.mockReturnValue(mockTaskRepo)
    mockGetEvaluationRepository.mockReturnValue(mockEvaluationRepo)
  })

  // Note: POST functionality removed as route only supports GET

  describe('GET', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/pbl/completion')

      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })

    it('should retrieve completion data for authenticated users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' }
      })

      const mockProgram = {
        id: 'prog1',
        userId: 'user123',
        scenarioId: 'scenario1',
        status: 'completed',
        completedTasks: 3,
        totalTasks: 3,
        endTime: new Date('2024-01-01T00:00:00Z'),
      }

      const mockTasks = [
        { id: 'task1', programId: 'prog1', status: 'completed' },
        { id: 'task2', programId: 'prog1', status: 'completed' },
        { id: 'task3', programId: 'prog1', status: 'completed' },
      ]

      const mockEvaluations = [
        { id: 'eval1', taskId: 'task1', score: 90 },
        { id: 'eval2', taskId: 'task2', score: 85 },
        { id: 'eval3', programId: 'prog1', score: 88 },
      ]

      mockProgramRepo.findById.mockResolvedValue(mockProgram)
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks)
      mockEvaluationRepo.findByProgram.mockResolvedValue(mockEvaluations)

      const request = new NextRequest('http://localhost:3000/api/pbl/completion?programId=prog1')

      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.program).toEqual(expect.objectContaining({
        id: 'prog1',
        status: 'completed'
      }))
      expect(data.data.tasks).toHaveLength(3)
      expect(data.data.evaluations).toHaveLength(3)
    })

    it('should return 404 for non-existent program', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' }
      })

      mockProgramRepo.findById.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/pbl/completion?programId=invalid')

      const response = await GET(request)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Program not found')
    })

    it('should handle missing programId parameter', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' }
      })

      const request = new NextRequest('http://localhost:3000/api/pbl/completion')

      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('programId is required')
    })

    it('should handle repository errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' }
      })

      mockProgramRepo.findById.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/pbl/completion?programId=prog1')

      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to retrieve completion data')
    })
  })
})