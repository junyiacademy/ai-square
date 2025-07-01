import { POST } from '../route'
import { GitHubService } from '@/lib/github-service'

// Mock GitHubService
jest.mock('@/lib/github-service')

describe('/api/git/pr', () => {
  let mockGitHubService: jest.Mocked<GitHubService>

  beforeEach(() => {
    mockGitHubService = new GitHubService() as jest.Mocked<GitHubService>
    ;(GitHubService as jest.MockedClass<typeof GitHubService>).mockImplementation(() => mockGitHubService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should create pull request successfully', async () => {
      const mockPR = {
        number: 1,
        title: 'feat: Add new scenario',
        url: 'https://github.com/test-owner/test-repo/pull/1'
      }

      mockGitHubService.createPullRequest.mockResolvedValue(mockPR)

      const request = new Request('http://localhost:3000/api/git/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName: 'feature-new-scenario',
          title: 'feat: Add new scenario',
          description: 'Added a new AI literacy scenario for students'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.pullRequest).toEqual(mockPR)
      expect(mockGitHubService.createPullRequest).toHaveBeenCalledWith(
        'feature-new-scenario',
        'feat: Add new scenario',
        'Added a new AI literacy scenario for students'
      )
    })

    it('should handle missing required fields', async () => {
      const request = new Request('http://localhost:3000/api/git/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName: 'feature-branch'
          // missing title and description
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Branch name, title, and description are required')
    })

    it('should handle PR creation errors', async () => {
      mockGitHubService.createPullRequest.mockRejectedValue(new Error('Cannot create PR'))

      const request = new Request('http://localhost:3000/api/git/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName: 'feature-branch',
          title: 'Test PR',
          description: 'Test description'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create pull request')
    })

    it('should handle invalid JSON', async () => {
      const request = new Request('http://localhost:3000/api/git/pr', {
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