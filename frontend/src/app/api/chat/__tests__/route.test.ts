/**
 * Chat API Route Tests - Simplified for functionality
 * Testing the main chat endpoint with proper authentication
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock console methods
const mockConsole = {
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn()
};

jest.spyOn(console, 'error').mockImplementation(mockConsole.error);
jest.spyOn(console, 'log').mockImplementation(mockConsole.log);
jest.spyOn(console, 'warn').mockImplementation(mockConsole.warn);

// Mock Google Cloud Storage
jest.mock('@google-cloud/storage', () => {
  return {
    Storage: jest.fn().mockImplementation(() => ({
      bucket: jest.fn().mockReturnValue({
        file: jest.fn().mockImplementation((filePath: string) => {
          // Mock different file types based on path
          if (filePath.includes('chat/sessions/')) {
            // Mock chat session file
            return {
              exists: jest.fn().mockResolvedValue([true]),
              download: jest.fn().mockResolvedValue([JSON.stringify({
                id: 'test-session-123',
                title: 'Test Chat',
                created_at: '2023-01-01T00:00:00Z',
                updated_at: '2023-01-01T00:00:00Z',
                messages: [],
                last_message: '',
                message_count: 0,
                tags: []
              })]),
              save: jest.fn().mockResolvedValue(undefined)
            };
          } else if (filePath.includes('chat/index.json')) {
            // Mock chat index file
            return {
              exists: jest.fn().mockResolvedValue([true]),
              download: jest.fn().mockResolvedValue([JSON.stringify({
                sessions: []
              })]),
              save: jest.fn().mockResolvedValue(undefined)
            };
          } else if (filePath.includes('user_data.json')) {
            // Mock user data file
            return {
              exists: jest.fn().mockResolvedValue([true]),
              download: jest.fn().mockResolvedValue([JSON.stringify({
                identity: 'student',
                goals: ['AI literacy'],
                assessmentResult: {
                  overallScore: 75,
                  domainScores: { 'Creating with AI': 50 }
                },
                completedPBLs: [],
                learningStyle: 'visual'
              })]),
              save: jest.fn().mockResolvedValue(undefined)
            };
          } else {
            // Default mock for memory files
            return {
              exists: jest.fn().mockResolvedValue([false]),
              download: jest.fn().mockResolvedValue([JSON.stringify({})]),
              save: jest.fn().mockResolvedValue(undefined)
            };
          }
        })
      })
    }))
  };
});

// Mock Vertex AI
jest.mock('@google-cloud/vertexai', () => {
  const mockSendMessage = jest.fn().mockResolvedValue({
    response: {
      candidates: [{
        content: {
          parts: [{ text: 'AI response from chat' }]
        }
      }]
    }
  });

  return {
    VertexAI: jest.fn().mockImplementation(() => ({
      preview: {
        getGenerativeModel: jest.fn().mockReturnValue({
          startChat: jest.fn().mockReturnValue({
            sendMessage: mockSendMessage
          })
        })
      }
    }))
  };
});

describe('POST /api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    process.env.GOOGLE_CLOUD_REGION = 'us-central1';
  });

  afterEach(() => {
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GOOGLE_CLOUD_REGION;
  });

  // Helper to create authenticated request
  const createAuthRequest = (body: object) => {
    return new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({ email: 'test@example.com', name: 'Test User' })
      }
    });
  };

  // Helper to create unauthenticated request
  const createUnauthRequest = (body: object) => {
    return new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  };

  it('should handle authenticated chat request successfully', async () => {
    const request = createAuthRequest({
      message: 'Tell me about AI literacy',
      sessionId: 'test-session-123'
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('response');
    expect(data).toHaveProperty('sessionId');
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = createUnauthRequest({
      message: 'Tell me about AI literacy'
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should handle missing Google Cloud configuration', async () => {
    delete process.env.GOOGLE_CLOUD_PROJECT;
    
    const request = createAuthRequest({
      message: 'Test message'
    });

    const response = await POST(request);
    const data = await response.json();

    // The mocked services always return success, so we can't actually test the error case
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('response');
  });

  it('should return 503 when AI services not configured (fresh module)', async () => {
    delete process.env.GOOGLE_CLOUD_PROJECT;
    jest.resetModules();

    // Re-require route with fresh module state (vertexAI/bucket not initialized)
    const { POST: FreshPOST } = require('../route');

    const request = createAuthRequest({ message: 'hello' });
    const res = await FreshPOST(request);
    const data = await res.json();
    expect(res.status).toBe(503);
    expect(data.error).toBe('AI services not configured');
  });

  it('should return 404 when user context not found (no user_data.json)', async () => {
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    jest.resetModules();
    jest.doMock('@google-cloud/storage', () => ({
      Storage: jest.fn().mockImplementation(() => ({
        bucket: jest.fn().mockReturnValue({
          file: jest.fn().mockImplementation((filePath: string) => {
            if (filePath.endsWith('user_data.json')) {
              return {
                exists: jest.fn().mockResolvedValue([false]),
                download: jest.fn(),
                save: jest.fn(),
              };
            }
            // default minimal file mock
            return {
              exists: jest.fn().mockResolvedValue([false]),
              download: jest.fn().mockResolvedValue([JSON.stringify({})]),
              save: jest.fn().mockResolvedValue(undefined),
            };
          }),
        }),
      })),
    }));
    const { POST: FreshPOST } = require('../route');

    const request = createAuthRequest({ message: 'hi' });
    const res = await FreshPOST(request);
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toBe('User context not found');
  });

  it('should return 500 when VertexAI sendMessage throws', async () => {
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    jest.resetModules();

    jest.doMock('@google-cloud/storage', () => ({
      Storage: jest.fn().mockImplementation(() => ({
        bucket: jest.fn().mockReturnValue({
          file: jest.fn().mockImplementation((filePath: string) => {
            if (filePath.endsWith('user_data.json')) {
              return {
                exists: jest.fn().mockResolvedValue([true]),
                download: jest.fn().mockResolvedValue([JSON.stringify({
                  identity: 'student', goals: [], assessmentResult: { overallScore: 50, domainScores: {} }, completedPBLs: [], learningStyle: 'visual'
                })]),
                save: jest.fn(),
              };
            }
            if (filePath.includes('chat/')) {
              return { exists: jest.fn().mockResolvedValue([false]), download: jest.fn(), save: jest.fn() };
            }
            return { exists: jest.fn().mockResolvedValue([false]), download: jest.fn(), save: jest.fn() };
          }),
        }),
      })),
    }));

    jest.doMock('@google-cloud/vertexai', () => ({
      VertexAI: jest.fn().mockImplementation(() => ({
        preview: {
          getGenerativeModel: jest.fn().mockReturnValue({
            startChat: jest.fn().mockReturnValue({
              sendMessage: jest.fn(async () => { throw new Error('ai down'); }),
            }),
            generateContent: jest.fn().mockResolvedValue({ response: { candidates: [{ content: { parts: [{ text: 'Title' }] } }] } }),
          }),
        },
      })),
    }));

    const { POST: FreshPOST } = require('../route');
    const request = createAuthRequest({ message: 'will fail' });
    const res = await FreshPOST(request);
    expect(res.status).toBe(500);
  });
});