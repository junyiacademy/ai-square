import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock the content service
jest.mock('@/services/content-service', () => ({
  ContentService: {
    getContentStats: jest.fn(),
  },
}))

// Mock authentication
jest.mock('@/lib/auth/auth-utils', () => ({
  verifyAdminAuth: jest.fn(),
}))

import { ContentService } from '@/services/content-service'
import { verifyAdminAuth } from '@/lib/auth/auth-utils'

describe('/api/admin/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 for unauthorized users', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Unauthorized',
      })

      const request = new NextRequest('http://localhost:3000/api/admin/stats')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return content statistics for authorized admin', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { id: 'admin123', role: 'admin' },
      })

      const mockStats = {
        totalContent: 150,
        contentByType: {
          rubric: 50,
          scenario: 75,
          assessment: 25,
        },
        recentActivity: [
          {
            date: '2024-01-01',
            created: 5,
            updated: 10,
            deleted: 1,
          },
          {
            date: '2024-01-02',
            created: 3,
            updated: 8,
            deleted: 0,
          },
        ],
        activeUsers: 42,
        topContributors: [
          { userId: 'user1', name: 'John Doe', contributions: 25 },
          { userId: 'user2', name: 'Jane Smith', contributions: 18 },
        ],
      }

      ;(ContentService.getContentStats as jest.Mock).mockResolvedValue(mockStats)

      const request = new NextRequest('http://localhost:3000/api/admin/stats')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockStats)
      expect(ContentService.getContentStats).toHaveBeenCalled()
    })

    it('should handle date range parameters', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { id: 'admin123', role: 'admin' },
      })

      const mockStats = {
        totalContent: 50,
        contentByType: {
          rubric: 20,
          scenario: 30,
        },
        recentActivity: [],
        activeUsers: 10,
        topContributors: [],
      }

      ;(ContentService.getContentStats as jest.Mock).mockResolvedValue(mockStats)

      const request = new NextRequest(
        'http://localhost:3000/api/admin/stats?startDate=2024-01-01&endDate=2024-01-31'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(ContentService.getContentStats).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })
    })

    it('should handle invalid date parameters gracefully', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { id: 'admin123', role: 'admin' },
      })

      const mockStats = {
        totalContent: 0,
        contentByType: {},
        recentActivity: [],
        activeUsers: 0,
        topContributors: [],
      }

      ;(ContentService.getContentStats as jest.Mock).mockResolvedValue(mockStats)

      const request = new NextRequest(
        'http://localhost:3000/api/admin/stats?startDate=invalid&endDate=alsoInvalid'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      // Should call without date parameters when they're invalid
      expect(ContentService.getContentStats).toHaveBeenCalledWith({})
    })

    it('should handle service errors gracefully', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { id: 'admin123', role: 'admin' },
      })

      ;(ContentService.getContentStats as jest.Mock).mockRejectedValue(
        new Error('Failed to calculate statistics')
      )

      const request = new NextRequest('http://localhost:3000/api/admin/stats')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch statistics')
    })

    it('should cache statistics results', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { id: 'admin123', role: 'admin' },
      })

      const mockStats = {
        totalContent: 100,
        contentByType: { rubric: 100 },
        recentActivity: [],
        activeUsers: 5,
        topContributors: [],
      }

      ;(ContentService.getContentStats as jest.Mock).mockResolvedValue(mockStats)

      // First request
      const request1 = new NextRequest('http://localhost:3000/api/admin/stats')
      const response1 = await GET(request1)
      
      // Second request (should use cache)
      const request2 = new NextRequest('http://localhost:3000/api/admin/stats')
      const response2 = await GET(request2)

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      
      // Service should only be called once due to caching
      expect(ContentService.getContentStats).toHaveBeenCalledTimes(1)
    })
  })
})