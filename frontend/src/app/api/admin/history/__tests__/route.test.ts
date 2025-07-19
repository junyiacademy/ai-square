import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock the content service
jest.mock('@/lib/cms/content-service', () => ({
  contentService: {
    getHistory: jest.fn(),
  },
}))

// Mock authentication
jest.mock('@/lib/auth/auth-utils', () => ({
  getAuthFromRequest: jest.fn(),
  hasRole: jest.fn(),
}))

import { contentService } from '@/lib/cms/content-service'
import { getAuthFromRequest, hasRole } from '@/lib/auth/auth-utils'

describe('/api/admin/history', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 for unauthorized users', async () => {
      ;(getAuthFromRequest as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/admin/history')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return content history for authorized admin', async () => {
      ;(getAuthFromRequest as jest.Mock).mockResolvedValue({
        userId: 123,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      })
      ;(hasRole as jest.Mock).mockReturnValue(true)

      const mockHistory = {
        history: [
          {
            id: 'hist1',
            contentId: 'content123',
            version: 2,
            updatedAt: new Date().toISOString(),
            user: 'admin@example.com',
          },
          {
            id: 'hist2',
            contentId: 'content123',
            version: 1,
            updatedAt: new Date().toISOString(),
            user: 'admin123',
          },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      }

      ;(contentService.getHistory as jest.Mock).mockResolvedValue(mockHistory)

      const request = new NextRequest('http://localhost:3000/api/admin/history')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockHistory)
      expect(contentService.getHistory).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        contentType: undefined,
        contentId: undefined,
      })
    })

    it('should filter by content type', async () => {
      ;(getAuthFromRequest as jest.Mock).mockResolvedValue({
        userId: 123,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      })
      ;(hasRole as jest.Mock).mockReturnValue(true)

      const mockHistory = {
        history: [],
        total: 0,
        page: 1,
        pageSize: 20,
      }

      ;(contentService.getHistory as jest.Mock).mockResolvedValue(mockHistory)

      const request = new NextRequest('http://localhost:3000/api/admin/history?contentType=rubric')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockHistory)
      expect(contentService.getHistory).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        contentType: 'rubric',
        contentId: undefined,
      })
    })

    it('should filter by content ID', async () => {
      ;(getAuthFromRequest as jest.Mock).mockResolvedValue({
        userId: 123,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      })
      ;(hasRole as jest.Mock).mockReturnValue(true)

      const mockHistory = {
        history: [],
        total: 0,
        page: 1,
        pageSize: 20,
      }

      ;(contentService.getHistory as jest.Mock).mockResolvedValue(mockHistory)

      const request = new NextRequest('http://localhost:3000/api/admin/history?contentId=content123')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockHistory)
      expect(contentService.getHistory).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        contentType: undefined,
        contentId: 'content123',
      })
    })

    it('should support pagination', async () => {
      ;(getAuthFromRequest as jest.Mock).mockResolvedValue({
        userId: 123,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      })
      ;(hasRole as jest.Mock).mockReturnValue(true)

      const mockHistory = {
        history: [],
        total: 50,
        page: 2,
        pageSize: 10,
      }

      ;(contentService.getHistory as jest.Mock).mockResolvedValue(mockHistory)

      const request = new NextRequest('http://localhost:3000/api/admin/history?page=2&pageSize=10')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockHistory)
      expect(contentService.getHistory).toHaveBeenCalledWith({
        page: 2,
        pageSize: 10,
        contentType: undefined,
        contentId: undefined,
      })
    })

    it('should handle service errors gracefully', async () => {
      ;(getAuthFromRequest as jest.Mock).mockResolvedValue({
        userId: 123,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      })
      ;(hasRole as jest.Mock).mockReturnValue(true)

      ;(contentService.getHistory as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )

      const request = new NextRequest('http://localhost:3000/api/admin/history')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch history')
    })
  })
})