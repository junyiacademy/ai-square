/**
 * Tests for PBL chat route
 * Following TDD approach
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { VertexAI } from '@google-cloud/vertexai';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@google-cloud/vertexai');
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getScenarioRepository: jest.fn(() => ({
      findById: jest.fn(),
    })),
    getTaskRepository: jest.fn(() => ({
      update: jest.fn(),
    })),
  },
}));

// Mock console
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('POST /api/pbl/chat', () => {
  const mockScenarioId = 'scenario-123';
  const mockTaskId = 'task-123';
  
  const mockGenerateContent = jest.fn();
  const mockGetGenerativeModel = jest.fn(() => ({
    generateContent: mockGenerateContent,
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Vertex AI mock
    (VertexAI as jest.Mock).mockImplementation(() => ({
      preview: {
        getGenerativeModel: mockGetGenerativeModel,
      },
    }));
    
    // Setup session mock
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'test@example.com' },
    });

    // Setup environment
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    process.env.GOOGLE_CLOUD_LOCATION = 'us-central1';
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it('should process chat message successfully', async () => {
    // Mock AI response
    mockGenerateContent.mockResolvedValue({
      response: {
        candidates: [{
          content: {
            parts: [{
              text: "That's a good observation! Let me help you explore this problem further.",
            }],
          },
        }],
      },
    });

    const request = new NextRequest('http://localhost/api/pbl/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'I think we should consider user privacy',
        sessionId: 'session-123',
        context: {
          scenarioId: mockScenarioId,
          taskId: mockTaskId,
          taskTitle: 'Design an AI System',
          taskDescription: 'Create a privacy-preserving AI system',
          instructions: ['Consider user privacy', 'Think about data protection'],
          expectedOutcome: 'A well-designed AI system',
          conversationHistory: [],
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('message');
    expect(data.message).toContain("That's a good observation!");
    expect(data).toHaveProperty('score');
    expect(data).toHaveProperty('feedback');
  });

  it('should return 400 when required fields are missing', async () => {
    const request = new NextRequest('http://localhost/api/pbl/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test message',
        // Missing sessionId and context
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('should return 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/pbl/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test message',
        sessionId: 'session-123',
        context: {
          scenarioId: mockScenarioId,
          taskId: mockTaskId,
          taskTitle: 'Test Task',
          taskDescription: 'Test Description',
          instructions: [],
          expectedOutcome: 'Test Outcome',
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('should handle conversation history', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        candidates: [{
          content: {
            parts: [{
              text: 'Based on your previous points, I suggest...',
            }],
          },
        }],
      },
    });

    const request = new NextRequest('http://localhost/api/pbl/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'What about data encryption?',
        sessionId: 'session-123',
        context: {
          scenarioId: mockScenarioId,
          taskId: mockTaskId,
          taskTitle: 'Security Design',
          taskDescription: 'Design secure AI system',
          instructions: ['Focus on security'],
          expectedOutcome: 'Secure system design',
          conversationHistory: [
            { role: 'user', content: 'We need to protect user data' },
            { role: 'assistant', content: 'Yes, data protection is crucial' },
          ],
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify AI was called with conversation history
    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain('We need to protect user data');
  });

  it('should support different languages', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        candidates: [{
          content: {
            parts: [{
              text: '這是一個很好的觀察！',
            }],
          },
        }],
      },
    });

    const request = new NextRequest('http://localhost/api/pbl/chat?lang=zh', {
      method: 'POST',
      body: JSON.stringify({
        message: '我們應該考慮用戶隱私',
        sessionId: 'session-123',
        context: {
          scenarioId: mockScenarioId,
          taskId: mockTaskId,
          taskTitle: '設計AI系統',
          taskDescription: '創建隱私保護的AI系統',
          instructions: ['考慮用戶隱私'],
          expectedOutcome: '設計良好的AI系統',
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('這是一個很好的觀察');
  });

  it('should handle AI service errors gracefully', async () => {
    const error = new Error('AI service unavailable');
    mockGenerateContent.mockRejectedValue(error);

    const request = new NextRequest('http://localhost/api/pbl/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test message',
        sessionId: 'session-123',
        context: {
          scenarioId: mockScenarioId,
          taskId: mockTaskId,
          taskTitle: 'Test Task',
          taskDescription: 'Test Description',
          instructions: [],
          expectedOutcome: 'Test Outcome',
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to process chat');
    expect(mockConsoleError).toHaveBeenCalledWith('Chat processing error:', error);
  });

  it('should validate response quality and provide feedback', async () => {
    // Mock a response that partially addresses the task
    mockGenerateContent.mockResolvedValue({
      response: {
        candidates: [{
          content: {
            parts: [{
              text: 'You mentioned privacy, which is important. Consider also looking at data minimization principles.',
            }],
          },
        }],
      },
    });

    const request = new NextRequest('http://localhost/api/pbl/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Privacy is important',
        sessionId: 'session-123',
        context: {
          scenarioId: mockScenarioId,
          taskId: mockTaskId,
          taskTitle: 'Privacy-First AI Design',
          taskDescription: 'Design an AI system with privacy as the core principle',
          instructions: [
            'Identify privacy risks',
            'Propose mitigation strategies',
            'Consider GDPR compliance',
          ],
          expectedOutcome: 'A comprehensive privacy-preserving AI design',
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.score).toBeGreaterThan(0);
    expect(data.score).toBeLessThan(100); // Partial score for partial answer
    expect(data.feedback).toBeDefined();
  });

  it('should handle missing Google Cloud configuration', async () => {
    delete process.env.GOOGLE_CLOUD_PROJECT;

    const request = new NextRequest('http://localhost/api/pbl/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test message',
        sessionId: 'session-123',
        context: {
          scenarioId: mockScenarioId,
          taskId: mockTaskId,
          taskTitle: 'Test Task',
          taskDescription: 'Test Description',
          instructions: [],
          expectedOutcome: 'Test Outcome',
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('AI service not configured');
  });
});

/**
 * PBL Chat API Considerations:
 * 
 * 1. AI Integration:
 *    - Uses Vertex AI for generating responses
 *    - Maintains conversation context
 *    - Provides task-specific guidance
 * 
 * 2. Response Evaluation:
 *    - Scores based on task requirements
 *    - Provides constructive feedback
 *    - Tracks progress toward completion
 * 
 * 3. Multi-language Support:
 *    - Accepts language parameter
 *    - Generates responses in requested language
 * 
 * 4. Security:
 *    - Requires authentication
 *    - Validates all inputs
 *    - Handles errors gracefully
 */