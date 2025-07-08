import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/implementations/gcs-storage-service-impl');
jest.mock('@/lib/implementations/vertex-ai-service-impl');

describe('/api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if message is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toBe('Message is required');
  });

  it('should handle valid chat request', async () => {
    const mockUserInfo = {
      email: 'test@example.com',
      id: '123',
      role: 'student'
    };

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'x-user-info': JSON.stringify(mockUserInfo)
      },
      body: JSON.stringify({
        message: 'Hello AI',
        context: {}
      }),
    });

    // Mock the AI service response
    const mockVertexAI = require('@/lib/implementations/vertex-ai-service-impl');
    mockVertexAI.VertexAIServiceImpl.prototype.chat = jest.fn().mockResolvedValue({
      message: 'Hello! How can I help you today?'
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.response).toBeDefined();
    expect(data.sessionId).toBeDefined();
  });

  it('should handle existing session ID', async () => {
    const mockUserInfo = {
      email: 'test@example.com',
      id: '123',
      role: 'student'
    };

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'x-user-info': JSON.stringify(mockUserInfo)
      },
      body: JSON.stringify({
        message: 'Continue conversation',
        sessionId: 'existing-session-123',
        context: {}
      }),
    });

    // Mock the storage service
    const mockStorage = require('@/lib/implementations/gcs-storage-service-impl');
    mockStorage.GCSStorageServiceImpl.prototype.readUserData = jest.fn().mockResolvedValue({
      email: 'test@example.com',
      sessions: {
        'existing-session-123': {
          id: 'existing-session-123',
          messages: []
        }
      }
    });

    // Mock the AI service response
    const mockVertexAI = require('@/lib/implementations/vertex-ai-service-impl');
    mockVertexAI.VertexAIServiceImpl.prototype.chat = jest.fn().mockResolvedValue({
      message: 'I can help you with that!'
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.response).toBeDefined();
    expect(data.sessionId).toBe('existing-session-123');
  });

  it('should handle errors gracefully', async () => {
    const mockUserInfo = {
      email: 'test@example.com',
      id: '123',
      role: 'student'
    };

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'x-user-info': JSON.stringify(mockUserInfo)
      },
      body: JSON.stringify({
        message: 'Hello AI',
        context: {}
      }),
    });

    // Mock the AI service to throw an error
    const mockVertexAI = require('@/lib/implementations/vertex-ai-service-impl');
    mockVertexAI.VertexAIServiceImpl.prototype.chat = jest.fn().mockRejectedValue(
      new Error('AI service unavailable')
    );

    const response = await POST(request);
    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});