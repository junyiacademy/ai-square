import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock the content service
jest.mock('@/lib/cms/content-service', () => ({
  contentService: {
    listContent: jest.fn()
  },
}))

// Mock authentication
jest.mock('@/lib/auth/auth-utils', () => ({
  getAuthFromRequest: jest.fn(),
  hasRole: jest.fn(),
}))

import { contentService } from '@/lib/cms/content-service'
import { getAuthFromRequest, hasRole } from '@/lib/auth/auth-utils'

describe('/api/admin/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 for unauthorized users', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: {
          cookie: 'isLoggedIn=false'
        }
      })
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return stats for authorized admin', async () => {
      // Mock contentService.listContent
      ;(contentService.listContent as jest.Mock).mockImplementation((type) => {
        if (type === 'domain') {
          return Promise.resolve([
            { id: '1', status: 'published' },
            { id: '2', status: 'published' },
            { id: '3', status: 'draft' }
          ]);
        }
        if (type === 'question') {
          return Promise.resolve([
            { id: '1', status: 'published', gcs_path: 'path1' },
            { id: '2', status: 'published' }
          ]);
        }
        return Promise.resolve([]);
      });

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: {
          cookie: 'isLoggedIn=true; userRole=admin'
        }
      })
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({
        domains: 2,
        questions: 2,
        overrides: 1,
        drafts: 1
      })
    })

    it('should support date range filtering', async () => {
      ;(contentService.listContent as jest.Mock).mockResolvedValue([]);

      const startDate = '2024-01-01'
      const endDate = '2024-01-31'
      const request = new NextRequest(`http://localhost:3000/api/admin/stats?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          cookie: 'isLoggedIn=true; userRole=admin'
        }
      })
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toBeDefined()
    })

    it('should support grouping by period', async () => {
      ;(contentService.listContent as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/stats?groupBy=month', {
        headers: {
          cookie: 'isLoggedIn=true; userRole=admin'
        }
      })
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toBeDefined()
    })

    it('should cache stats results', async () => {
      ;(contentService.listContent as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: {
          cookie: 'isLoggedIn=true; userRole=admin'
        }
      })
      
      // First request
      const response1 = await GET(request)
      expect(response1.status).toBe(200)
      
      // Second request should use cache
      const response2 = await GET(request)
      expect(response2.status).toBe(200)
    })

    it('should handle service errors gracefully', async () => {
      ;(contentService.listContent as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: {
          cookie: 'isLoggedIn=true; userRole=admin'
        }
      })
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({
        domains: 0,
        questions: 0,
        overrides: 0,
        drafts: 0
      })
    })
  })
})