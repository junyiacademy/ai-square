import { POST } from '../route'
import { GitHubService } from '@/lib/github-service'

// Mock GitHubService
jest.mock('@/lib/github-service')

describe('/api/git/branch', () => {
  let mockGitHubService: jest.Mocked<GitHubService>

  beforeEach(() => {
    mockGitHubService = new GitHubService() as jest.Mocked<GitHubService>
    ;(GitHubService as jest.MockedClass<typeof GitHubService>).mockImplementation(() => mockGitHubService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should create branch successfully', async () => {
      mockGitHubService.createBranch.mockResolvedValue()

      const request = new Request('http://localhost:3000/api/git/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName: 'feature-new-scenario'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Branch created successfully')
      expect(mockGitHubService.createBranch).toHaveBeenCalledWith('feature-new-scenario')
    })

    it('should handle missing branch name', async () => {
      const request = new Request('http://localhost:3000/api/git/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Branch name is required')
    })

    it('should handle branch creation errors', async () => {
      mockGitHubService.createBranch.mockRejectedValue(new Error('Branch already exists'))

      const request = new Request('http://localhost:3000/api/git/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName: 'existing-branch'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create branch')
    })

    it('should handle invalid JSON', async () => {
      const request = new Request('http://localhost:3000/api/git/branch', {
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