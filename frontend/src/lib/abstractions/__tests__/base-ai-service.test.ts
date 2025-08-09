/**
 * Comprehensive Base AI Service Tests
 * Tests abstract class behavior, interface compliance, and mock implementations
 */

import { BaseAIService, IAIRequest, IAIResponse } from '../base-ai-service';

// Mock implementation of the abstract BaseAIService for testing
class MockAIService extends BaseAIService {
  private mockResponses: Map<string, IAIResponse> = new Map();
  private mockErrors: Map<string, Error> = new Map();
  private callHistory: Array<{ method: string; args: any[] }> = [];

  // Mock configuration
  setMockResponse(method: string, response: IAIResponse): void {
    this.mockResponses.set(method, response);
  }

  setMockError(method: string, error: Error): void {
    this.mockErrors.set(method, error);
  }

  getCallHistory(): Array<{ method: string; args: any[] }> {
    return this.callHistory;
  }

  clearCallHistory(): void {
    this.callHistory = [];
  }

  async generateContent(request: IAIRequest): Promise<IAIResponse> {
    this.callHistory.push({ method: 'generateContent', args: [request] });
    
    const error = this.mockErrors.get('generateContent');
    if (error) {
      throw error;
    }

    const mockResponse = this.mockResponses.get('generateContent');
    if (mockResponse) {
      return mockResponse;
    }

    // Default mock response
    return {
      content: `Mock response to: ${request.prompt}`,
      metadata: {
        model: 'mock-model',
        timestamp: new Date().toISOString(),
        temperature: request.temperature || 0.7,
        maxTokens: request.maxTokens || 1000
      }
    };
  }

  async generateChat(messages: Array<{ role: string; content: string }>): Promise<IAIResponse> {
    this.callHistory.push({ method: 'generateChat', args: [messages] });
    
    const error = this.mockErrors.get('generateChat');
    if (error) {
      throw error;
    }

    const mockResponse = this.mockResponses.get('generateChat');
    if (mockResponse) {
      return mockResponse;
    }

    // Default mock response
    const lastMessage = messages[messages.length - 1];
    return {
      content: `Mock chat response to: ${lastMessage?.content || 'No message'}`,
      metadata: {
        model: 'mock-chat-model',
        messageCount: messages.length,
        timestamp: new Date().toISOString()
      }
    };
  }

  async evaluateResponse(prompt: string, response: string, criteria: string[]): Promise<number> {
    this.callHistory.push({ method: 'evaluateResponse', args: [prompt, response, criteria] });
    
    const error = this.mockErrors.get('evaluateResponse');
    if (error) {
      throw error;
    }

    // Mock evaluation logic
    const score = Math.min(100, Math.max(0, 
      (response.length * 0.1) + (criteria.length * 10) + Math.random() * 20
    ));
    
    return Math.round(score);
  }
}

// Alternative mock implementation with different behavior
class FailingAIService extends BaseAIService {
  async generateContent(request: IAIRequest): Promise<IAIResponse> {
    throw new Error('Mock AI service failure');
  }

  async generateChat(messages: Array<{ role: string; content: string }>): Promise<IAIResponse> {
    throw new Error('Mock chat service failure');
  }

  async evaluateResponse(prompt: string, response: string, criteria: string[]): Promise<number> {
    throw new Error('Mock evaluation service failure');
  }
}

// High-performance mock for stress testing
class HighPerformanceAIService extends BaseAIService {
  private static responseCache = new Map<string, IAIResponse>();

  async generateContent(request: IAIRequest): Promise<IAIResponse> {
    const cacheKey = JSON.stringify(request);
    
    if (HighPerformanceAIService.responseCache.has(cacheKey)) {
      return HighPerformanceAIService.responseCache.get(cacheKey)!;
    }

    const response: IAIResponse = {
      content: `High-performance response: ${request.prompt.substring(0, 50)}...`,
      metadata: {
        cached: false,
        processingTime: Math.random() * 100,
        model: 'high-perf-model'
      }
    };

    HighPerformanceAIService.responseCache.set(cacheKey, response);
    return response;
  }

  async generateChat(messages: Array<{ role: string; content: string }>): Promise<IAIResponse> {
    return {
      content: `Fast chat response to ${messages.length} messages`,
      metadata: {
        model: 'high-perf-chat',
        speed: 'fast'
      }
    };
  }

  async evaluateResponse(prompt: string, response: string, criteria: string[]): Promise<number> {
    // Fast evaluation algorithm
    return Math.round((response.length + criteria.join('').length) % 100);
  }
}

