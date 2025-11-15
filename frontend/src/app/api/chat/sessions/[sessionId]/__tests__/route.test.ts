/**
 * Chat Session by ID API Route Tests
 * 測試聊天會話詳情 API
 */

// Mock Google Cloud Storage
const mockDownload = jest.fn();
const mockExists = jest.fn();
const mockDelete = jest.fn();
const mockSave = jest.fn();
const mockFile = jest.fn();

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockImplementation(() => ({
      file: jest.fn().mockImplementation((path: string) => {
        mockFile(path);
        return {
          download: mockDownload,
          exists: mockExists,
          delete: mockDelete,
          save: mockSave,
        };
      })
    })),
  })),
}));

import { GET, DELETE } from '../route';
import { NextRequest } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';

// Mock console
const mockConsoleError = createMockConsoleError();

describe('/api/chat/sessions/[sessionId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('GET - Get Chat Session', () => {
    const mockSession = {
      id: 'session-123',
      title: 'AI Job Search Assistance',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'I need help finding a job',
          timestamp: '2025-07-30T10:00:00Z',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'I can help you with that! What kind of job are you looking for?',
          timestamp: '2025-07-30T10:00:30Z',
        },
      ],
      created_at: '2025-07-30T10:00:00Z',
      updated_at: '2025-07-30T10:00:30Z',
    };

    it('should return session data for authenticated user', async () => {
      const userInfo = {
        email: 'user@example.com',
        name: 'Test User',
      };

      mockExists.mockResolvedValue([true]);
      mockDownload.mockResolvedValue([Buffer.from(JSON.stringify(mockSession))]);

      const request = new NextRequest('http://localhost:3000/api/chat/sessions/session-123', {
        headers: {
          'x-user-info': JSON.stringify(userInfo),
        },
      });

      const params = Promise.resolve({ sessionId: 'session-123' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        id: mockSession.id,
        title: mockSession.title,
        messages: mockSession.messages,
        created_at: mockSession.created_at,
        updated_at: mockSession.updated_at,
      });
      expect(mockFile).toHaveBeenCalledWith('user/user_at_example_com/chat/sessions/session-123.json');
    });

    it('should return 404 when session not found', async () => {
      const userInfo = {
        email: 'user@example.com',
        name: 'Test User',
      };

      mockExists.mockResolvedValue([false]);

      const request = new NextRequest('http://localhost:3000/api/chat/sessions/nonexistent', {
        headers: {
          'x-user-info': JSON.stringify(userInfo),
        },
      });

      const params = Promise.resolve({ sessionId: 'nonexistent' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Session not found');
      expect(mockDownload).not.toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/sessions/session-123');

      const params = Promise.resolve({ sessionId: 'session-123' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockFile).not.toHaveBeenCalled();
    });

    it('should handle invalid session data', async () => {
      const userInfo = {
        email: 'user@example.com',
        name: 'Test User',
      };

      mockExists.mockResolvedValue([true]);
      mockDownload.mockResolvedValue([Buffer.from('invalid json')]);

      const request = new NextRequest('http://localhost:3000/api/chat/sessions/session-123', {
        headers: {
          'x-user-info': JSON.stringify(userInfo),
        },
      });

      const params = Promise.resolve({ sessionId: 'session-123' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to load chat session');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error loading chat session:',
        expect.any(SyntaxError)
      );
    });

    it('should handle GCS download errors', async () => {
      const userInfo = {
        email: 'user@example.com',
        name: 'Test User',
      };

      mockExists.mockResolvedValue([true]);
      mockDownload.mockRejectedValue(new Error('GCS error'));

      const request = new NextRequest('http://localhost:3000/api/chat/sessions/session-123', {
        headers: {
          'x-user-info': JSON.stringify(userInfo),
        },
      });

      const params = Promise.resolve({ sessionId: 'session-123' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to load chat session');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error loading chat session:',
        expect.any(Error)
      );
    });
  });

  describe('DELETE - Delete Chat Session', () => {
    const mockSessionsList = [
      {
        id: 'session-123',
        title: 'AI Job Search',
        created_at: '2025-07-30T10:00:00Z',
        updated_at: '2025-07-30T11:00:00Z',
      },
      {
        id: 'session-456',
        title: 'Resume Builder',
        created_at: '2025-07-29T14:00:00Z',
        updated_at: '2025-07-29T15:00:00Z',
      },
    ];

    it('should delete session successfully', async () => {
      const userInfo = {
        email: 'user@example.com',
        name: 'Test User',
      };

      // Setup mocks for session file
      mockExists.mockResolvedValueOnce([true]); // Session exists
      mockDelete.mockResolvedValueOnce(undefined); // Delete succeeds

      // Setup mocks for sessions list
      mockExists.mockResolvedValueOnce([true]); // List exists
      mockDownload.mockResolvedValueOnce([
        Buffer.from(JSON.stringify(mockSessionsList)),
      ]);
      mockSave.mockResolvedValueOnce(undefined);

      const request = new NextRequest('http://localhost:3000/api/chat/sessions/session-123', {
        method: 'DELETE',
        headers: {
          'x-user-info': JSON.stringify(userInfo),
        },
      });

      const params = Promise.resolve({ sessionId: 'session-123' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDelete).toHaveBeenCalled();

      // Verify list was updated
      expect(mockSave).toHaveBeenCalledWith(
        expect.stringContaining('session-456'), // Should contain the other session
        expect.objectContaining({
          metadata: { contentType: 'application/json' },
        })
      );
      expect(mockSave).toHaveBeenCalledWith(
        expect.not.stringContaining('session-123'), // Should NOT contain deleted session
        expect.any(Object)
      );
    });

    it('should return 404 when session not found', async () => {
      const userInfo = {
        email: 'user@example.com',
        name: 'Test User',
      };

      mockExists.mockResolvedValueOnce([false]); // Session doesn't exist

      const request = new NextRequest('http://localhost:3000/api/chat/sessions/nonexistent', {
        method: 'DELETE',
        headers: {
          'x-user-info': JSON.stringify(userInfo),
        },
      });

      const params = Promise.resolve({ sessionId: 'nonexistent' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Session not found');
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('should handle case when sessions list does not exist', async () => {
      const userInfo = {
        email: 'user@example.com',
        name: 'Test User',
      };

      mockExists.mockResolvedValueOnce([true]); // Session exists
      mockDelete.mockResolvedValueOnce(undefined); // Delete succeeds
      mockExists.mockResolvedValueOnce([false]); // List doesn't exist

      const request = new NextRequest('http://localhost:3000/api/chat/sessions/session-123', {
        method: 'DELETE',
        headers: {
          'x-user-info': JSON.stringify(userInfo),
        },
      });

      const params = Promise.resolve({ sessionId: 'session-123' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDownload).not.toHaveBeenCalled(); // No list to download
      expect(mockSave).not.toHaveBeenCalled(); // No list to update
    });

    it('should return 401 when user not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/sessions/session-123', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ sessionId: 'session-123' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      const userInfo = {
        email: 'user@example.com',
        name: 'Test User',
      };

      mockExists.mockResolvedValueOnce([true]);
      mockDelete.mockRejectedValue(new Error('GCS delete failed'));

      const request = new NextRequest('http://localhost:3000/api/chat/sessions/session-123', {
        method: 'DELETE',
        headers: {
          'x-user-info': JSON.stringify(userInfo),
        },
      });

      const params = Promise.resolve({ sessionId: 'session-123' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete chat session');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error deleting chat session:',
        expect.any(Error)
      );
    });

    it('should handle list update errors gracefully', async () => {
      const userInfo = {
        email: 'user@example.com',
        name: 'Test User',
      };

      mockExists.mockResolvedValueOnce([true]); // Session exists
      mockDelete.mockResolvedValueOnce(undefined); // Delete succeeds
      mockExists.mockResolvedValueOnce([true]); // List exists
      mockDownload.mockRejectedValue(new Error('List read failed'));

      const request = new NextRequest('http://localhost:3000/api/chat/sessions/session-123', {
        method: 'DELETE',
        headers: {
          'x-user-info': JSON.stringify(userInfo),
        },
      });

      const params = Promise.resolve({ sessionId: 'session-123' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      // Should still return 500 due to list update failure
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete chat session');
    });
  });
});

/**
 * Chat Session API Considerations:
 *
 * 1. Authentication:
 *    - Uses x-user-info header
 *    - Email sanitization for paths
 *
 * 2. Data Structure:
 *    - Individual session files
 *    - Separate sessions list
 *    - Messages array with timestamps
 *
 * 3. Operations:
 *    - GET: Retrieve session details
 *    - DELETE: Remove session and update list
 *
 * 4. Error Handling:
 *    - 404 for missing sessions
 *    - 401 for unauthorized
 *    - 500 for GCS errors
 *
 * 5. Consistency:
 *    - Update sessions list on delete
 *    - Handle missing list gracefully
 *    - Atomic operations where possible
 */
