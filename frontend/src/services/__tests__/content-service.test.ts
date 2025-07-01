import { ContentService } from '../content-service'

// Mock fetch globally
global.fetch = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('ContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
  })

  describe('getAllContent', () => {
    it('should fetch all content successfully', async () => {
      const mockContent = [
        { id: '1', title: 'Content 1', type: 'rubric' },
        { id: '2', title: 'Content 2', type: 'scenario' },
      ]

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockContent,
      })

      const result = await ContentService.getAllContent()

      expect(result).toEqual(mockContent)
      expect(fetch).toHaveBeenCalledWith('/api/admin/content', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    it('should handle fetch errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(ContentService.getAllContent()).rejects.toThrow(
        'Failed to fetch content: 500 Internal Server Error'
      )
    })

    it('should handle network errors', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(ContentService.getAllContent()).rejects.toThrow('Network error')
    })

    it('should use cached data when available', async () => {
      const mockContent = [{ id: '1', title: 'Cached Content' }]
      const cacheData = {
        data: mockContent,
        timestamp: Date.now(),
      }

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(cacheData))

      const result = await ContentService.getAllContent()

      expect(result).toEqual(mockContent)
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should refresh cache when expired', async () => {
      const oldContent = [{ id: '1', title: 'Old Content' }]
      const newContent = [{ id: '1', title: 'New Content' }]
      
      const cacheData = {
        data: oldContent,
        timestamp: Date.now() - 6 * 60 * 1000, // 6 minutes ago
      }

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(cacheData))

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => newContent,
      })

      const result = await ContentService.getAllContent()

      expect(result).toEqual(newContent)
      expect(fetch).toHaveBeenCalled()
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('getContentById', () => {
    it('should fetch content by ID successfully', async () => {
      const mockContent = { id: '123', title: 'Specific Content', type: 'rubric' }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockContent,
      })

      const result = await ContentService.getContentById('123')

      expect(result).toEqual(mockContent)
      expect(fetch).toHaveBeenCalledWith('/api/admin/content/123', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    it('should return null for non-existent content', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await ContentService.getContentById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createContent', () => {
    it('should create new content successfully', async () => {
      const newContent = {
        title: 'New Content',
        type: 'scenario',
        data: { key: 'value' },
      }

      const createdContent = {
        id: 'new123',
        ...newContent,
        createdAt: new Date().toISOString(),
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => createdContent,
      })

      const result = await ContentService.createContent(newContent)

      expect(result).toEqual(createdContent)
      expect(fetch).toHaveBeenCalledWith('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newContent),
      })
    })

    it('should invalidate cache after creating content', async () => {
      const newContent = { title: 'New Content' }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123', ...newContent }),
      })

      await ContentService.createContent(newContent)

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('content-cache')
    })

    it('should handle validation errors', async () => {
      const invalidContent = { invalid: 'data' }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid content data' }),
      })

      await expect(ContentService.createContent(invalidContent)).rejects.toThrow(
        'Invalid content data'
      )
    })
  })

  describe('updateContent', () => {
    it('should update content successfully', async () => {
      const updates = { title: 'Updated Title' }
      const updatedContent = {
        id: '123',
        title: 'Updated Title',
        type: 'rubric',
        updatedAt: new Date().toISOString(),
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedContent,
      })

      const result = await ContentService.updateContent('123', updates)

      expect(result).toEqual(updatedContent)
      expect(fetch).toHaveBeenCalledWith('/api/admin/content/123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })
    })

    it('should handle concurrent update conflicts', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Content has been modified' }),
      })

      await expect(
        ContentService.updateContent('123', { title: 'New Title' })
      ).rejects.toThrow('Content has been modified')
    })
  })

  describe('deleteContent', () => {
    it('should delete content successfully', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await ContentService.deleteContent('123')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/api/admin/content/123', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    it('should invalidate cache after deleting content', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await ContentService.deleteContent('123')

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('content-cache')
    })

    it('should handle deletion of non-existent content', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await ContentService.deleteContent('nonexistent')

      expect(result).toBe(false)
    })
  })

  describe('getContentHistory', () => {
    it('should fetch content history with default parameters', async () => {
      const mockHistory = {
        items: [
          {
            id: '1',
            action: 'created',
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory,
      })

      const result = await ContentService.getContentHistory()

      expect(result).toEqual(mockHistory)
      expect(fetch).toHaveBeenCalledWith('/api/admin/history?page=1&pageSize=20', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    it('should handle custom filters and pagination', async () => {
      const mockHistory = {
        items: [],
        total: 0,
        page: 2,
        pageSize: 50,
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory,
      })

      const result = await ContentService.getContentHistory({
        page: 2,
        pageSize: 50,
        contentType: 'scenario',
        userId: 'user123',
      })

      expect(result).toEqual(mockHistory)
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/history?page=2&pageSize=50&contentType=scenario&userId=user123',
        expect.any(Object)
      )
    })
  })

  describe('getContentStats', () => {
    it('should fetch content statistics successfully', async () => {
      const mockStats = {
        totalContent: 100,
        contentByType: {
          rubric: 40,
          scenario: 60,
        },
        activeUsers: 25,
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      })

      const result = await ContentService.getContentStats()

      expect(result).toEqual(mockStats)
      expect(fetch).toHaveBeenCalledWith('/api/admin/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    it('should handle date range parameters', async () => {
      const mockStats = {
        totalContent: 50,
        contentByType: {},
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      })

      await ContentService.getContentStats({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })

      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/stats?startDate=2024-01-01&endDate=2024-01-31',
        expect.any(Object)
      )
    })
  })

  describe('searchContent', () => {
    it('should search content with query', async () => {
      const mockResults = [
        { id: '1', title: 'AI Literacy', type: 'rubric' },
        { id: '2', title: 'AI Ethics', type: 'scenario' },
      ]

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      })

      const result = await ContentService.searchContent('AI')

      expect(result).toEqual(mockResults)
      expect(fetch).toHaveBeenCalledWith('/api/admin/content/search?q=AI', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    it('should handle empty search results', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      const result = await ContentService.searchContent('nonexistent')

      expect(result).toEqual([])
    })

    it('should handle search with filters', async () => {
      const mockResults = [{ id: '1', title: 'Filtered Result' }]

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      })

      await ContentService.searchContent('test', {
        type: 'rubric',
        status: 'published',
      })

      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/content/search?q=test&type=rubric&status=published',
        expect.any(Object)
      )
    })
  })
})