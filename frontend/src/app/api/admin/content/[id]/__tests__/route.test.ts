import { NextRequest } from 'next/server';
import { GET, DELETE } from '../route';

// Mock content service - must be defined before jest.mock
jest.mock('@/lib/cms/content-service', () => {
  const mockGetContent = jest.fn();
  const mockListContent = jest.fn();
  const mockDeleteOverride = jest.fn();
  
  return {
    contentService: {
      getContent: mockGetContent,
      listContent: mockListContent,
      deleteOverride: mockDeleteOverride,
    },
    __mocks: {
      mockGetContent,
      mockListContent,
      mockDeleteOverride,
    }
  };
});

// Import mocks after jest.mock
const { contentService } = require('@/lib/cms/content-service');
const mockGetContent = contentService.getContent as jest.Mock;
const mockListContent = contentService.listContent as jest.Mock;
const mockDeleteOverride = contentService.deleteOverride as jest.Mock;

describe('Admin Content [id] API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/content/[id]', () => {
    it('returns 401 when not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/content/scenario%2Ftest.yaml');
      const response = await GET(request, { params: Promise.resolve({ id: 'scenario/test.yaml' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('successfully returns content', async () => {
      const mockContent = {
        id: 'test-scenario',
        title: 'Test Scenario',
        description: 'Test description',
      };

      const mockMetadata = {
        id: 'scenario/test.yaml',
        name: 'test.yaml',
        path: 'scenario/test.yaml',
        isOverride: false,
        lastModified: '2024-01-01T00:00:00Z',
      };

      mockGetContent.mockResolvedValue(mockContent);
      mockListContent.mockResolvedValue([mockMetadata]);

      const request = new NextRequest('http://localhost:3000/api/admin/content/scenario%2Ftest.yaml', {
        headers: { cookie: 'isLoggedIn=true' },
      });

      const response = await GET(request, { params: Promise.resolve({ id: 'scenario/test.yaml' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        content: mockContent,
        ...mockMetadata,
      });
      expect(mockGetContent).toHaveBeenCalledWith('scenario', 'test.yaml');
      expect(mockListContent).toHaveBeenCalledWith('scenario');
    });

    it('handles nested file paths correctly', async () => {
      const mockContent = { id: 'nested-content' };
      mockGetContent.mockResolvedValue(mockContent);
      mockListContent.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/content/scenario%2Ffolder%2Fsubfolder%2Ftest.yaml', {
        headers: { cookie: 'isLoggedIn=true' },
      });

      const response = await GET(request, { params: Promise.resolve({ id: 'scenario/folder/subfolder/test.yaml' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockGetContent).toHaveBeenCalledWith('scenario', 'folder/subfolder/test.yaml');
    });

    it('returns metadata when available', async () => {
      const mockContent = { id: 'test' };
      const mockItems = [
        { id: 'scenario/other.yaml', name: 'other.yaml' },
        { id: 'scenario/test.yaml', name: 'test.yaml', isOverride: true, lastModified: '2024-01-01' },
      ];

      mockGetContent.mockResolvedValue(mockContent);
      mockListContent.mockResolvedValue(mockItems);

      const request = new NextRequest('http://localhost:3000/api/admin/content/scenario%2Ftest.yaml', {
        headers: { cookie: 'isLoggedIn=true' },
      });

      const response = await GET(request, { params: Promise.resolve({ id: 'scenario/test.yaml' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isOverride).toBe(true);
      expect(data.lastModified).toBe('2024-01-01');
    });

    it('handles errors gracefully', async () => {
      mockGetContent.mockRejectedValue(new Error('File not found'));

      const request = new NextRequest('http://localhost:3000/api/admin/content/scenario%2Ftest.yaml', {
        headers: { cookie: 'isLoggedIn=true' },
      });

      const response = await GET(request, { params: Promise.resolve({ id: 'scenario/test.yaml' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to get content' });
    });
  });

  describe('DELETE /api/admin/content/[id]', () => {
    it('returns 401 when not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/content/scenario%2Ftest.yaml', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'scenario/test.yaml' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('successfully deletes override', async () => {
      mockDeleteOverride.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/admin/content/scenario%2Ftest.yaml', {
        method: 'DELETE',
        headers: { cookie: 'isLoggedIn=true' },
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'scenario/test.yaml' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockDeleteOverride).toHaveBeenCalledWith('scenario', 'test.yaml');
    });

    it('handles nested paths correctly', async () => {
      mockDeleteOverride.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/admin/content/scenario%2Ffolder%2Ftest.yaml', {
        method: 'DELETE',
        headers: { cookie: 'isLoggedIn=true' },
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'scenario/folder/test.yaml' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockDeleteOverride).toHaveBeenCalledWith('scenario', 'folder/test.yaml');
    });

    it('handles errors gracefully', async () => {
      mockDeleteOverride.mockRejectedValue(new Error('Permission denied'));

      const request = new NextRequest('http://localhost:3000/api/admin/content/scenario%2Ftest.yaml', {
        method: 'DELETE',
        headers: { cookie: 'isLoggedIn=true' },
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'scenario/test.yaml' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to delete content' });
    });
  });
});
