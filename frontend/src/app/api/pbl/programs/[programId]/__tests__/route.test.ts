import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '../route'

// Mock storage service
jest.mock('@/lib/storage/storage-factory', () => ({
  StorageFactory: {
    getService: jest.fn(() => ({
      getProgram: jest.fn(),
      updateProgram: jest.fn(),
      deleteProgram: jest.fn(),
    })),
  },
}))

// Mock auth utils
jest.mock('@/lib/auth/auth-utils', () => ({
  validateAuthHeader: jest.fn(),
}))

import { StorageFactory } from '@/lib/storage/storage-factory'
import { validateAuthHeader } from '@/lib/auth/auth-utils'

describe('/api/pbl/programs/[programId]', () => {
  const mockStorageService = {
    getProgram: jest.fn(),
    updateProgram: jest.fn(),
    deleteProgram: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(StorageFactory.getService as jest.Mock).mockReturnValue(mockStorageService)
  })

  describe('GET', () => {
    const mockProgram = {
      id: 'prog123',
      userId: 'user@example.com',
      scenarioId: 'scenario456',
      status: 'active',
      startedAt: '2024-01-01T00:00:00Z',
      tasks: [
        { id: 'task1', status: 'completed' },
        { id: 'task2', status: 'in_progress' },
      ],
    }

    it('should return 401 for unauthenticated requests', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'No token provided',
      })

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog123')
      const response = await GET(request, { params: { programId: 'prog123' } })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('No token provided')
    })

    it('should return program for authenticated user', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      mockStorageService.getProgram.mockResolvedValue(mockProgram)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog123', {
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      })

      const response = await GET(request, { params: { programId: 'prog123' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockProgram)
      expect(mockStorageService.getProgram).toHaveBeenCalledWith('user@example.com', 'prog123')
    })

    it('should return 404 for non-existent program', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      mockStorageService.getProgram.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/nonexistent')
      const response = await GET(request, { params: { programId: 'nonexistent' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Program not found')
    })

    it('should handle storage errors gracefully', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      mockStorageService.getProgram.mockRejectedValue(new Error('Storage error'))

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog123')
      const response = await GET(request, { params: { programId: 'prog123' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to retrieve program')
    })
  })

  describe('PUT', () => {
    it('should return 401 for unauthenticated requests', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Invalid token',
      })

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog123', {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' }),
      })

      const response = await PUT(request, { params: { programId: 'prog123' } })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Invalid token')
    })

    it('should update program for authenticated user', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      const updates = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        score: 85,
      }

      const updatedProgram = {
        id: 'prog123',
        ...updates,
      }

      mockStorageService.updateProgram.mockResolvedValue(updatedProgram)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(updates),
      })

      const response = await PUT(request, { params: { programId: 'prog123' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(updatedProgram)
      expect(mockStorageService.updateProgram).toHaveBeenCalledWith(
        'user@example.com',
        'prog123',
        updates
      )
    })

    it('should validate update fields', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      const invalidUpdates = {
        invalidField: 'value',
        anotherInvalid: 123,
      }

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(invalidUpdates),
      })

      const response = await PUT(request, { params: { programId: 'prog123' } })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid update fields')
    })

    it('should handle partial updates', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      const partialUpdate = {
        currentTaskId: 'task3',
      }

      mockStorageService.updateProgram.mockResolvedValue({
        id: 'prog123',
        ...partialUpdate,
      })

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(partialUpdate),
      })

      const response = await PUT(request, { params: { programId: 'prog123' } })

      expect(response.status).toBe(200)
      expect(mockStorageService.updateProgram).toHaveBeenCalledWith(
        'user@example.com',
        'prog123',
        partialUpdate
      )
    })

    it('should handle JSON parsing errors', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: 'invalid json',
      })

      const response = await PUT(request, { params: { programId: 'prog123' } })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request body')
    })
  })

  describe('DELETE', () => {
    it('should return 401 for unauthenticated requests', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Unauthorized',
      })

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { programId: 'prog123' } })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should delete program for authenticated user', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      mockStorageService.deleteProgram.mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog123', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      })

      const response = await DELETE(request, { params: { programId: 'prog123' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.message).toBe('Program deleted successfully')
      expect(mockStorageService.deleteProgram).toHaveBeenCalledWith(
        'user@example.com',
        'prog123'
      )
    })

    it('should return 404 when trying to delete non-existent program', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      mockStorageService.deleteProgram.mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/nonexistent', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { programId: 'nonexistent' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Program not found')
    })

    it('should handle storage errors during deletion', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      mockStorageService.deleteProgram.mockRejectedValue(
        new Error('Failed to delete from storage')
      )

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { programId: 'prog123' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to delete program')
    })

    it('should prevent deletion of active programs', async () => {
      ;(validateAuthHeader as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { email: 'user@example.com' },
      })

      // First get the program to check its status
      mockStorageService.getProgram.mockResolvedValue({
        id: 'prog123',
        status: 'active',
      })

      const request = new NextRequest('http://localhost:3000/api/pbl/programs/prog123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { programId: 'prog123' } })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Cannot delete active program')
    })
  })
})