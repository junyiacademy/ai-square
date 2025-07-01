import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock the content service
jest.mock('@/services/content-service', () => ({
  ContentService: {
    getContentHistory: jest.fn(),
  },
}))

// Mock authentication
jest.mock('@/lib/auth/auth-utils', () => ({
  verifyAdminAuth: jest.fn(),
}))

import { ContentService } from '@/services/content-service'
import { verifyAdminAuth } from '@/lib/auth/auth-utils'

describe('/api/admin/history', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 for unauthorized users', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Unauthorized',
      })

      const request = new NextRequest('http://localhost:3000/api/admin/history')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return history with default pagination', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { id: 'admin123', role: 'admin' },
      })

      const mockHistory = {
        items: [
          {
            id: '1',
            contentId: 'content1',
            action: 'created',
            timestamp: '2024-01-01T00:00:00Z',
            user: 'admin123',
          },
          {
            id: '2',
            contentId: 'content2',
            action: 'updated',
            timestamp: '2024-01-02T00:00:00Z',
            user: 'admin123',
          },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      }

      ;(ContentService.getContentHistory as jest.Mock).mockResolvedValue(mockHistory)

      const request = new NextRequest('http://localhost:3000/api/admin/history')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockHistory)
      expect(ContentService.getContentHistory).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        contentType: undefined,
        userId: undefined,
      })
    })

    it('should handle pagination parameters', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { id: 'admin123', role: 'admin' },
      })

      const mockHistory = {
        items: [],
        total: 0,
        page: 2,
        pageSize: 10,
      }

      ;(ContentService.getContentHistory as jest.Mock).mockResolvedValue(mockHistory)

      const request = new NextRequest(
        'http://localhost:3000/api/admin/history?page=2&pageSize=10'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockHistory)
      expect(ContentService.getContentHistory).toHaveBeenCalledWith({
        page: 2,
        pageSize: 10,
        contentType: undefined,
        userId: undefined,
      })
    })

    it('should handle filter parameters', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { id: 'admin123', role: 'admin' },
      })

      const mockHistory = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      }

      ;(ContentService.getContentHistory as jest.Mock).mockResolvedValue(mockHistory)

      const request = new NextRequest(
        'http://localhost:3000/api/admin/history?contentType=rubric&userId=user123'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(ContentService.getContentHistory).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        contentType: 'rubric',
        userId: 'user123',
      })
    })

    it('should handle invalid pagination parameters', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { id: 'admin123', role: 'admin' },
      })

      const mockHistory = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      }

      ;(ContentService.getContentHistory as jest.Mock).mockResolvedValue(mockHistory)

      const request = new NextRequest(
        'http://localhost:3000/api/admin/history?page=invalid&pageSize=-5'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      // Should use default values for invalid parameters
      expect(ContentService.getContentHistory).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        contentType: undefined,
        userId: undefined,
      })
    })

    it('should handle service errors gracefully', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { id: 'admin123', role: 'admin' },
      })

      ;(ContentService.getContentHistory as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/admin/history')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch history')
    })
  })
})