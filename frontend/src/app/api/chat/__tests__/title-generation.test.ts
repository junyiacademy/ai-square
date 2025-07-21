import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock Google Cloud dependencies
jest.mock('@google-cloud/storage');
jest.mock('@google-cloud/vertexai');

describe('/api/chat - Title Generation', () => {
  let mockStorage: any;
  let mockVertexAI: any;
  let mockBucket: any;
  let mockFile: any;
  let mockModel: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Google Cloud Storage
    mockFile = {
      exists: jest.fn(),
      download: jest.fn(),
      save: jest.fn()
    };
    
    mockBucket = {
      file: jest.fn().mockReturnValue(mockFile)
    };
    
    mockStorage = {
      bucket: jest.fn().mockReturnValue(mockBucket)
    };
    
    const { Storage } = require('@google-cloud/storage');
    Storage.mockImplementation(() => mockStorage);
    
    // Mock Vertex AI
    mockModel = {
      generateContent: jest.fn(),
      startChat: jest.fn()
    };
    
    mockVertexAI = {
      preview: {
        getGenerativeModel: jest.fn().mockReturnValue(mockModel)
      }
    };
    
    const { VertexAI } = require('@google-cloud/vertexai');
    VertexAI.mockImplementation(() => mockVertexAI);
  });

  it('should generate title for new chat session', async () => {
    const mockUserInfo = {
      email: 'test@example.com',
      id: '123',
      role: 'student'
    };

    // Mock user context file exists
    mockFile.exists.mockResolvedValue([true]);
    mockFile.download.mockResolvedValue([JSON.stringify({
      identity: 'student',
      goals: ['improve AI skills'],
      assessmentResult: {
        overallScore: 75,
        dimensionScores: { 'Engaging_with_AI': 80 }
      }
    })]);

    // Mock memory files don't exist
    mockFile.exists
      .mockResolvedValueOnce([true]) // user_data.json exists
      .mockResolvedValueOnce([false]) // short_term.json doesn't exist
      .mockResolvedValueOnce([false]) // long_term.json doesn't exist
      .mockResolvedValueOnce([false]) // session file doesn't exist (new session)
      .mockResolvedValueOnce([false]); // index.json doesn't exist

    // Mock AI chat response
    const mockChat = {
      sendMessage: jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: 'Hello! How can I help you with your AI learning journey?' }]
            }
          }]
        }
      })
    };
    mockModel.startChat.mockReturnValue(mockChat);

    // Mock title generation
    mockModel.generateContent.mockResolvedValue({
      response: {
        candidates: [{
          content: {
            parts: [{ text: 'AI 學習指導' }]
          }
        }]
      }
    });

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'x-user-info': JSON.stringify(mockUserInfo)
      },
      body: JSON.stringify({
        message: 'Hi, I want to learn about AI literacy',
        context: {}
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.response).toBeDefined();
    expect(data.sessionId).toBeDefined();
    expect(data.title).toBe('AI 學習指導');

    // Verify title generation was called
    expect(mockModel.generateContent).toHaveBeenCalledWith(
      expect.stringContaining('generate a short, descriptive title in Traditional Chinese')
    );
  });

  it('should update title for generic sessions with more messages', async () => {
    const mockUserInfo = {
      email: 'test@example.com',
      id: '123',
      role: 'student'
    };

    // Mock existing session with generic title
    const existingSession = {
      id: 'session-123',
      title: 'New Chat',
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'I need help with machine learning' }
      ],
      message_count: 3
    };

    // Mock user context
    mockFile.exists.mockResolvedValue([true]);
    mockFile.download
      .mockResolvedValueOnce([JSON.stringify({
        identity: 'student',
        goals: ['learn ML'],
        assessmentResult: { overallScore: 70 }
      })])
      .mockResolvedValueOnce([JSON.stringify(existingSession)]);

    // Mock AI response
    const mockChat = {
      sendMessage: jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: 'I can help you learn machine learning concepts!' }]
            }
          }]
        }
      })
    };
    mockModel.startChat.mockReturnValue(mockChat);

    // Mock title generation
    mockModel.generateContent.mockResolvedValue({
      response: {
        candidates: [{
          content: {
            parts: [{ text: '機器學習入門指導' }]
          }
        }]
      }
    });

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'x-user-info': JSON.stringify(mockUserInfo)
      },
      body: JSON.stringify({
        message: 'Can you explain neural networks?',
        sessionId: 'session-123',
        context: {}
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.title).toBe('機器學習入門指導');

    // Verify title was generated for session with 4+ messages
    expect(mockModel.generateContent).toHaveBeenCalled();
  });

  it('should not regenerate title for sessions with custom titles', async () => {
    const mockUserInfo = {
      email: 'test@example.com',
      id: '123',
      role: 'student'
    };

    // Mock existing session with custom title
    const existingSession = {
      id: 'session-456',
      title: 'Python 程式設計討論',
      messages: [
        { role: 'user', content: 'Help with Python' },
        { role: 'assistant', content: 'Sure, what do you need?' }
      ],
      message_count: 2
    };

    mockFile.exists.mockResolvedValue([true]);
    mockFile.download
      .mockResolvedValueOnce([JSON.stringify({
        identity: 'student',
        assessmentResult: { overallScore: 70 }
      })])
      .mockResolvedValueOnce([JSON.stringify(existingSession)]);

    // Mock AI response
    const mockChat = {
      sendMessage: jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: 'What Python topic would you like to explore?' }]
            }
          }]
        }
      })
    };
    mockModel.startChat.mockReturnValue(mockChat);

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'x-user-info': JSON.stringify(mockUserInfo)
      },
      body: JSON.stringify({
        message: 'Explain loops please',
        sessionId: 'session-456',
        context: {}
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.title).toBe('Python 程式設計討論');

    // Verify title generation was NOT called for sessions with custom titles
    expect(mockModel.generateContent).not.toHaveBeenCalledWith(
      expect.stringContaining('generate a short, descriptive title')
    );
  });
});