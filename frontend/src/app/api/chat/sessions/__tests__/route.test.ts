/**
 * Chat Sessions API Route Tests
 * 測試聊天會話 API
 */

// Mock Google Cloud Storage
const mockDownload = jest.fn();
const mockExists = jest.fn();
const mockFile = jest.fn();

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockImplementation(() => ({ 
      file: jest.fn().mockImplementation((path: string) => {
        mockFile(path);
        return {
          download: mockDownload,
          exists: mockExists,
        };
      })
    })),
  })),
}));

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { Storage } from '@google-cloud/storage';

// Mock console
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('/api/chat/sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('GET - List Chat Sessions', () => {
    const mockSessions = [
      {
        id: 'session-1',
        title: 'AI Job Search Help',
        scenarioId: 'jobsearch',
        createdAt: '2025-07-30T10:00:00Z',
        lastMessageAt: '2025-07-30T11:00:00Z',
        messageCount: 15,
      },
      {
        id: 'session-2',
        title: 'Resume Builder Assistance',
        scenarioId: 'resume_builder',
        createdAt: '2025-07-29T14:00:00Z',
        lastMessageAt: '2025-07-29T15:30:00Z',
        messageCount: 8,
      },
    ];

    it('should return chat sessions for authenticated user', async () => {
      const userInfo = {
        email: 'user@example.com',
        name: 'Test User',
      };

      mockExists.mockResolvedValue([true]);
      mockDownload.mockResolvedValue([
        Buffer.from(JSON.stringify({ sessions: mockSessions })),
      ]);

      const request = new NextRequest('http://localhost:3000/api/chat/sessions', {
        headers: {
          'x-user-info': JSON.stringify(userInfo),
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessions).toEqual(mockSessions);
      expect(mockFile).toHaveBeenCalledWith('user/user_at_example_com/chat/index.json');
    });

    it('should return empty array when no sessions exist', async () => {
      const userInfo = {
        email: 'newuser@example.com',
        name: 'New User',
      };

      mockExists.mockResolvedValue([false]);

      const request = new NextRequest('http://localhost:3000/api/chat/sessions', {
        headers: {
          'x-user-info': JSON.stringify(userInfo),
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessions).toEqual([]);
      expect(mockDownload).not.toHaveBeenCalled();
    });

    it('should return 401 when user info header is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/sessions');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockFile).not.toHaveBeenCalled();
    });

    it('should handle invalid user info JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/sessions', {
        headers: {
          'x-user-info': 'invalid-json',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to load chat sessions');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error loading chat sessions:',
        expect.any(SyntaxError)
      );
    });

    it('should handle empty sessions in index', async () => {
      const userInfo = {
        email: 'user@example.com',
        name: 'Test User',
      };

      mockExists.mockResolvedValue([true]);
      mockDownload.mockResolvedValue([
        Buffer.from(JSON.stringify({})), // No sessions property
      ]);

      const request = new NextRequest('http://localhost:3000/api/chat/sessions', {
        headers: {
          'x-user-info': JSON.stringify(userInfo),
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessions).toEqual([]);
    });

    it('should sanitize email for file path', async () => {
      const userInfo = {
        email: 'user.name@sub.example.com',
        name: 'Test User',
      };

      mockExists.mockResolvedValue([false]);

      const request = new NextRequest('http://localhost:3000/api/chat/sessions', {
        headers: {
          'x-user-info': JSON.stringify(userInfo),
        },
      });

      await GET(request);

      expect(mockFile).toHaveBeenCalledWith('user/user_name_at_sub_example_com/chat/index.json');
    });

    it('should handle GCS download errors', async () => {
      const userInfo = {
        email: 'user@example.com',
        name: 'Test User',
      };

      mockExists.mockResolvedValue([true]);
      mockDownload.mockRejectedValue(new Error('GCS download failed'));

      const request = new NextRequest('http://localhost:3000/api/chat/sessions', {
        headers: {
          'x-user-info': JSON.stringify(userInfo),
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to load chat sessions');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error loading chat sessions:',
        expect.any(Error)
      );
    });

    it('should handle malformed index JSON', async () => {
      const userInfo = {
        email: 'user@example.com',
        name: 'Test User',
      };

      mockExists.mockResolvedValue([true]);
      mockDownload.mockResolvedValue([Buffer.from('invalid json')]);

      const request = new NextRequest('http://localhost:3000/api/chat/sessions', {
        headers: {
          'x-user-info': JSON.stringify(userInfo),
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to load chat sessions');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error loading chat sessions:',
        expect.any(SyntaxError)
      );
    });
  });
});

/**
 * Chat Sessions API Considerations:
 * 
 * 1. Authentication:
 *    - Uses x-user-info header for user identification
 *    - Must validate header presence and format
 * 
 * 2. Data Storage:
 *    - Sessions stored in GCS under user directory
 *    - Email sanitization for file paths
 *    - Index file contains session metadata
 * 
 * 3. Session Structure:
 *    - Sessions have id, title, timestamps
 *    - Associated with scenarios
 *    - Track message counts
 * 
 * 4. Error Handling:
 *    - Graceful handling of missing data
 *    - Invalid JSON parsing
 *    - GCS operation failures
 * 
 * 5. Performance:
 *    - Index file may grow with many sessions
 *    - Consider pagination for large lists
 *    - Cache frequently accessed data
 */