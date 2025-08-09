import { VertexAIService } from '../vertex-ai-service';
import { GoogleAuth } from 'google-auth-library';

// Mock Google Auth
jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getClient: jest.fn().mockResolvedValue({
      getAccessToken: jest.fn().mockResolvedValue({
        token: 'mock-access-token'
      })
    }),
    getProjectId: jest.fn().mockResolvedValue('test-project')
  }))
}));

// Mock fetch
global.fetch = jest.fn();

describe('VertexAIService', () => {
  let service: VertexAIService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    process.env.VERTEX_AI_LOCATION = 'us-central1';
    process.env.NODE_ENV = 'test';
    
    const config = {
      systemPrompt: 'You are a helpful AI assistant',
      temperature: 0.7,
      maxOutputTokens: 4096
    };
    
    service = new VertexAIService(config);
    
    // Mock fetch responses
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            role: 'model',
            parts: [{
              text: 'AI response'
            }]
          }
        }],
        usageMetadata: {
          totalTokenCount: 100
        }
      })
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with configuration', () => {
      expect(service).toBeDefined();
      expect(GoogleAuth).toHaveBeenCalled();
    });

    it('should throw error when project ID is missing in production', () => {
      delete process.env.GOOGLE_CLOUD_PROJECT;
      process.env.NODE_ENV = 'production';
      
      expect(() => new VertexAIService({
        systemPrompt: 'Test'
      })).toThrow('GOOGLE_CLOUD_PROJECT environment variable is required');
    });

    it('should not throw error when project ID is missing in test', () => {
      delete process.env.GOOGLE_CLOUD_PROJECT;
      process.env.NODE_ENV = 'test';
      
      const testService = new VertexAIService({
        systemPrompt: 'Test'
      });
      expect(testService).toBeDefined();
    });
  });

  describe('sendMessage', () => {
    it('should send message and receive response', async () => {
      const response = await service.sendMessage('Hello AI');
      
      expect(response).toEqual({
        content: 'AI response',
        tokensUsed: 100,
        processingTime: expect.any(Number)
      });
      
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should send message with context', async () => {
      const response = await service.sendMessage('Hello AI', {
        userId: '123',
        sessionId: 'abc'
      });
      
      expect(response).toEqual({
        content: 'AI response',
        tokensUsed: 100,
        processingTime: expect.any(Number)
      });
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });
      
      await expect(service.sendMessage('Hello'))
        .rejects.toThrow('Vertex AI error: 500');
    });

    it('should handle timeout', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        })
      );
      
      const error = new Error('Vertex AI request timed out after 25 seconds');
      error.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValueOnce(error);
      
      await expect(service.sendMessage('Hello'))
        .rejects.toThrow('Vertex AI request timed out');
    });

    it('should handle missing response parts', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              role: 'model',
              parts: []
            }
          }]
        })
      });
      
      const response = await service.sendMessage('Hello');
      expect(response.content).toBe('No response generated');
    });

    it('should handle missing candidates', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: []
        })
      });
      
      const response = await service.sendMessage('Hello');
      expect(response.content).toBe('No response generated');
    });
  });

  describe('getChatHistory', () => {
    it('should return chat history', async () => {
      await service.sendMessage('First message');
      await service.sendMessage('Second message');
      
      const history = service.getChatHistory();
      
      expect(history).toHaveLength(4); // System + 3 messages
      expect(history[0].role).toBe('user'); // System prompt
      expect(history[1].role).toBe('user'); // First message
      expect(history[2].role).toBe('model'); // First response
      expect(history[3].role).toBe('user'); // Second message
    });

    it('should include system prompt in history', () => {
      const history = service.getChatHistory();
      
      expect(history).toHaveLength(1);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toContain('You are a helpful AI assistant');
    });
  });

  describe('resetChat', () => {
    it('should reset chat history but keep system prompt', async () => {
      await service.sendMessage('Message 1');
      await service.sendMessage('Message 2');
      
      let history = service.getChatHistory();
      expect(history.length).toBeGreaterThan(1);
      
      service.resetChat();
      
      history = service.getChatHistory();
      expect(history).toHaveLength(1);
      expect(history[0].content).toContain('You are a helpful AI assistant');
    });
  });

  describe('multiple messages', () => {
    it('should handle conversation flow', async () => {
      const response1 = await service.sendMessage('First question');
      expect(response1.content).toBe('AI response');
      
      const response2 = await service.sendMessage('Follow up');
      expect(response2.content).toBe('AI response');
      
      const history = service.getChatHistory();
      expect(history.length).toBeGreaterThan(2);
    });

    it('should maintain context between messages', async () => {
      await service.sendMessage('My name is John');
      await service.sendMessage('What is my name?');
      
      const history = service.getChatHistory();
      expect(history.some(h => h.content.includes('John'))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );
      
      await expect(service.sendMessage('Test'))
        .rejects.toThrow('Network error');
    });

    it('should handle JSON parsing errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });
      
      await expect(service.sendMessage('Test'))
        .rejects.toThrow('Invalid JSON');
    });

    it('should handle authentication errors', async () => {
      const mockAuth = GoogleAuth as jest.MockedClass<typeof GoogleAuth>;
      mockAuth.mockImplementationOnce(() => ({
        getClient: jest.fn().mockRejectedValue(new Error('Auth failed')),
        getProjectId: jest.fn()
      } as any));
      
      const failService = new VertexAIService({
        systemPrompt: 'Test'
      });
      
      await expect(failService.sendMessage('Test'))
        .rejects.toThrow('Auth failed');
    });
  });

  describe('token tracking', () => {
    it('should track token usage', async () => {
      const response = await service.sendMessage('Hello');
      
      expect(response.tokensUsed).toBe(100);
    });

    it('should handle missing token metadata', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              role: 'model',
              parts: [{ text: 'Response' }]
            }
          }]
          // No usageMetadata
        })
      });
      
      const response = await service.sendMessage('Hello');
      expect(response.tokensUsed).toBeUndefined();
    });
  });

  describe('processing time', () => {
    it('should measure processing time', async () => {
      const response = await service.sendMessage('Test');
      
      expect(response.processingTime).toBeGreaterThan(0);
      expect(response.processingTime).toBeLessThan(30000);
    });
  });
});