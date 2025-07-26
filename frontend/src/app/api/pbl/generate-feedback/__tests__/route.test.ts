// Mock setup must come before any imports that use the mocked modules
const mockGetServerSession = jest.fn();
jest.mock('@/lib/auth/session', () => ({
  getServerSession: () => mockGetServerSession()
}));

// Mock repository factory before route import
const mockRepositoryFactory = {
  getProgramRepository: jest.fn(),
  getEvaluationRepository: jest.fn(),
  getTaskRepository: jest.fn(),
  getScenarioRepository: jest.fn(),
};
jest.mock('@/lib/db/repositories/factory', () => ({
  createRepositoryFactory: () => mockRepositoryFactory
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { VertexAI } from '@google-cloud/vertexai';


jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn()
    })
  })),
  SchemaType: {
    OBJECT: 'object',
    STRING: 'string',
    ARRAY: 'array'
  }
}));

// Also mock the base repository factory
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: mockRepositoryFactory
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

jest.mock('yaml', () => ({
  parse: jest.fn()
}));

describe('/api/pbl/generate-feedback', () => {
  const mockCompletionData = {
    overallScore: 75,
    evaluatedTasks: 3,
    totalTasks: 3,
    totalTimeSeconds: 1800,
    domainScores: {
      engaging_with_ai: 80,
      creating_with_ai: 70,
      managing_with_ai: 75,
      designing_with_ai: 70
    },
    tasks: [
      {
        taskId: 'task1',
        evaluation: {
          score: 80,
          feedback: 'Good job',
          strengths: ['Strong questioning'],
          improvements: ['More exploration needed']
        },
        log: {
          interactions: [
            { role: 'user', content: 'How do I analyze this?' },
            { role: 'assistant', content: 'Here\'s how...' }
          ]
        }
      }
    ]
  };

  const mockFeedbackResponse = {
    overallAssessment: "Excellent performance in the AI literacy scenario",
    strengths: [
      {
        area: "Critical Thinking",
        description: "Demonstrated strong analytical skills",
        example: "Asked insightful questions about analysis methods"
      },
      {
        area: "Engagement",
        description: "Actively participated in all tasks",
        example: "Completed all three tasks with high scores"
      }
    ],
    areasForImprovement: [
      {
        area: "Exploration",
        description: "Could explore more diverse approaches",
        suggestion: "Try different questioning strategies"
      }
    ],
    nextSteps: [
      "Practice with more complex scenarios",
      "Focus on creative problem-solving"
    ],
    encouragement: "Great job! Keep up the excellent work."
  };

  const createRequest = (body: any, headers: Record<string, string> = {}, cookies: Record<string, string> = {}) => {
    const request = new NextRequest('http://localhost:3000/api/pbl/generate-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept-language': 'en',
        ...headers
      },
      body: JSON.stringify(body)
    });

    // Mock cookies
    Object.entries(cookies).forEach(([key, value]) => {
      (request.cookies.get as jest.Mock) = jest.fn((name) => 
        name === key ? { value } : undefined
      );
    });

    return request;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' }
    });

    // Setup repository mocks
    const mockProgramRepo = {
      findById: jest.fn().mockResolvedValue({
        id: 'prog123',
        userId: 'user123',
        scenarioId: 'career-advisor',
        status: 'completed',
        metadata: {}
      }),
      update: jest.fn()
    };
    const mockEvalRepo = {
      findById: jest.fn().mockResolvedValue(null),
      findByProgram: jest.fn().mockResolvedValue([]),
      create: jest.fn()
    };
    const mockTaskRepo = {
      findByProgram: jest.fn().mockResolvedValue([])
    };
    const mockScenarioRepo = {
      findById: jest.fn()
    };
    
    mockRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo);
    mockRepositoryFactory.getEvaluationRepository.mockReturnValue(mockEvalRepo);
    mockRepositoryFactory.getTaskRepository.mockReturnValue(mockTaskRepo);
    mockRepositoryFactory.getScenarioRepository.mockReturnValue(mockScenarioRepo);
    
    const fs = require('fs/promises');
    const yaml = require('yaml');
    fs.readFile.mockResolvedValue('title: Test Scenario\nlearning_objectives:\n  - Learn AI basics');
    yaml.parse.mockReturnValue({
      title: 'Test Scenario',
      learning_objectives: ['Learn AI basics']
    });
  });

  describe('successful feedback generation', () => {
    it('generates new feedback when none exists', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockFeedbackResponse)
              }]
            }
          }]
        }
      });

      const mockGetGenerativeModel = jest.fn().mockReturnValue({
        generateContent: mockGenerateContent
      });

      (VertexAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: mockGetGenerativeModel
      }));

      const request = createRequest({
        programId: 'prog123',
        scenarioId: 'career-advisor'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.feedback).toEqual(mockFeedbackResponse);
      expect(data.cached).toBe(false);
      
      expect(mockRepositoryFactory.getProgramRepository().update).toHaveBeenCalledWith(
        'test@example.com',
        'career-advisor',
        'prog123',
        mockFeedbackResponse,
        'en'
      );
    });

    it('returns cached feedback when it exists for the language', async () => {
      mockRepositoryFactory.getProgramRepository().findById.mockResolvedValue({
        id: 'prog123',
        userId: 'user123',
        scenarioId: 'career-advisor',
        status: 'completed',
        metadata: {
          evaluationMetadata: {
            ...mockCompletionData,
            qualitativeFeedback: {
              en: mockFeedbackResponse
            }
          }
        }
      });

      const request = createRequest({
        programId: 'prog123',
        scenarioId: 'career-advisor'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.feedback).toEqual(mockFeedbackResponse);
      expect(data.cached).toBe(true);
      
      // Should not call AI or update feedback
      expect(VertexAI).not.toHaveBeenCalled();
      expect(mockRepositoryFactory.getProgramRepository().update).not.toHaveBeenCalled();
    });

    it('generates feedback in different languages', async () => {
      const japaneseFeedback = {
        ...mockFeedbackResponse,
        overallAssessment: "AIリテラシーシナリオでの優れたパフォーマンス"
      };

      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(japaneseFeedback)
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

      const request = createRequest(
        {
          programId: 'prog123',
          scenarioId: 'career-advisor'
        },
        { 'accept-language': 'ja' }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.feedback.overallAssessment).toContain('AI');
      
      // Check that Japanese was requested in the prompt
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[0].parts[0].text).toContain('Japanese (日本語)');
    });

    it('forces regeneration when forceRegenerate is true', async () => {
      mockRepositoryFactory.getProgramRepository().findById.mockResolvedValue({
        id: 'prog123',
        userId: 'user123',
        scenarioId: 'career-advisor',
        status: 'completed',
        metadata: {
          ...mockCompletionData,
          qualitativeFeedback: {
            en: { overallAssessment: 'Old feedback' }
          }
        }
      });

      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockFeedbackResponse)
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
        programId: 'prog123',
        scenarioId: 'career-advisor',
        forceRegenerate: true
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cached).toBe(false);
      expect(data.feedback).toEqual(mockFeedbackResponse);
      
      // Should update feedback twice - once to remove, once to add new
      expect(mockRepositoryFactory.getProgramRepository().update).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('returns 400 when programId is missing', async () => {
      const request = createRequest({
        scenarioId: 'career-advisor'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required parameters');
    });

    it('returns 400 when scenarioId is missing', async () => {
      const request = createRequest({
        programId: 'prog123'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required parameters');
    });

    it('returns 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = createRequest({
        programId: 'prog123',
        scenarioId: 'career-advisor'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('returns 404 when completion data not found', async () => {
      mockRepositoryFactory.getProgramRepository().findById.mockResolvedValue(null);

      const request = createRequest({
        programId: 'prog123',
        scenarioId: 'career-advisor'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Program not found');
    });

    it('handles AI generation errors', async () => {
      (VertexAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockRejectedValue(new Error('AI service error'))
        })
      }));

      const request = createRequest({
        programId: 'prog123',
        scenarioId: 'career-advisor'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to generate feedback');
    });

    it('handles and repairs truncated JSON responses', async () => {
      const truncatedJson = `{
        "overallAssessment": "Good performance",
        "strengths": [
          {
            "area": "Analysis",
            "description": "Strong analytical`;

      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: truncatedJson
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
        programId: 'prog123',
        scenarioId: 'career-advisor'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should have fallback feedback due to parse error
      expect(data.feedback.overallAssessment).toBeDefined();
    });
  });

  describe('legacy feedback handling', () => {
    it('returns legacy single-language feedback when language matches', async () => {
      const legacyFeedback = {
        overallAssessment: "Old format feedback",
        strengths: [],
        areasForImprovement: [],
        nextSteps: [],
        encouragement: "Keep going!"
      };

      mockRepositoryFactory.getProgramRepository().findById.mockResolvedValue({
        id: 'prog123',
        userId: 'user123',
        scenarioId: 'career-advisor',
        status: 'completed',
        metadata: {
          ...mockCompletionData,
          qualitativeFeedback: legacyFeedback,
          feedbackLanguage: 'en'
        }
      });

      const request = createRequest({
        programId: 'prog123',
        scenarioId: 'career-advisor'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.feedback).toEqual(legacyFeedback);
      expect(data.cached).toBe(true);
    });

    it('generates new feedback when legacy language does not match', async () => {
      const legacyFeedback = {
        overallAssessment: "Old English feedback",
        strengths: [],
        areasForImprovement: [],
        nextSteps: [],
        encouragement: "Keep going!"
      };

      mockRepositoryFactory.getProgramRepository().findById.mockResolvedValue({
        id: 'prog123',
        userId: 'test@example.com',
        scenarioId: 'career-advisor',
        status: 'completed',
        metadata: {
          evaluationMetadata: {
            ...mockCompletionData,
            qualitativeFeedback: legacyFeedback,
            feedbackLanguage: 'en'
          }
        }
      });

      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockFeedbackResponse)
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

      const request = createRequest(
        {
          programId: 'prog123',
          scenarioId: 'career-advisor'
        },
        { 'accept-language': 'ja' }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cached).toBe(false);
      expect(mockGenerateContent).toHaveBeenCalled();
    });
  });

  describe('scenario file handling', () => {
    it('converts kebab-case scenario ID to snake_case for filename', async () => {
      const fs = require('fs/promises');
      
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockFeedbackResponse)
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
        programId: 'prog123',
        scenarioId: 'multi-part-scenario'
      });
      await POST(request);

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('multi_part_scenario_scenario.yaml'),
        'utf-8'
      );
    });

    it('handles scenario file read errors gracefully', async () => {
      const fs = require('fs/promises');
      fs.readFile.mockRejectedValue(new Error('File not found'));

      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockFeedbackResponse)
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
        programId: 'prog123',
        scenarioId: 'career-advisor'
      });
      const response = await POST(request);
      const data = await response.json();

      // Should still succeed with empty scenario data
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});