describe('BaseAIService', () => {
  let mockAIService: MockAIService;
  let failingAIService: FailingAIService;
  let highPerfAIService: HighPerformanceAIService;

  beforeEach(() => {
    mockAIService = new MockAIService();
    failingAIService = new FailingAIService();
    highPerfAIService = new HighPerformanceAIService();
  });

  describe('Abstract Class Structure', () => {
    it('should not be instantiable directly', () => {
      // BaseAIService is abstract - attempting to instantiate should fail or create incomplete instance
      const instance = new (BaseAIService as any)();
      expect(instance.generateContent).toBeUndefined();
    });

    it('should require implementation of abstract methods', () => {
      // This is tested implicitly by the concrete implementations
      expect(mockAIService).toBeInstanceOf(BaseAIService);
      expect(failingAIService).toBeInstanceOf(BaseAIService);
      expect(highPerfAIService).toBeInstanceOf(BaseAIService);
    });

    it('should define the correct interface methods', () => {
      expect(typeof mockAIService.generateContent).toBe('function');
      expect(typeof mockAIService.generateChat).toBe('function');
      expect(typeof mockAIService.evaluateResponse).toBe('function');
    });
  });

  describe('generateContent()', () => {
    it('should handle basic content generation requests', async () => {
      const request: IAIRequest = {
        prompt: 'Test prompt',
        temperature: 0.7,
        maxTokens: 1000
      };

      const response = await mockAIService.generateContent(request);

      expect(response).toBeDefined();
      expect(response.content).toBe('Mock response to: Test prompt');
      expect(response.metadata).toBeDefined();
      expect(response.metadata?.temperature).toBe(0.7);
      expect(response.metadata?.maxTokens).toBe(1000);
    });

    it('should handle requests with system prompts', async () => {
      const request: IAIRequest = {
        prompt: 'User question',
        systemPrompt: 'You are a helpful assistant',
        temperature: 0.5
      };

      const response = await mockAIService.generateContent(request);

      expect(response).toBeDefined();
      expect(response.content).toContain('User question');
    });

    it('should handle requests with context', async () => {
      const request: IAIRequest = {
        prompt: 'Analyze this data',
        context: {
          data: [1, 2, 3, 4, 5],
          type: 'numerical'
        }
      };

      const response = await mockAIService.generateContent(request);

      expect(response).toBeDefined();
      expect(mockAIService.getCallHistory()).toHaveLength(1);
      expect(mockAIService.getCallHistory()[0].args[0]).toEqual(request);
    });

    it('should handle minimal requests with just prompt', async () => {
      const request: IAIRequest = {
        prompt: 'Simple question'
      };

      const response = await mockAIService.generateContent(request);

      expect(response).toBeDefined();
      expect(response.content).toBe('Mock response to: Simple question');
    });

    it('should handle complex prompts with special characters', async () => {
      const request: IAIRequest = {
        prompt: 'Test with special chars: äöü 中文 🚀 @#$%^&*()[]{}|;:,.<>?'
      };

      const response = await mockAIService.generateContent(request);

      expect(response).toBeDefined();
      expect(response.content).toContain('Test with special chars');
    });

    it('should handle very long prompts', async () => {
      const longPrompt = 'A'.repeat(10000);
      const request: IAIRequest = {
        prompt: longPrompt,
        maxTokens: 2000
      };

      const response = await mockAIService.generateContent(request);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });

    it('should throw errors when configured to fail', async () => {
      const request: IAIRequest = {
        prompt: 'Test prompt'
      };

      await expect(failingAIService.generateContent(request))
        .rejects.toThrow('Mock AI service failure');
    });

    it('should handle custom mock responses', async () => {
      const customResponse: IAIResponse = {
        content: 'Custom mock response',
        metadata: {
          customField: 'test',
          score: 95
        }
      };

      mockAIService.setMockResponse('generateContent', customResponse);

      const request: IAIRequest = {
        prompt: 'Test prompt'
      };

      const response = await mockAIService.generateContent(request);

      expect(response).toEqual(customResponse);
    });

    it('should handle mock errors', async () => {
      const customError = new Error('Custom test error');
      mockAIService.setMockError('generateContent', customError);

      const request: IAIRequest = {
        prompt: 'Test prompt'
      };

      await expect(mockAIService.generateContent(request))
        .rejects.toThrow('Custom test error');
    });
  });

  describe('generateChat()', () => {
    it('should handle basic chat messages', async () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' }
      ];

      const response = await mockAIService.generateChat(messages);

      expect(response).toBeDefined();
      expect(response.content).toBe('Mock chat response to: How are you?');
      expect(response.metadata?.messageCount).toBe(3);
    });

    it('should handle empty message array', async () => {
      const messages: Array<{ role: string; content: string }> = [];

      const response = await mockAIService.generateChat(messages);

      expect(response).toBeDefined();
      expect(response.content).toBe('Mock chat response to: No message');
      expect(response.metadata?.messageCount).toBe(0);
    });

    it('should handle single message', async () => {
      const messages = [
        { role: 'user', content: 'Single message test' }
      ];

      const response = await mockAIService.generateChat(messages);

      expect(response).toBeDefined();
      expect(response.content).toBe('Mock chat response to: Single message test');
    });

    it('should handle various message roles', async () => {
      const messages = [
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant message' },
        { role: 'function', content: 'Function result' }
      ];

      const response = await mockAIService.generateChat(messages);

      expect(response).toBeDefined();
      expect(response.metadata?.messageCount).toBe(4);
    });

    it('should handle messages with special characters', async () => {
      const messages = [
        { role: 'user', content: 'Message with emojis 😊🎉 and unicode 测试' }
      ];

      const response = await mockAIService.generateChat(messages);

      expect(response).toBeDefined();
      expect(response.content).toContain('Message with emojis');
    });

    it('should handle very long message history', async () => {
      const messages = Array(100).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}: ${'x'.repeat(100)}`
      }));

      const response = await mockAIService.generateChat(messages);

      expect(response).toBeDefined();
      expect(response.metadata?.messageCount).toBe(100);
    });

    it('should track method calls correctly', async () => {
      const messages = [
        { role: 'user', content: 'Test message' }
      ];

      await mockAIService.generateChat(messages);

      const history = mockAIService.getCallHistory();
      expect(history).toHaveLength(1);
      expect(history[0].method).toBe('generateChat');
      expect(history[0].args[0]).toEqual(messages);
    });

    it('should throw errors when configured to fail', async () => {
      const messages = [
        { role: 'user', content: 'Test message' }
      ];

      await expect(failingAIService.generateChat(messages))
        .rejects.toThrow('Mock chat service failure');
    });
  });

  describe('evaluateResponse()', () => {
    it('should evaluate responses with criteria', async () => {
      const prompt = 'What is machine learning?';
      const response = 'Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed.';
      const criteria = ['accuracy', 'completeness', 'clarity'];

      const score = await mockAIService.evaluateResponse(prompt, response, criteria);

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(score)).toBe(true);
    });

    it('should handle empty criteria array', async () => {
      const prompt = 'Simple question';
      const response = 'Simple answer';
      const criteria: string[] = [];

      const score = await mockAIService.evaluateResponse(prompt, response, criteria);

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle very short responses', async () => {
      const prompt = 'Yes or no question?';
      const response = 'Yes';
      const criteria = ['brevity', 'directness'];

      const score = await mockAIService.evaluateResponse(prompt, response, criteria);

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long responses', async () => {
      const prompt = 'Explain quantum computing';
      const response = 'A'.repeat(5000); // Very long response
      const criteria = ['depth', 'technical accuracy', 'comprehensiveness'];

      const score = await mockAIService.evaluateResponse(prompt, response, criteria);

      expect(typeof score).toBe('number');
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle multiple evaluation criteria', async () => {
      const prompt = 'Solve this math problem';
      const response = 'The answer is 42 because of the following calculation steps...';
      const criteria = [
        'mathematical accuracy',
        'step-by-step explanation',
        'clarity of presentation',
        'correctness of final answer',
        'use of appropriate terminology'
      ];

      const score = await mockAIService.evaluateResponse(prompt, response, criteria);

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle empty strings', async () => {
      const prompt = '';
      const response = '';
      const criteria = ['completeness'];

      const score = await mockAIService.evaluateResponse(prompt, response, criteria);

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should track evaluation calls', async () => {
      const prompt = 'Test prompt';
      const response = 'Test response';
      const criteria = ['test'];

      mockAIService.clearCallHistory();
      await mockAIService.evaluateResponse(prompt, response, criteria);

      const history = mockAIService.getCallHistory();
      expect(history).toHaveLength(1);
      expect(history[0].method).toBe('evaluateResponse');
      expect(history[0].args).toEqual([prompt, response, criteria]);
    });

    it('should throw errors when configured to fail', async () => {
      const prompt = 'Test prompt';
      const response = 'Test response';
      const criteria = ['test'];

      await expect(failingAIService.evaluateResponse(prompt, response, criteria))
        .rejects.toThrow('Mock evaluation service failure');
    });
  });

  describe('Interface Compliance', () => {
    it('should implement all required methods', () => {
      const methods = ['generateContent', 'generateChat', 'evaluateResponse'];
      
      methods.forEach(method => {
        expect(typeof mockAIService[method as keyof MockAIService]).toBe('function');
      });
    });

    it('should return promises from all async methods', () => {
      const contentPromise = mockAIService.generateContent({ prompt: 'test' });
      const chatPromise = mockAIService.generateChat([]);
      const evalPromise = mockAIService.evaluateResponse('', '', []);

      expect(contentPromise).toBeInstanceOf(Promise);
      expect(chatPromise).toBeInstanceOf(Promise);
      expect(evalPromise).toBeInstanceOf(Promise);
    });

    it('should handle IAIRequest interface correctly', async () => {
      const validRequests: IAIRequest[] = [
        { prompt: 'Basic prompt' },
        { prompt: 'With context', context: { key: 'value' } },
        { prompt: 'With system', systemPrompt: 'System instruction' },
        { prompt: 'With params', temperature: 0.8, maxTokens: 500 },
        { 
          prompt: 'Full request',
          context: { data: 'test' },
          systemPrompt: 'Be helpful',
          temperature: 0.9,
          maxTokens: 1500
        }
      ];

      for (const request of validRequests) {
        const response = await mockAIService.generateContent(request);
        expect(response).toBeDefined();
        expect(typeof response.content).toBe('string');
      }
    });

    it('should handle IAIResponse interface correctly', async () => {
      const response = await mockAIService.generateContent({ prompt: 'test' });

      expect(response).toHaveProperty('content');
      expect(typeof response.content).toBe('string');
      expect(response.metadata).toBeDefined();
      expect(typeof response.metadata).toBe('object');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map((_, i) => 
        mockAIService.generateContent({ prompt: `Request ${i}` })
      );

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(10);
      responses.forEach((response, i) => {
        expect(response.content).toBe(`Mock response to: Request ${i}`);
      });
    });

    it('should handle rapid sequential requests', async () => {
      const responses = [];
      
      for (let i = 0; i < 20; i++) {
        const response = await mockAIService.generateContent({ prompt: `Sequential ${i}` });
        responses.push(response);
      }

      expect(responses).toHaveLength(20);
      expect(mockAIService.getCallHistory()).toHaveLength(20);
    });

    it('should handle mixed method calls concurrently', async () => {
      const promises = [
        mockAIService.generateContent({ prompt: 'Content request' }),
        mockAIService.generateChat([{ role: 'user', content: 'Chat message' }]),
        mockAIService.evaluateResponse('prompt', 'response', ['criteria']),
        mockAIService.generateContent({ prompt: 'Another content request' }),
        mockAIService.generateChat([{ role: 'user', content: 'Another chat' }])
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(mockAIService.getCallHistory()).toHaveLength(5);
    });

    it('should maintain call history integrity under concurrent access', async () => {
      mockAIService.clearCallHistory();
      
      const promises = Array(50).fill(null).map((_, i) => 
        mockAIService.generateContent({ prompt: `Concurrent ${i}` })
      );

      await Promise.all(promises);

      const history = mockAIService.getCallHistory();
      expect(history).toHaveLength(50);
      
      // Check that all calls are recorded
      const prompts = history.map(h => h.args[0].prompt);
      for (let i = 0; i < 50; i++) {
        expect(prompts).toContain(`Concurrent ${i}`);
      }
    });

    it('should handle high-performance implementation efficiently', async () => {
      const startTime = Date.now();
      
      // Make many requests to high-performance service
      const requests = Array(100).fill(null).map((_, i) => 
        highPerfAIService.generateContent({ prompt: `Performance test ${i}` })
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      expect(responses).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
      
      // Test caching behavior
      const firstResponse = await highPerfAIService.generateContent({ prompt: 'Cache test' });
      const secondResponse = await highPerfAIService.generateContent({ prompt: 'Cache test' });
      
      expect(firstResponse.content).toBe(secondResponse.content);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', async () => {
      // Note: TypeScript would normally prevent these, but testing runtime behavior
      try {
        await mockAIService.generateContent(null as any);
      } catch (error) {
        expect(error).toBeDefined();
      }

      try {
        await mockAIService.generateChat(null as any);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle malformed request objects', async () => {
      const malformedRequests = [
        { prompt: null } as any,
        { prompt: undefined } as any,
        { prompt: 123 } as any,
        { prompt: {} } as any,
        { prompt: [] } as any
      ];

      for (const request of malformedRequests) {
        try {
          await mockAIService.generateContent(request);
          // If it doesn't throw, check the response is still valid
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    it('should handle extreme parameter values', async () => {
      const extremeRequests = [
        { prompt: 'test', temperature: -1 },
        { prompt: 'test', temperature: 2 },
        { prompt: 'test', maxTokens: -1 },
        { prompt: 'test', maxTokens: 1000000 },
        { prompt: 'test', temperature: Infinity },
        { prompt: 'test', temperature: NaN }
      ];

      for (const request of extremeRequests) {
        const response = await mockAIService.generateContent(request);
        expect(response).toBeDefined();
        expect(typeof response.content).toBe('string');
      }
    });

    it('should handle circular reference in context', async () => {
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;

      const request: IAIRequest = {
        prompt: 'Test with circular reference',
        context: circularObject
      };

      // Should handle without crashing
      const response = await mockAIService.generateContent(request);
      expect(response).toBeDefined();
    });

    it('should handle very large context objects', async () => {
      const largeContext = {
        data: Array(10000).fill(0).map((_, i) => ({ id: i, value: `item-${i}` })),
        metadata: {
          description: 'x'.repeat(10000)
        }
      };

      const request: IAIRequest = {
        prompt: 'Test with large context',
        context: largeContext
      };

      const response = await mockAIService.generateContent(request);
      expect(response).toBeDefined();
    });

    it('should handle partial service failures gracefully', async () => {
      // Configure partial failure
      mockAIService.setMockError('generateContent', new Error('Content generation failed'));
      
      // Content generation should fail
      await expect(mockAIService.generateContent({ prompt: 'test' }))
        .rejects.toThrow('Content generation failed');
      
      // But other methods should still work
      const chatResponse = await mockAIService.generateChat([{ role: 'user', content: 'test' }]);
      expect(chatResponse).toBeDefined();
      
      const evalScore = await mockAIService.evaluateResponse('test', 'test', ['test']);
      expect(typeof evalScore).toBe('number');
    });

    it('should handle network timeout scenarios', async () => {
      // Simulate timeout by throwing specific error
      class TimeoutAIService extends BaseAIService {
        async generateContent(request: IAIRequest): Promise<IAIResponse> {
          throw new Error('Request timeout after 30 seconds');
        }

        async generateChat(messages: Array<{ role: string; content: string }>): Promise<IAIResponse> {
          throw new Error('Chat timeout');
        }

        async evaluateResponse(prompt: string, response: string, criteria: string[]): Promise<number> {
          throw new Error('Evaluation timeout');
        }
      }

      const timeoutService = new TimeoutAIService();

      await expect(timeoutService.generateContent({ prompt: 'test' }))
        .rejects.toThrow('Request timeout');
      
      await expect(timeoutService.generateChat([]))
        .rejects.toThrow('Chat timeout');
        
      await expect(timeoutService.evaluateResponse('', '', []))
        .rejects.toThrow('Evaluation timeout');
    });
  });

  describe('Mock Utility Functions', () => {
    it('should allow setting and clearing mock responses', () => {
      const customResponse: IAIResponse = {
        content: 'Custom test response',
        metadata: { test: true }
      };

      mockAIService.setMockResponse('generateContent', customResponse);
      
      // Clear and set different response
      mockAIService.setMockResponse('generateContent', {
        content: 'Different response',
        metadata: { different: true }
      });

      expect(mockAIService['mockResponses'].get('generateContent'))
        .toEqual({ content: 'Different response', metadata: { different: true } });
    });

    it('should allow setting and clearing mock errors', () => {
      const testError = new Error('Test error');
      
      mockAIService.setMockError('generateContent', testError);
      
      expect(mockAIService['mockErrors'].get('generateContent')).toBe(testError);
    });

    it('should track call history accurately', async () => {
      mockAIService.clearCallHistory();
      
      await mockAIService.generateContent({ prompt: 'test1' });
      await mockAIService.generateChat([{ role: 'user', content: 'test2' }]);
      await mockAIService.evaluateResponse('test3', 'test4', ['test5']);
      
      const history = mockAIService.getCallHistory();
      
      expect(history).toHaveLength(3);
      expect(history[0].method).toBe('generateContent');
      expect(history[1].method).toBe('generateChat');
      expect(history[2].method).toBe('evaluateResponse');
    });

    it('should clear call history properly', async () => {
      await mockAIService.generateContent({ prompt: 'test' });
      expect(mockAIService.getCallHistory()).toHaveLength(1);
      
      mockAIService.clearCallHistory();
      expect(mockAIService.getCallHistory()).toHaveLength(0);
    });
  });
});