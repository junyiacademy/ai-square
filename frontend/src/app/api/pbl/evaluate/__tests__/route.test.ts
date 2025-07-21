import { NextRequest } from 'next/server';
import { POST } from '../route';
import { VertexAI } from '@google-cloud/vertexai';

// Mock VertexAI
jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn()
    })
  }))
}));

describe('/api/pbl/evaluate', () => {
  const validRequestBody = {
    conversations: [
      { type: 'user', content: 'How do I analyze industry trends?' },
      { type: 'assistant', content: 'To analyze industry trends...' },
      { type: 'user', content: 'What metrics should I focus on?' },
      { type: 'assistant', content: 'Key metrics include...' }
    ],
    task: {
      id: 'task1',
      title: 'Industry Analysis',
      description: 'Learn to analyze industry trends',
      instructions: ['Research current trends', 'Identify key metrics'],
      expectedOutcome: 'Understanding of industry analysis'
    },
    targetDomains: ['engaging_with_ai', 'analyzing_with_ai'],
    focusKSA: ['K1.1', 'S2.1'],
    language: 'en'
  };

  const mockEvaluationResponse = {
    score: 75,
    ksaScores: {
      knowledge: 80,
      skills: 70,
      attitudes: 75
    },
    individualKsaScores: {
      'K1.1': 85,
      'S2.1': 70
    },
    dimensionScores: {
      engaging_with_ai: 80,
      creating_with_ai: 70,
      managing_with_ai: 75,
      designing_with_ai: 70
    },
    rubricsScores: {
      'Research Quality': 3,
      'AI Utilization': 3,
      'Content Quality': 3,
      'Learning Progress': 4
    },
    conversationInsights: {
      effectiveExamples: [
        {
          quote: 'What metrics should I focus on?',
          reason: 'Shows strategic thinking about analysis'
        }
      ],
      improvementAreas: []
    },
    strengths: [
      'Good questioning approach (S1.1)',
      'Shows interest in systematic analysis (K2.1)'
    ],
    improvements: [
      'Could explore more specific industry examples (K3.1)'
    ],
    nextSteps: [
      'Apply these concepts to a real industry case (S3.1)'
    ]
  };

  const createRequest = (body: any, cookieData: Record<string, string> = {}) => {
    const request = new NextRequest('http://localhost:3000/api/pbl/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    // Mock cookies for this specific request instance
    const mockCookies = {
      get: jest.fn((name) => {
        if (name === 'user' && !cookieData[name]) {
          return { value: JSON.stringify({ email: 'test@example.com' }) };
        }
        return cookieData[name] ? { value: cookieData[name] } : undefined;
      }),
      set: jest.fn(),
      delete: jest.fn(),
      has: jest.fn((name) => !!cookieData[name] || name === 'user'),
      getAll: jest.fn(() => Object.entries(cookieData).map(([name, value]) => ({ name, value })))
    };

    // Override the cookies property for this request instance
    Object.defineProperty(request, 'cookies', {
      value: mockCookies,
      writable: true,
      configurable: true
    });

    return request;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful evaluations', () => {
    it('evaluates a task with valid conversations', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockEvaluationResponse)
              }]
            }
          }]
        }
      });

      (VertexAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent
        })
      }));

      const request = createRequest(validRequestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.evaluation).toMatchObject({
        ...mockEvaluationResponse,
        taskId: 'task1',
        conversationCount: 2
      });
      expect(data.evaluation.evaluatedAt).toBeDefined();
    });

    it('filters only user messages for evaluation', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockEvaluationResponse)
              }]
            }
          }]
        }
      });

      (VertexAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent
        })
      }));

      const request = createRequest(validRequestBody);
      await POST(request);

      // Check that the prompt includes only user messages
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const promptText = callArgs.contents[0].parts[0].text;
      
      expect(promptText).toContain('How do I analyze industry trends?');
      expect(promptText).toContain('What metrics should I focus on?');
      expect(promptText).not.toContain('To analyze industry trends...');
      expect(promptText).not.toContain('Key metrics include...');
    });

    it('handles minimal engagement with low scores', async () => {
      const minimalEngagementResponse = {
        ...mockEvaluationResponse,
        score: 20,
        ksaScores: {
          knowledge: 20,
          skills: 20,
          attitudes: 20
        },
        dimensionScores: {
          engaging_with_ai: 20,
          creating_with_ai: 20,
          managing_with_ai: 20,
          designing_with_ai: 20
        },
        rubricsScores: {
          'Research Quality': 1,
          'AI Utilization': 1,
          'Content Quality': 1,
          'Learning Progress': 1
        }
      };

      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(minimalEngagementResponse)
              }]
            }
          }]
        }
      });

      (VertexAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent
        })
      }));

      const request = createRequest({
        ...validRequestBody,
        conversations: [
          { type: 'user', content: 'Hi' },
          { type: 'assistant', content: 'Hello! How can I help?' }
        ]
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.evaluation.score).toBe(20);
    });
  });

  describe('error handling', () => {
    it('returns 401 when user is not authenticated', async () => {
      // Create request without user cookie
      const request = new NextRequest('http://localhost:3000/api/pbl/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validRequestBody)
      });

      // Mock empty cookies
      const mockCookies = {
        get: jest.fn(() => undefined),
        set: jest.fn(),
        delete: jest.fn(),
        has: jest.fn(() => false),
        getAll: jest.fn(() => [])
      };

      Object.defineProperty(request, 'cookies', {
        value: mockCookies,
        writable: true,
        configurable: true
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User authentication required');
    });

    it('returns 400 when conversations are missing', async () => {
      const request = createRequest({
        ...validRequestBody,
        conversations: undefined
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required fields: conversations and task are required');
    });

    it('returns 400 when task is missing', async () => {
      const request = createRequest({
        ...validRequestBody,
        task: undefined
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required fields: conversations and task are required');
    });

    it('handles AI service errors', async () => {
      (VertexAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockRejectedValue(new Error('AI service unavailable'))
        })
      }));

      const request = createRequest(validRequestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('AI service unavailable');
    });

    it('provides fallback evaluation when JSON parsing fails', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: 'Invalid JSON response'
              }]
            }
          }]
        }
      });

      (VertexAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent
        })
      }));

      const request = createRequest(validRequestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.evaluation.score).toBe(20);
      expect(data.evaluation.ksaScores).toEqual({
        knowledge: 20,
        skills: 20,
        attitudes: 20
      });
      expect(data.evaluation.conversationInsights.improvementAreas).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty conversation history', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  ...mockEvaluationResponse,
                  score: 0
                })
              }]
            }
          }]
        }
      });

      (VertexAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent
        })
      }));

      const request = createRequest({
        ...validRequestBody,
        conversations: []
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.evaluation.conversationCount).toBe(0);
    });

    it('handles conversations with only assistant messages', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockEvaluationResponse)
              }]
            }
          }]
        }
      });

      (VertexAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent
        })
      }));

      const request = createRequest({
        ...validRequestBody,
        conversations: [
          { type: 'assistant', content: 'Welcome!' },
          { type: 'assistant', content: 'How can I help?' }
        ]
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.evaluation.conversationCount).toBe(0);
    });

    it('limits user messages to last 10', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockEvaluationResponse)
              }]
            }
          }]
        }
      });

      (VertexAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent
        })
      }));

      const manyConversations = Array(20).fill(null).map((_, i) => ({
        type: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`
      }));

      const request = createRequest({
        ...validRequestBody,
        conversations: manyConversations
      });
      await POST(request);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      const promptText = callArgs.contents[0].parts[0].text;
      
      // Should contain last 5 user messages (10 total messages, but only user ones)
      expect(promptText).toContain('Message 10');
      expect(promptText).toContain('Message 18');
      expect(promptText).not.toContain('Message 0');
    });

    it('truncates long messages in the prompt', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockEvaluationResponse)
              }]
            }
          }]
        }
      });

      (VertexAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent
        })
      }));

      const longMessage = 'A'.repeat(300);
      const request = createRequest({
        ...validRequestBody,
        conversations: [
          { type: 'user', content: longMessage }
        ]
      });
      await POST(request);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      const promptText = callArgs.contents[0].parts[0].text;
      
      // Message should be truncated to 200 characters
      expect(promptText).toContain('A'.repeat(200));
      expect(promptText).not.toContain('A'.repeat(201));
    });

    it('includes development error details in dev mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      // Use Object.defineProperty to mock NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true
      });

      const error = new Error('Detailed error message');
      (VertexAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockRejectedValue(error)
        })
      }));

      const request = createRequest(validRequestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBeDefined();

      // Restore original NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true
      });
    });
  });
});