import { NextRequest } from 'next/server'
import { POST, GET } from '../route'

// Mock storage service
jest.mock('@/lib/storage/storage-factory', () => ({
  StorageFactory: {
    getService: jest.fn(() => ({
      saveTaskLog: jest.fn(),
      getTaskLogs: jest.fn(),
    })),
  },
}))

// Mock auth utils
jest.mock('@/lib/auth/auth-utils', () => ({
  validateAuthHeader: jest.fn(),
}))

import { StorageFactory } from '@/lib/storage/storage-factory'
import { validateAuthHeader } from '@/lib/auth/auth-utils'

describe('/api/pbl/task-logs', () => {
  const mockStorageService = {
    saveTaskLog: jest.fn(),
    getTaskLogs: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(StorageFactory.getService as jest.Mock).mockReturnValue(mockStorageService)
  })

  describe('POST', () => {
    it('should return 401 for unauthenticated requests', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Unauthorized',
      })

      const request = new NextRequest('http://localhost:3000/api/pbl/task-logs', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should save task log for authenticated users', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      const taskLogData = {
        programId: 'prog123',
        taskId: 'task456',
        action: 'started',
        timestamp: new Date().toISOString(),
        metadata: {
          duration: 0,
          attempts: 1,
        },
      }

      mockStorageService.saveTaskLog.mockResolvedValue({
        id: 'log789',
        ...taskLogData,
        userEmail: 'user@example.com',
      })

      const request = new NextRequest('http://localhost:3000/api/pbl/task-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(taskLogData),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('log789')
      expect(mockStorageService.saveTaskLog).toHaveBeenCalledWith(
        'user@example.com',
        taskLogData
      )
    })

    it('should validate required fields', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      const invalidData = {
        programId: 'prog123',
        // Missing taskId and action
      }

      const request = new NextRequest('http://localhost:3000/api/pbl/task-logs', {
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

    it('should validate action types', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      const invalidActionData = {
        programId: 'prog123',
        taskId: 'task456',
        action: 'invalid-action',
      }

      const request = new NextRequest('http://localhost:3000/api/pbl/task-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(invalidActionData),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid action type')
    })

    it('should handle storage errors gracefully', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      mockStorageService.saveTaskLog.mockRejectedValue(
        new Error('Storage unavailable')
      )

      const taskLogData = {
        programId: 'prog123',
        taskId: 'task456',
        action: 'completed',
      }

      const request = new NextRequest('http://localhost:3000/api/pbl/task-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(taskLogData),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to save task log')
    })
  })

  describe('GET', () => {
    it('should return 401 for unauthenticated requests', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Missing authentication',
      })

      const request = new NextRequest('http://localhost:3000/api/pbl/task-logs')

      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Missing authentication')
    })

    it('should retrieve task logs for authenticated users', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      const mockLogs = [
        {
          id: 'log1',
          programId: 'prog1',
          taskId: 'task1',
          action: 'started',
          timestamp: '2024-01-01T10:00:00Z',
        },
        {
          id: 'log2',
          programId: 'prog1',
          taskId: 'task1',
          action: 'completed',
          timestamp: '2024-01-01T10:30:00Z',
        },
      ]

      mockStorageService.getTaskLogs.mockResolvedValue(mockLogs)

      const request = new NextRequest('http://localhost:3000/api/pbl/task-logs', {
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockLogs)
      expect(mockStorageService.getTaskLogs).toHaveBeenCalledWith(
        'user@example.com',
        {}
      )
    })

    it('should handle query parameters for filtering', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      mockStorageService.getTaskLogs.mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost:3000/api/pbl/task-logs?programId=prog123&taskId=task456&action=completed'
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockStorageService.getTaskLogs).toHaveBeenCalledWith(
        'user@example.com',
        {
          programId: 'prog123',
          taskId: 'task456',
          action: 'completed',
        }
      )
    })

    it('should handle date range filtering', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      mockStorageService.getTaskLogs.mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost:3000/api/pbl/task-logs?startDate=2024-01-01&endDate=2024-01-31'
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockStorageService.getTaskLogs).toHaveBeenCalledWith(
        'user@example.com',
        {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        }
      )
    })

    it('should handle pagination parameters', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      const paginatedResponse = {
        logs: [],
        total: 100,
        page: 2,
        pageSize: 20,
        hasMore: true,
      }

      mockStorageService.getTaskLogs.mockResolvedValue(paginatedResponse)

      const request = new NextRequest(
        'http://localhost:3000/api/pbl/task-logs?page=2&pageSize=20'
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockStorageService.getTaskLogs).toHaveBeenCalledWith(
        'user@example.com',
        {
          page: 2,
          pageSize: 20,
        }
      )
    })

    it('should handle storage errors gracefully', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      mockStorageService.getTaskLogs.mockRejectedValue(
        new Error('Database timeout')
      )

      const request = new NextRequest('http://localhost:3000/api/pbl/task-logs')

      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to retrieve task logs')
    })
  })
})