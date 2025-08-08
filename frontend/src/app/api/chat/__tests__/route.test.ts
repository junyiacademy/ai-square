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
        file: jest.fn().mockReturnValue({
          exists: jest.fn().mockResolvedValue([true]),
          download: jest.fn().mockResolvedValue([JSON.stringify({
            identity: 'student',
            goals: ['AI literacy'],
            assessmentScore: 75,
            weakDomains: ['Creating with AI'],
            learningStyle: 'visual'
          })]),
          save: jest.fn().mockResolvedValue(undefined)
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

    expect(response.status).toBe(503);
    expect(data.error).toBe('AI services not configured');
  });
});