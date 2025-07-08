import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock the content service
jest.mock('@/services/content-service', () => ({
  ContentService: {
    getAllContent: jest.fn(),
    createContent: jest.fn(),
  },
}))

// Mock authentication
jest.mock('@/lib/auth/auth-utils', () => ({
  verifyAdminAuth: jest.fn(),
}))

import { ContentService } from '@/services/content-service'
import { verifyAdminAuth } from '@/lib/auth/auth-utils'

describe('/api/admin/content', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 for unauthorized users', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Unauthorized',
      })

      const request = new NextRequest('http://localhost:3000/api/admin/content')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return all content for authorized admin', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { id: 'admin123', role: 'admin' },
      })

      const mockContent = [
        { id: '1', title: 'Content 1', type: 'rubric' },
        { id: '2', title: 'Content 2', type: 'scenario' },
      ]

      ;(ContentService.getAllContent as jest.Mock).mockResolvedValue(mockContent)

      const request = new NextRequest('http://localhost:3000/api/admin/content')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockContent)
      expect(ContentService.getAllContent).toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { id: 'admin123', role: 'admin' },
      })

      ;(ContentService.getAllContent as jest.Mock).mockRejectedValue(
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
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Unauthorized',
      })

      const request = new NextRequest('http://localhost:3000/api/admin/content', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Content' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should create new content for authorized admin', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { id: 'admin123', role: 'admin' },
      })

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

      ;(ContentService.createContent as jest.Mock).mockResolvedValue(createdContent)

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
      expect(ContentService.createContent).toHaveBeenCalledWith(newContent)
    })

    it('should return 400 for invalid content data', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { id: 'admin123', role: 'admin' },
      })

      const request = new NextRequest('http://localhost:3000/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invalid: 'data' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid content data')
    })

    it('should handle JSON parsing errors', async () => {
      ;(verifyAdminAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { id: 'admin123', role: 'admin' },
      })

      const request = new NextRequest('http://localhost:3000/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request body')
    })
  })
})