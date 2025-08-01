/**
 * Chat API Route Tests
 * 測試聊天 API
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { VertexAI } from '@google-cloud/vertexai';

// Mock Google Cloud Storage
const mockDownload = jest.fn();
const mockExists = jest.fn();
const mockSave = jest.fn();
const mockFile = jest.fn();

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockImplementation(() => ({
      file: mockFile.mockImplementation(() => ({
        download: mockDownload,
        exists: mockExists,
        save: mockSave,
      })),
    })),
  })),
}));

// Mock Vertex AI
const mockSendMessage = jest.fn();
const mockStartChat = jest.fn(() => ({
  sendMessage: mockSendMessage,
}));
const mockGenerateContent = jest.fn();

jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    preview: {
      getGenerativeModel: jest.fn(() => ({
        startChat: mockStartChat,
        generateContent: mockGenerateContent,
      })),
    },
  })),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-session-id'),
}));

// Mock console
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('/api/chat', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      GOOGLE_CLOUD_PROJECT: 'test-project',
      GOOGLE_APPLICATION_CREDENTIALS: 'test-credentials',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('POST - Chat with AI', () => {
    const mockUserData = {
      identity: 'student',
      goals: ['Learn AI basics', 'Build AI projects'],
      assessmentResult: {
        overallScore: 75,
        domainScores: {
          engaging_with_ai: 80,
          creating_with_ai: 70,
          managing_ai: 65,
          designing_ai: 50,
        },
      },
    };

    const mockUserMemory = {
      shortTerm: {
        recentActivities: [],
        currentProgress: {},
        recentTopics: ['Previous topic'],
        lastUpdated: '2025-07-30T10:00:00Z',
      },
      longTerm: {
        profile: {},
        learningStyle: 'visual',
        achievements: [],
        preferences: {},
        lastUpdated: '2025-07-30T10:00:00Z',
      },
    };

    it('should process chat request successfully', async () => {
      // Mock user data file
      mockExists.mockResolvedValueOnce([true]); // user_data.json exists
      mockDownload.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockUserData))]);

      // Mock memory files
      mockExists.mockResolvedValueOnce([true]); // short_term.json exists
      mockDownload.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockUserMemory.shortTerm))]);
      mockExists.mockResolvedValueOnce([true]); // long_term.json exists
      mockDownload.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockUserMemory.longTerm))]);

      // Mock session file doesn't exist (new session)
      mockExists.mockResolvedValueOnce([false]);

      // Mock chat index doesn't exist
      mockExists.mockResolvedValueOnce([false]);

      // Mock AI response
      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: 'Based on your assessment, I recommend focusing on the "Designing AI" domain.',
              }],
            },
          }],
        },
      });

      // Mock title generation
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: 'AI 學習建議',
              }],
            },
          }],
        },
      });

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'x-user-info': JSON.stringify({ email: 'user@example.com' }),
        },
        body: JSON.stringify({
          message: 'What should I focus on based on my assessment?',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        response: 'Based on your assessment, I recommend focusing on the "Designing AI" domain.',
        sessionId: 'test-session-id',
        title: 'AI 學習建議',
      });

      // Verify AI was called with proper context
      expect(mockStartChat).toHaveBeenCalledWith({
        history: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            parts: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('Identity: student'),
              }),
            ]),
          }),
        ]),
      });

      // Verify messages were saved
      expect(mockSave).toHaveBeenCalledTimes(4); // session, index, session with title, memory
    });

    it('should handle existing session', async () => {
      const existingSession = {
        id: 'existing-session',
        title: 'Existing Chat',
        messages: [
          { role: 'user', content: 'Hello', timestamp: '2025-07-30T09:00:00Z' },
          { role: 'assistant', content: 'Hi there!', timestamp: '2025-07-30T09:00:01Z' },
        ],
        message_count: 2,
      };

      // Mock user data
      mockExists.mockResolvedValueOnce([true]);
      mockDownload.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockUserData))]);

      // Mock memory
      mockExists.mockResolvedValueOnce([false]); // short_term doesn't exist
      mockExists.mockResolvedValueOnce([false]); // long_term doesn't exist

      // Mock existing session
      mockExists.mockResolvedValueOnce([true]);
      mockDownload.mockResolvedValueOnce([Buffer.from(JSON.stringify(existingSession))]);

      // Mock chat index exists
      mockExists.mockResolvedValueOnce([true]);
      mockDownload.mockResolvedValueOnce([
        Buffer.from(JSON.stringify({ sessions: [{ id: 'existing-session' }] })),
      ]);

      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: 'Continuing our conversation...' }],
            },
          }],
        },
      });

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'x-user-info': JSON.stringify({ email: 'user@example.com' }),
        },
        body: JSON.stringify({
          message: 'Continue from before',
          sessionId: 'existing-session',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionId).toBe('existing-session');
      expect(data.title).toBe('Existing Chat'); // Keeps existing title
    });

    it('should return 401 when user not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when user context not found', async () => {
      mockExists.mockResolvedValue([false]); // user_data.json doesn't exist

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'x-user-info': JSON.stringify({ email: 'newuser@example.com' }),
        },
        body: JSON.stringify({
          message: 'Hello',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User context not found');
    });

    it('should return 503 when AI services not configured', async () => {
      delete process.env.GOOGLE_CLOUD_PROJECT;

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'x-user-info': JSON.stringify({ email: 'user@example.com' }),
        },
        body: JSON.stringify({
          message: 'Hello',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('AI services not configured');
    });

    it('should handle weak domains properly', async () => {
      const userDataWithWeakDomains = {
        ...mockUserData,
        assessmentResult: {
          overallScore: 60,
          domainScores: {
            engaging_with_ai: 80,
            creating_with_ai: 70,
            managing_ai: 45, // Weak
            designing_ai: 40, // Weak
          },
        },
      };

      mockExists.mockResolvedValueOnce([true]);
      mockDownload.mockResolvedValueOnce([Buffer.from(JSON.stringify(userDataWithWeakDomains))]);
      mockExists.mockResolvedValueOnce([false]); // short_term
      mockExists.mockResolvedValueOnce([false]); // long_term
      mockExists.mockResolvedValueOnce([false]); // session
      mockExists.mockResolvedValueOnce([false]); // index

      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: 'I see you need help with managing and designing AI.' }],
            },
          }],
        },
      });

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'x-user-info': JSON.stringify({ email: 'user@example.com' }),
        },
        body: JSON.stringify({
          message: 'Help me improve',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify weak domains were passed to AI
      expect(mockStartChat).toHaveBeenCalledWith({
        history: expect.arrayContaining([
          expect.objectContaining({
            parts: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('Weak Domains: managing_ai, designing_ai'),
              }),
            ]),
          }),
        ]),
      });
    });

    it('should update title for generic "New Chat" after multiple messages', async () => {
      const sessionWithGenericTitle = {
        id: 'session-123',
        title: 'New Chat',
        messages: [
          { role: 'user', content: 'Q1', timestamp: '2025-07-30T09:00:00Z' },
          { role: 'assistant', content: 'A1', timestamp: '2025-07-30T09:00:01Z' },
          { role: 'user', content: 'Q2', timestamp: '2025-07-30T09:00:02Z' },
        ],
        message_count: 3,
      };

      mockExists.mockResolvedValueOnce([true]); // user_data
      mockDownload.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockUserData))]);
      mockExists.mockResolvedValueOnce([false]); // short_term
      mockExists.mockResolvedValueOnce([false]); // long_term
      mockExists.mockResolvedValueOnce([true]); // session exists
      mockDownload.mockResolvedValueOnce([Buffer.from(JSON.stringify(sessionWithGenericTitle))]);
      mockExists.mockResolvedValueOnce([false]); // index

      mockSendMessage.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: 'Answer' }],
            },
          }],
        },
      });

      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: '學習討論' }],
            },
          }],
        },
      });

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'x-user-info': JSON.stringify({ email: 'user@example.com' }),
        },
        body: JSON.stringify({
          message: 'Q3',
          sessionId: 'session-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('學習討論');
      expect(mockGenerateContent).toHaveBeenCalled(); // Title generation called
    });

    it('should handle AI response errors', async () => {
      mockExists.mockResolvedValueOnce([true]);
      mockDownload.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockUserData))]);
      mockExists.mockResolvedValueOnce([false]);
      mockExists.mockResolvedValueOnce([false]);

      const error = new Error('AI service error');
      mockSendMessage.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'x-user-info': JSON.stringify({ email: 'user@example.com' }),
        },
        body: JSON.stringify({
          message: 'Hello',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process chat request');
      expect(mockConsoleError).toHaveBeenCalledWith('Chat API error:', error);
    });
  });
});

/**
 * Chat API Considerations:
 * 
 * 1. Authentication:
 *    - Uses x-user-info header
 *    - Requires user context from storage
 * 
 * 2. AI Context:
 *    - Loads user profile and memory
 *    - Includes assessment scores
 *    - Tracks weak domains
 *    - Considers learning style
 * 
 * 3. Session Management:
 *    - Creates new sessions with UUID
 *    - Updates existing sessions
 *    - Auto-generates titles
 *    - Maintains chat index
 * 
 * 4. Memory System:
 *    - Short-term: Recent topics
 *    - Long-term: Profile and preferences
 *    - Updates after each interaction
 * 
 * 5. Title Generation:
 *    - Auto-generates after first exchange
 *    - Updates generic titles after 4 messages
 *    - Uses Traditional Chinese
 */