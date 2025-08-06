/**
 * Chat API Route Tests
 * Testing the main chat endpoint with AI integration
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { VertexAI } from '@google-cloud/vertexai';
import { mockConsoleError, mockConsoleLog } from '@/test-utils/helpers/console';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/utils/language', () => ({
  ...jest.requireActual('@/lib/utils/language'),
  getLanguageFromHeader: jest.fn(() => 'en')
}));

// Mock Vertex AI
jest.mock('@google-cloud/vertexai', () => {
  const mockGenerateContent = jest.fn();
  const mockGenerateContentStream = jest.fn();
  return {
    VertexAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream
      })
    })),
    HarmCategory: {
      HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT'
    },
    HarmBlockThreshold: {
      BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    __mockGenerateContent: mockGenerateContent,
    __mockGenerateContentStream: mockGenerateContentStream
  };
});

// Mock console methods
const mockError = mockConsoleError();
const mockLog = mockConsoleLog();

describe('POST /api/chat', () => {
  // Get mock functions
  const mockVertexAI = require('@google-cloud/vertexai');
  const mockGenerateContent = mockVertexAI.__mockGenerateContent;
  const mockGenerateContentStream = mockVertexAI.__mockGenerateContentStream;
  const { getLanguageFromHeader } = require('@/lib/utils/language');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    process.env.GOOGLE_CLOUD_REGION = 'us-central1';

    // Default mock implementations
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'test@example.com' }
    });

    // Default AI response
    mockGenerateContent.mockResolvedValue({
      response: {
        candidates: [{
          content: {
            parts: [{
              text: 'This is an AI response about AI literacy.'
            }]
          }
        }]
      }
    });

    // Default streaming response
    const mockStream = {
      stream: async function* () {
        yield {
          candidates: [{
            content: {
              parts: [{
                text: 'Streaming '
              }]
            }
          }]
        };
        yield {
          candidates: [{
            content: {
              parts: [{
                text: 'response '
              }]
            }
          }]
        };
        yield {
          candidates: [{
            content: {
              parts: [{
                text: 'here.'
              }]
            }
          }]
        };
      }
    };
    mockGenerateContentStream.mockResolvedValue(mockStream);
  });

  afterEach(() => {
    mockError.mockClear();
    mockLog.mockClear();
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GOOGLE_CLOUD_REGION;
  });

  describe('Request Validation', () => {
    it('should return 400 when messages array is empty', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: []
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Messages are required');
    });

    it('should return 400 when messages is not an array', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: 'not an array'
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Messages are required');
    });

    it('should return 400 when request body is invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: 'invalid json'
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process chat request');
    });
  });

  describe('Authentication', () => {
    it('should allow unauthenticated requests', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'What is AI?' }
          ]
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toBe('This is an AI response about AI literacy.');
    });

    it('should handle authenticated requests', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'What is AI?' }
          ]
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toBe('This is an AI response about AI literacy.');
      expect(data.model).toBe('gemini-2.5-flash');
    });
  });

  describe('Message Processing', () => {
    it('should handle single user message', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Explain machine learning' }
          ]
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining('Explain machine learning')
                })
              ])
            })
          ])
        })
      );
    });

    it('should handle conversation history', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'What is AI?' },
            { role: 'assistant', content: 'AI is artificial intelligence.' },
            { role: 'user', content: 'Tell me more' }
          ]
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({ role: 'user' }),
            expect.objectContaining({ role: 'model' }),
            expect.objectContaining({ role: 'user' })
          ])
        })
      );
    });

    it('should include system context', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Help me learn' }
          ],
          context: 'Educational context about AI'
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          systemInstruction: expect.objectContaining({
            parts: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('Educational context about AI')
              })
            ])
          })
        })
      );
    });
  });

  describe('Streaming Support', () => {
    it('should handle streaming requests', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Stream this response' }
          ],
          stream: true
        })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/event-stream');
      expect(mockGenerateContentStream).toHaveBeenCalled();
    });

    it('should handle non-streaming requests', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Regular response' }
          ],
          stream: false
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(data.content).toBe('This is an AI response about AI literacy.');
      expect(mockGenerateContent).toHaveBeenCalled();
      expect(mockGenerateContentStream).not.toHaveBeenCalled();
    });
  });

  describe('Language Support', () => {
    it('should default to English', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        })
      });
      
      await POST(request);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          systemInstruction: expect.objectContaining({
            parts: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('respond in English')
              })
            ])
          })
        })
      );
    });

    it('should support Chinese language', async () => {
      (getLanguageFromHeader as jest.Mock).mockReturnValue('zhTW');

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: '你好' }
          ]
        })
      });
      
      await POST(request);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          systemInstruction: expect.objectContaining({
            parts: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('respond in 繁體中文')
              })
            ])
          })
        })
      );
    });

    it('should support Spanish language', async () => {
      (getLanguageFromHeader as jest.Mock).mockReturnValue('es');

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Hola' }
          ]
        })
      });
      
      await POST(request);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          systemInstruction: expect.objectContaining({
            parts: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('respond in Español')
              })
            ])
          })
        })
      );
    });
  });

  describe('Configuration Options', () => {
    it('should apply custom temperature', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Test' }
          ],
          temperature: 0.5
        })
      });
      
      await POST(request);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            temperature: 0.5
          })
        })
      );
    });

    it('should apply custom max tokens', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Test' }
          ],
          maxTokens: 1000
        })
      });
      
      await POST(request);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            maxOutputTokens: 1000
          })
        })
      );
    });

    it('should apply safety settings', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Test' }
          ]
        })
      });
      
      await POST(request);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          safetySettings: expect.arrayContaining([
            expect.objectContaining({
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            })
          ])
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Vertex AI initialization errors', async () => {
      delete process.env.GOOGLE_CLOUD_PROJECT;

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Test' }
          ]
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('AI service configuration error');
    });

    it('should handle AI generation errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('AI service unavailable'));

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Test' }
          ]
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process chat request');
      expect(mockError).toHaveBeenCalledWith('Chat API error:', expect.any(Error));
    });

    it('should handle empty AI response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: []
        }
      });

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Test' }
          ]
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toBe('I apologize, but I was unable to generate a response. Please try again.');
    });

    it('should handle streaming errors', async () => {
      mockGenerateContentStream.mockRejectedValue(new Error('Stream failed'));

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Test' }
          ],
          stream: true
        })
      });
      
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to process chat request');
    });
  });

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Test' }
          ]
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('content');
      expect(data).toHaveProperty('model');
      expect(data).toHaveProperty('usage');
      expect(data.model).toBe('gemini-2.5-flash');
      expect(data.content).toBe('This is an AI response about AI literacy.');
    });

    it('should include usage information when available', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: 'Response with usage'
              }]
            }
          }],
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
            totalTokenCount: 150
          }
        }
      });

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Test' }
          ]
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      });
    });
  });

  describe('Special Scenarios', () => {
    it('should handle very long messages', async () => {
      const longMessage = 'a'.repeat(10000);
      
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: longMessage }
          ]
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should handle special characters in messages', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Test with 中文, émojis 😀, and symbols @#$%' }
          ]
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toBeDefined();
    });

    it('should handle empty content in messages', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: '' }
          ]
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Messages are required');
    });
  });
});