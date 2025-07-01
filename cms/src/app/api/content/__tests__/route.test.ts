import { GET, POST } from '../route'
import { GitHubService } from '@/lib/github-service'

// Mock GitHubService
jest.mock('@/lib/github-service')

describe('/api/content', () => {
  let mockGitHubService: jest.Mocked<GitHubService>

  beforeEach(() => {
    mockGitHubService = new GitHubService() as jest.Mocked<GitHubService>
    ;(GitHubService as jest.MockedClass<typeof GitHubService>).mockImplementation(() => mockGitHubService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return file content successfully', async () => {
      const mockContent = 'scenario_info:\\n  title: Test Scenario'
      mockGitHubService.readFile.mockResolvedValue(mockContent)

      const request = new Request('http://localhost:3000/api/content?path=test.yaml')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.content).toBe(mockContent)
      expect(mockGitHubService.readFile).toHaveBeenCalledWith('test.yaml')
    })

    it('should handle missing path parameter', async () => {
      const request = new Request('http://localhost:3000/api/content')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Path parameter is required')
    })

    it('should handle file read errors', async () => {
      mockGitHubService.readFile.mockRejectedValue(new Error('File not found'))

      const request = new Request('http://localhost:3000/api/content?path=nonexistent.yaml')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to read file')
    })
  })

  describe('POST', () => {
    it('should save file content successfully', async () => {
      mockGitHubService.saveFile.mockResolvedValue()

      const request = new Request('http://localhost:3000/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'test.yaml',
          content: 'new content',
          message: 'Update test file'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockGitHubService.saveFile).toHaveBeenCalledWith(
        'test.yaml',
        'new content',
        'Update test file',
        undefined
      )
    })

    it('should save to specific branch', async () => {
      mockGitHubService.saveFile.mockResolvedValue()

      const request = new Request('http://localhost:3000/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'test.yaml',
          content: 'new content',
          message: 'Update test file',
          branch: 'feature-branch'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockGitHubService.saveFile).toHaveBeenCalledWith(
        'test.yaml',
        'new content',
        'Update test file',
        'feature-branch'
      )
    })

    it('should handle missing required fields', async () => {
      const request = new Request('http://localhost:3000/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'new content',
          message: 'Update test file'
          // missing path
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Path, content, and message are required')
    })

    it('should handle save errors', async () => {
      mockGitHubService.saveFile.mockRejectedValue(new Error('Save failed'))

      const request = new Request('http://localhost:3000/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'test.yaml',
          content: 'new content',
          message: 'Update test file'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to save file')
    })

    it('should handle invalid JSON', async () => {
      const request = new Request('http://localhost:3000/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
    })
  })
})