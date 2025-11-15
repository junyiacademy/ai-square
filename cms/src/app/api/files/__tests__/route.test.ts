import { GET } from '../route'
import { GitHubService } from '@/lib/github-service'

// Mock GitHubService
jest.mock('@/lib/github-service')

describe('/api/files', () => {
  let mockGitHubService: jest.Mocked<GitHubService>

  beforeEach(() => {
    mockGitHubService = new GitHubService() as jest.Mocked<GitHubService>
    ;(GitHubService as jest.MockedClass<typeof GitHubService>).mockImplementation(() => mockGitHubService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return files list successfully', async () => {
      const mockFiles = [
        { name: 'scenario1.yaml', type: 'file', path: 'scenario1.yaml' },
        { name: 'scenario2.yaml', type: 'file', path: 'scenario2.yaml' },
      ]

      mockGitHubService.listFiles.mockResolvedValue(mockFiles)

      const request = new Request('http://localhost:3000/api/files')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.files).toEqual(mockFiles)
      expect(mockGitHubService.listFiles).toHaveBeenCalledWith(undefined)
    })

    it('should handle directory parameter', async () => {
      const mockFiles = [
        { name: 'subfile.yaml', type: 'file', path: 'subdir/subfile.yaml' },
      ]

      mockGitHubService.listFiles.mockResolvedValue(mockFiles)

      const request = new Request('http://localhost:3000/api/files?directory=subdir')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.files).toEqual(mockFiles)
      expect(mockGitHubService.listFiles).toHaveBeenCalledWith('subdir')
    })

    it('should handle service errors', async () => {
      mockGitHubService.listFiles.mockRejectedValue(new Error('GitHub API Error'))

      const request = new Request('http://localhost:3000/api/files')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to list files')
    })

    it('should handle missing GITHUB_TOKEN', async () => {
      const originalToken = process.env.GITHUB_TOKEN
      delete process.env.GITHUB_TOKEN

      const request = new Request('http://localhost:3000/api/files')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('GITHUB_TOKEN is required')

      // Restore original token
      process.env.GITHUB_TOKEN = originalToken
    })
  })
})
