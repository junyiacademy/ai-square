import { NextRequest } from 'next/server'
import { POST, GET } from '../route'

// Mock storage service
jest.mock('@/lib/storage/storage-factory', () => ({
  StorageFactory: {
    getService: jest.fn(() => ({
      saveCompletionData: jest.fn(),
      getCompletionData: jest.fn(),
    })),
  },
}))

// Mock auth utils
jest.mock('@/lib/auth/auth-utils', () => ({
  validateAuthHeader: jest.fn(),
}))

import { StorageFactory } from '@/lib/storage/storage-factory'
import { validateAuthHeader } from '@/lib/auth/auth-utils'

describe('/api/pbl/completion', () => {
  const mockStorageService = {
    saveCompletionData: jest.fn(),
    getCompletionData: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(StorageFactory.getService as jest.Mock).mockReturnValue(mockStorageService)
  })

  describe('POST', () => {
    it('should return 401 for unauthenticated requests', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Invalid token',
      })

      const request = new NextRequest('http://localhost:3000/api/pbl/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Invalid token')
    })

    it('should save completion data for authenticated users', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'test@example.com' },
      })

      const completionData = {
        programId: 'prog123',
        scenarioId: 'scenario456',
        completedTasks: ['task1', 'task2'],
        score: 85,
        feedback: 'Great job!',
        timestamp: new Date().toISOString(),
      }

      mockStorageService.saveCompletionData.mockResolvedValue({
        id: 'completion789',
        ...completionData,
      })

      const request = new NextRequest('http://localhost:3000/api/pbl/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(completionData),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('completion789')
      expect(mockStorageService.saveCompletionData).toHaveBeenCalledWith(
        'test@example.com',
        completionData
      )
    })

    it('should validate required fields', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'test@example.com' },
      })

      const invalidData = {
        programId: 'prog123',
        // Missing required fields
      }

      const request = new NextRequest('http://localhost:3000/api/pbl/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Missing required fields')
    })

    it('should handle storage service errors', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'test@example.com' },
      })

      mockStorageService.saveCompletionData.mockRejectedValue(
        new Error('Storage error')
      )

      const completionData = {
        programId: 'prog123',
        scenarioId: 'scenario456',
        completedTasks: ['task1'],
        score: 75,
      }

      const request = new NextRequest('http://localhost:3000/api/pbl/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(completionData),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to save completion data')
    })
  })

  describe('GET', () => {
    it('should return 401 for unauthenticated requests', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'No token provided',
      })

      const request = new NextRequest('http://localhost:3000/api/pbl/completion')

      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('No token provided')
    })

    it('should retrieve completion data for authenticated users', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'test@example.com' },
      })

      const mockCompletions = [
        {
          id: 'comp1',
          programId: 'prog1',
          scenarioId: 'scenario1',
          score: 90,
          completedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'comp2',
          programId: 'prog2',
          scenarioId: 'scenario2',
          score: 85,
          completedAt: '2024-01-02T00:00:00Z',
        },
      ]

      mockStorageService.getCompletionData.mockResolvedValue(mockCompletions)

      const request = new NextRequest('http://localhost:3000/api/pbl/completion', {
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockCompletions)
      expect(mockStorageService.getCompletionData).toHaveBeenCalledWith(
        'test@example.com',
        {}
      )
    })

    it('should handle query parameters for filtering', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'test@example.com' },
      })

      mockStorageService.getCompletionData.mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost:3000/api/pbl/completion?scenarioId=scenario123&programId=prog456'
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockStorageService.getCompletionData).toHaveBeenCalledWith(
        'test@example.com',
        {
          scenarioId: 'scenario123',
          programId: 'prog456',
        }
      )
    })

    it('should handle storage service errors', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'test@example.com' },
      })

      mockStorageService.getCompletionData.mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/pbl/completion')

      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to retrieve completion data')
    })
  })
})