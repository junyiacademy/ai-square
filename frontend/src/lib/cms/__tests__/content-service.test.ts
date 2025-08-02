// TODO: This test file is testing a different API than what contentService actually provides
// The actual contentService reads from YAML files and GCS, not from HTTP endpoints
// These tests should be rewritten to match the actual implementation
/*
import { contentService } from '../content-service';
import type { 
  ContentType
} from '@/types/cms';

// Define test-specific types since they don't exist in the codebase
interface CMSContent {
  id: string;
  type: ContentType;
  title: Record<string, string>;
  description: Record<string, string>;
  metadata: Record<string, unknown>;
  content: Record<string, unknown>;
}

interface CMSSaveOptions {
  message: string;
  branch?: string;
}

interface CommitResult {
  sha: string;
  branch: string;
  message: string;
}

interface PullRequestResult {
  number: number;
  url: string;
  title: string;
}

interface ContentListItem {
  id: string;
  title: string;
  type: ContentType;
}

interface ContentHistory {
  sha: string;
  message: string;
  date: string;
  author: {
    name: string;
    email: string;
  };
}

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('CMSContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockContent: CMSContent = {
    id: 'test-scenario',
    type: 'domain' as ContentType,
    title: { en: 'Test Scenario' },
    description: { en: 'Test description' },
    metadata: {
      lastModified: '2024-01-01T00:00:00Z',
      version: '1.0.0'
    },
    content: {}
  };

  describe('fetchContent', () => {
    it('fetches content successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, content: mockContent })
      } as Response);

      const result = await contentService.getContent('test-scenario', 'pbl');
      
      expect(result).toEqual(mockContent);
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/content/test-scenario?type=pbl');
    });

    it('throws error on failed fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      } as Response);

      await expect(contentService.getContent('invalid', 'pbl'))
        .rejects.toThrow('Failed to fetch content: Not Found');
    });

    it('throws error on invalid response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: 'Content not found' })
      } as Response);

      await expect(contentService.getContent('test', 'pbl'))
        .rejects.toThrow('Content not found');
    });
  });

  describe('saveContent', () => {
    const saveOptions: CMSSaveOptions = {
      message: 'Update content',
      branch: 'main'
    };

    it('saves content successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await contentService.saveContent('test-id', 'pbl', mockContent, saveOptions);
      
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/content/test-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pbl',
          content: mockContent,
          message: 'Update content',
          branch: 'main'
        })
      });
    });

    it('throws error on save failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      } as Response);

      await expect(contentService.saveContent('test', 'pbl', mockContent, saveOptions))
        .rejects.toThrow('Failed to save content: Internal Server Error');
    });
  });

  // TODO: Implement deleteContent tests when the method is added
  // describe('deleteContent', () => {
  //   it('deletes content successfully', async () => {
  //     // Test implementation
  //   });
  // });

  describe('listContent', () => {
    it('lists content successfully', async () => {
      const mockList: ContentListItem[] = [
        { id: 'test1', title: 'Test 1', type: 'pbl' as ContentType },
        { id: 'test2', title: 'Test 2', type: 'assessment' as ContentType }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, items: mockList })
      } as Response);

      const result = await contentService.listContent('pbl');
      
      expect(result).toEqual(mockList);
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/content?type=pbl');
    });

    it('lists all content types when no type specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, items: [] })
      } as Response);

      await contentService.listContent();
      
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/content');
    });
  });

  describe('getHistory', () => {
    it('fetches content history successfully', async () => {
      const mockHistory: ContentHistory[] = [
        {
          sha: 'abc123',
          message: 'Initial commit',
          date: '2024-01-01T00:00:00Z',
          author: { name: 'Test User', email: 'test@example.com' }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, history: mockHistory })
      } as Response);

      const result = await contentService.getHistory('test-id', 'pbl', 10);
      
      expect(result).toEqual(mockHistory);
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/history?id=test-id&type=pbl&limit=10');
    });
  });

  describe('commitChanges', () => {
    it('commits changes successfully', async () => {
      const mockResult: CommitResult = {
        sha: 'abc123',
        branch: 'main',
        message: 'Test commit'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: mockResult })
      } as Response);

      const result = await contentService.commitChanges('Test commit', 'main');
      
      expect(result).toEqual(mockResult);
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/content/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test commit', branch: 'main' })
      });
    });
  });

  describe('createPullRequest', () => {
    it('creates pull request successfully', async () => {
      const mockPR: PullRequestResult = {
        number: 123,
        url: 'https://github.com/test/repo/pull/123',
        title: 'Test PR'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, pullRequest: mockPR })
      } as Response);

      const result = await contentService.createPullRequest(
        'Test PR',
        'Test description',
        'feature',
        'main'
      );
      
      expect(result).toEqual(mockPR);
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/content/pull-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test PR',
          body: 'Test description',
          head: 'feature',
          base: 'main'
        })
      });
    });
  });
});
*/