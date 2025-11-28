/**
 * Unit Tests: /api/scenarios/publish
 * Tests GitHub integration with mocked Octokit
 */

import { NextRequest } from 'next/server';
import { POST } from './route';
import type { PublishScenarioRequest, PublishScenarioResponse } from '@/types/prompt-to-course';

// Create mock functions
const mockGetContent = jest.fn();
const mockCreateOrUpdateFileContents = jest.fn();
const mockGetRef = jest.fn();
const mockCreateRef = jest.fn();
const mockCreatePull = jest.fn();

// Mock Octokit
jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({
      repos: {
        getContent: mockGetContent,
        createOrUpdateFileContents: mockCreateOrUpdateFileContents,
      },
      git: {
        getRef: mockGetRef,
        createRef: mockCreateRef,
      },
      pulls: {
        create: mockCreatePull,
      },
    })),
  };
});

// Mock fetch for validation endpoint
global.fetch = jest.fn();

describe('/api/scenarios/publish', () => {
  const mockGitHubToken = 'ghp_test_token_123456';
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GITHUB_TOKEN: mockGitHubToken };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createMockRequest = (body: Partial<PublishScenarioRequest>): NextRequest => {
    return {
      json: async () => body,
      url: 'http://localhost:3000/api/scenarios/publish',
    } as NextRequest;
  };

  describe('Input Validation', () => {
    it('should reject request when GITHUB_TOKEN is not configured', async () => {
      delete process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_API_TOKEN;

      const request = createMockRequest({
        scenarioId: 'test-scenario',
        yaml: 'id: test',
        mode: 'pbl',
      });

      const response = await POST(request);
      const data = await response.json() as { error: string };

      expect(response.status).toBe(503);
      expect(data.error).toContain('GitHub integration not configured');
    });

    it('should reject request with missing fields', async () => {
      const request = createMockRequest({
        scenarioId: 'test-scenario',
        // Missing yaml and mode
      });

      const response = await POST(request);
      const data = await response.json() as { error: string };

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject invalid scenario ID format', async () => {
      const request = createMockRequest({
        scenarioId: 'Invalid ID with spaces!',
        yaml: 'id: test',
        mode: 'pbl',
      });

      const response = await POST(request);
      const data = await response.json() as { error: string };

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid scenario ID format');
    });

    it('should accept valid scenario ID formats', async () => {
      const validIds = [
        'test-scenario',
        'test_scenario',
        'TestScenario123',
        'test-123_abc',
      ];

      for (const scenarioId of validIds) {
        // Mock validation to pass
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: true, errors: [], warnings: [], info: [] }),
        });

        // Mock getContent to throw 404 (file doesn't exist)
        mockGetContent.mockRejectedValueOnce({ status: 404 });

        // Mock getRef
        mockGetRef.mockResolvedValueOnce({
          data: { object: { sha: 'base-sha-123' } },
        });

        // Mock createRef
        mockCreateRef.mockResolvedValueOnce({
          data: { ref: `refs/heads/feature/scenario-${scenarioId}` },
        });

        // Mock createOrUpdateFileContents
        mockCreateOrUpdateFileContents.mockResolvedValueOnce({
          data: { commit: { sha: 'commit-sha-123' } },
        });

        // Mock create PR
        mockCreatePull.mockResolvedValueOnce({
          data: { html_url: 'https://github.com/test/pr/1', number: 1 },
        });

        const request = createMockRequest({
          scenarioId,
          yaml: 'id: test',
          mode: 'pbl',
        });

        const response = await POST(request);

        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('YAML Validation Integration', () => {
    it('should validate YAML before publishing', async () => {
      const request = createMockRequest({
        scenarioId: 'test-scenario',
        yaml: 'id: test\nmode: pbl',
        mode: 'pbl',
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Validation failed' }),
      });

      const response = await POST(request);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/scenarios/validate'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('pbl'),
        })
      );
      expect(response.status).toBe(500);
    });

    it('should reject invalid YAML', async () => {
      const request = createMockRequest({
        scenarioId: 'test-scenario',
        yaml: 'invalid: yaml: structure',
        mode: 'pbl',
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: false,
          errors: [{ path: 'root', message: 'Invalid structure', severity: 'error' }],
          warnings: [],
          info: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json() as { error: string };

      expect(response.status).toBe(400);
      expect(data.error).toContain('Scenario validation failed');
    });
  });

  describe('GitHub Operations', () => {
    beforeEach(() => {
      // Mock successful validation
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ valid: true, errors: [], warnings: [], info: [] }),
      });
    });

    it('should check if scenario ID already exists', async () => {
      // Mock getContent to return existing file
      mockGetContent.mockResolvedValueOnce({
        data: { name: 'test-scenario.yml' },
      });

      const request = createMockRequest({
        scenarioId: 'test-scenario',
        yaml: 'id: test',
        mode: 'pbl',
      });

      const response = await POST(request);
      const data = await response.json() as { error: string };

      expect(response.status).toBe(409);
      expect(data.error).toContain('already exists');
    });

    it('should create feature branch successfully', async () => {
      // Mock getContent to throw 404
      mockGetContent.mockRejectedValueOnce({ status: 404 });

      // Mock getRef
      mockGetRef.mockResolvedValueOnce({
        data: { object: { sha: 'base-sha-123' } },
      });

      // Mock createRef
      mockCreateRef.mockResolvedValueOnce({
        data: { ref: 'refs/heads/feature/scenario-test-scenario' },
      });

      // Mock createOrUpdateFileContents
      mockCreateOrUpdateFileContents.mockResolvedValueOnce({
        data: { commit: { sha: 'commit-sha-123' } },
      });

      // Mock create PR
      mockCreatePull.mockResolvedValueOnce({
        data: { html_url: 'https://github.com/test/pr/1', number: 1 },
      });

      const request = createMockRequest({
        scenarioId: 'test-scenario',
        yaml: 'id: test\nmode: pbl',
        mode: 'pbl',
      });

      const response = await POST(request);

      expect(mockCreateRef).toHaveBeenCalledWith(
        expect.objectContaining({
          ref: 'refs/heads/feature/scenario-test-scenario',
        })
      );
    });

    it('should handle existing branch error', async () => {
      // Mock getContent to throw 404
      mockGetContent.mockRejectedValueOnce({ status: 404 });

      // Mock getRef
      mockGetRef.mockResolvedValueOnce({
        data: { object: { sha: 'base-sha-123' } },
      });

      // Mock createRef to fail with 422 (branch exists)
      mockCreateRef.mockRejectedValueOnce({ status: 422 });

      const request = createMockRequest({
        scenarioId: 'test-scenario',
        yaml: 'id: test',
        mode: 'pbl',
      });

      const response = await POST(request);
      const data = await response.json() as { error: string };

      expect(response.status).toBe(409);
      expect(data.error).toContain('already exists');
    });

    it('should create pull request with correct metadata', async () => {
      // Setup mocks
      mockGetContent.mockRejectedValueOnce({ status: 404 });
      mockGetRef.mockResolvedValueOnce({
        data: { object: { sha: 'base-sha-123' } },
      });
      mockCreateRef.mockResolvedValueOnce({
        data: { ref: 'refs/heads/feature/scenario-test-scenario' },
      });
      mockCreateOrUpdateFileContents.mockResolvedValueOnce({
        data: { commit: { sha: 'commit-sha-123' } },
      });
      mockCreatePull.mockResolvedValueOnce({
        data: {
          html_url: 'https://github.com/junyiacademy/ai-square/pull/123',
          number: 123,
        },
      });

      const request = createMockRequest({
        scenarioId: 'test-scenario',
        yaml: 'id: test\nmode: pbl',
        mode: 'pbl',
      });

      const response = await POST(request);
      const data = await response.json() as PublishScenarioResponse;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.prUrl).toContain('github.com');
      expect(data.branch).toBe('feature/scenario-test-scenario');
      expect(data.commitSha).toBe('commit-sha-123');

      // Verify PR was created with correct parameters
      expect(mockCreatePull).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('pbl'),
          head: 'feature/scenario-test-scenario',
          base: 'staging',
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ valid: true, errors: [], warnings: [], info: [] }),
      });
    });

    it('should handle GitHub authentication errors', async () => {
      mockGetContent.mockRejectedValueOnce({
        status: 401,
        message: 'Bad credentials',
      });

      const request = createMockRequest({
        scenarioId: 'test-scenario',
        yaml: 'id: test',
        mode: 'pbl',
      });

      const response = await POST(request);
      const data = await response.json() as { error: string };

      expect(response.status).toBe(401);
      expect(data.error).toContain('authentication failed');
    });

    it('should handle GitHub rate limit errors', async () => {
      mockGetContent.mockRejectedValueOnce({
        status: 403,
        message: 'API rate limit exceeded',
      });

      const request = createMockRequest({
        scenarioId: 'test-scenario',
        yaml: 'id: test',
        mode: 'pbl',
      });

      const response = await POST(request);
      const data = await response.json() as { error: string };

      expect(response.status).toBe(403);
      expect(data.error).toContain('rate limit');
    });

    it('should not expose sensitive error details', async () => {
      mockGetContent.mockRejectedValueOnce(
        new Error('Internal token: ghp_secret_should_not_leak')
      );

      const request = createMockRequest({
        scenarioId: 'test-scenario',
        yaml: 'id: test',
        mode: 'pbl',
      });

      const response = await POST(request);
      const data = await response.json() as { error: string };

      // Error message should not contain token
      expect(data.error).not.toContain('ghp_secret');
    });
  });

  describe('Security', () => {
    it('should only use GITHUB_TOKEN from environment variables', async () => {
      const request = createMockRequest({
        scenarioId: 'test-scenario',
        yaml: 'id: test',
        mode: 'pbl',
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true, errors: [], warnings: [], info: [] }),
      });

      mockGetContent.mockRejectedValueOnce({ status: 404 });
      mockGetRef.mockResolvedValueOnce({
        data: { object: { sha: 'base-sha-123' } },
      });
      mockCreateRef.mockResolvedValueOnce({
        data: { ref: 'refs/heads/feature/scenario-test-scenario' },
      });
      mockCreateOrUpdateFileContents.mockResolvedValueOnce({
        data: { commit: { sha: 'commit-sha-123' } },
      });
      mockCreatePull.mockResolvedValueOnce({
        data: { html_url: 'https://github.com/test/pr/1', number: 1 },
      });

      await POST(request);

      // Verify Octokit was initialized with token from env
      const { Octokit } = await import('@octokit/rest');
      expect(Octokit).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: mockGitHubToken,
        })
      );
    });

    it('should not return GITHUB_TOKEN in response', async () => {
      const request = createMockRequest({
        scenarioId: 'test-scenario',
        yaml: 'id: test',
        mode: 'pbl',
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true, errors: [], warnings: [], info: [] }),
      });

      mockGetContent.mockRejectedValueOnce({ status: 404 });
      mockGetRef.mockResolvedValueOnce({
        data: { object: { sha: 'base-sha-123' } },
      });
      mockCreateRef.mockResolvedValueOnce({
        data: { ref: 'refs/heads/feature/scenario-test-scenario' },
      });
      mockCreateOrUpdateFileContents.mockResolvedValueOnce({
        data: { commit: { sha: 'commit-sha-123' } },
      });
      mockCreatePull.mockResolvedValueOnce({
        data: { html_url: 'https://github.com/test/pr/1', number: 1 },
      });

      const response = await POST(request);
      const responseText = await response.text();

      expect(responseText).not.toContain(mockGitHubToken);
      expect(responseText).not.toContain('ghp_');
    });
  });
});
