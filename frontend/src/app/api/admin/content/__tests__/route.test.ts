import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock the content service
jest.mock('@/lib/cms/content-service', () => ({
  contentService: {
    listContent: jest.fn(),
    saveContent: jest.fn(),
  },
}))

// Mock authentication
jest.mock('@/lib/auth/auth-utils', () => ({
  getAuthFromRequest: jest.fn(),
  hasRole: jest.fn(),
}))

import { contentService } from '@/lib/cms/content-service'
import { getAuthFromRequest, hasRole } from '@/lib/auth/auth-utils'

describe('/api/admin/content', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 for unauthorized users', async () => {
      ;(getAuthFromRequest as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/admin/content')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return all content for authorized admin', async () => {
      ;(getAuthFromRequest as jest.Mock).mockResolvedValue({
        userId: 123,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      })
      ;(hasRole as jest.Mock).mockReturnValue(true)

      const mockContent = [
        { id: '1', title: 'Content 1', type: 'rubric' },
        { id: '2', title: 'Content 2', type: 'scenario' },
      ]

      ;(contentService.listContent as jest.Mock).mockResolvedValue(mockContent)

      const request = new NextRequest('http://localhost:3000/api/admin/content')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockContent)
      expect(contentService.listContent).toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      ;(getAuthFromRequest as jest.Mock).mockResolvedValue({
        userId: 123,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      })
      ;(hasRole as jest.Mock).mockReturnValue(true)

      ;(contentService.listContent as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )

      const request = new NextRequest('http://localhost:3000/api/admin/content')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch content')
    })
  })

  describe('POST', () => {
    it('should return 401 for unauthorized users', async () => {
      ;(getAuthFromRequest as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Test' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should create new content for authorized admin', async () => {
      ;(getAuthFromRequest as jest.Mock).mockResolvedValue({
        userId: 123,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      })
      ;(hasRole as jest.Mock).mockReturnValue(true)

      const newContent = {
        title: 'New Content',
        type: 'rubric',
        data: { key: 'value' },
      }

      const createdContent = {
        id: 'new123',
        ...newContent,
        createdAt: new Date().toISOString(),
      }

      ;(contentService.saveContent as jest.Mock).mockResolvedValue(createdContent)

      const request = new NextRequest('http://localhost:3000/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newContent),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data).toEqual(createdContent)
      expect(contentService.saveContent).toHaveBeenCalledWith(newContent)
    })

    it('should handle missing required fields', async () => {
      ;(getAuthFromRequest as jest.Mock).mockResolvedValue({
        userId: 123,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      })
      ;(hasRole as jest.Mock).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Missing required fields')
    })
  })
})