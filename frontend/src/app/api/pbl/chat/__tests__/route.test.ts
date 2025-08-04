/**
 * PBL Chat Route Tests
 * 提升覆蓋率從 0% 到 80%+
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { VertexAI } from '@google-cloud/vertexai';
import type { IScenario, ITask } from '@/types/unified-learning';
import type { ChatMessage } from '@/types/pbl-api';
import { mockConsoleError, mockConsoleWarn, mockConsoleLog } from '@/test-utils/helpers/console';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getScenarioRepository: jest.fn(),
    getTaskRepository: jest.fn()
  }
}));
jest.mock('@google-cloud/vertexai');

// Mock console methods
const mockError = mockConsoleError();
const mockWarn = mockConsoleWarn();
const mockLog = mockConsoleLog();

describe('POST /api/pbl/chat', () => {
  const mockScenarioRepo = {
    findById: jest.fn()
  };
  const mockTaskRepo = {
    findById: jest.fn()
  };

  const mockScenario: IScenario = {
    id: 'scenario-123',
    mode: 'pbl',
    status: 'active',
    version: '1.0',
    sourceType: 'yaml',
    sourceMetadata: {},
    title: { en: 'Test Scenario' },
    description: { en: 'Test Description' },
    objectives: ['Learn AI'],
    difficulty: 'beginner',
    estimatedMinutes: 45,
    prerequisites: [],
    taskTemplates: [],
    taskCount: 1,
    xpRewards: {},
    unlockRequirements: {},
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    aiModules: {},
    resources: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    metadata: {}
  };

  const mockTask: ITask = {
    id: 'task-123',
    programId: 'program-123',
    mode: 'pbl',
    taskIndex: 0,
    scenarioTaskIndex: 0,
    type: 'chat',
    status: 'active',
    title: { en: 'Chat with AI' },
    description: { en: 'Practice AI conversation' },
    content: {
      instructions: ['Ask questions', 'Get feedback'],
      expectedOutcome: 'Understanding AI capabilities'
    },
    interactions: [],
    interactionCount: 0,
    userResponse: {},
    score: 0,
    maxScore: 100,
    allowedAttempts: 3,
    attemptCount: 0,
    timeSpentSeconds: 0,
    aiConfig: {
      role: 'AI tutor',
      persona: 'friendly and helpful tutor',
      initialPrompt: 'I am here to help you learn about AI.'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {
      taskTemplate: {
        aiModule: {
          role: 'AI tutor',
          persona: 'friendly and helpful tutor',
          initialPrompt: 'I am here to help you learn about AI.'
        }
      }
    }
  };

  const mockGenerateContent = jest.fn();
  const mockGetGenerativeModel = jest.fn(() => ({
    generateContent: mockGenerateContent
  }));
  const mockVertexAI = {
    preview: {
      getGenerativeModel: mockGetGenerativeModel
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
    (VertexAI as jest.Mock).mockImplementation(() => mockVertexAI);
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'test@example.com' }
    });
    (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);
    mockTaskRepo.findById.mockResolvedValue(mockTask);
    mockGenerateContent.mockResolvedValue({
      response: {
        candidates: [{
          content: {
            parts: [{
              text: 'AI tutor response'
            }]
          }
        }]
      }
    });
  });

  afterEach(() => {
    mockError.mockClear();
    mockWarn.mockClear();
    mockLog.mockClear();
    delete process.env.GOOGLE_CLOUD_PROJECT;
  });

  describe('Request Validation', () => {
    it('should return 400 when missing required fields', async () => {
      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 when missing message', async () => {
      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-123',
          context: {}
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 when missing context', async () => {
      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          sessionId: 'session-123'
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          sessionId: 'session-123',
          context: {
            scenarioId: 'scenario-123',
            taskId: 'task-123',
            taskTitle: 'Test Task',
            taskDescription: 'Test Description',
            instructions: ['Do this'],
            expectedOutcome: 'Success'
          }
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 401 when session has no user email', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({ user: {} });

      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          sessionId: 'session-123',
          context: {
            scenarioId: 'scenario-123',
            taskId: 'task-123',
            taskTitle: 'Test Task',
            taskDescription: 'Test Description',
            instructions: ['Do this'],
            expectedOutcome: 'Success'
          }
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Scenario and Task Validation', () => {
    it('should return 404 when scenario not found', async () => {
      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          sessionId: 'session-123',
          context: {
            scenarioId: 'invalid-scenario',
            taskId: 'task-123',
            taskTitle: 'Test Task',
            taskDescription: 'Test Description',
            instructions: ['Do this'],
            expectedOutcome: 'Success'
          }
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Scenario not found: invalid-scenario');
    });

    it('should return 404 when task not found', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          sessionId: 'session-123',
          context: {
            scenarioId: 'scenario-123',
            taskId: 'invalid-task',
            taskTitle: 'Test Task',
            taskDescription: 'Test Description',
            instructions: ['Do this'],
            expectedOutcome: 'Success'
          }
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Task not found');
    });
  });

  describe('AI Module Configuration', () => {
    it('should use AI module from task metadata', async () => {
      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello AI',
          sessionId: 'session-123',
          context: {
            scenarioId: 'scenario-123',
            taskId: 'task-123',
            taskTitle: 'Test Task',
            taskDescription: 'Test Description',
            instructions: ['Learn AI', 'Ask questions'],
            expectedOutcome: 'Understanding AI'
          }
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBe('AI tutor response');
      expect(data.sessionId).toBe('session-123');
      
      // Verify AI module was used in prompt
      const generatedPrompt = mockGenerateContent.mock.calls[0][0];
      expect(generatedPrompt).toContain('friendly and helpful tutor');
      expect(generatedPrompt).toContain('AI tutor');
      expect(generatedPrompt).toContain('I am here to help you learn about AI');
    });

    it('should use default AI module when not found', async () => {
      const taskWithoutAI = {
        ...mockTask,
        metadata: {}
      };
      mockTaskRepo.findById.mockResolvedValue(taskWithoutAI);

      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          sessionId: 'session-123',
          context: {
            scenarioId: 'scenario-123',
            taskId: 'task-123',
            taskTitle: 'Test Task',
            taskDescription: 'Test Description',
            instructions: ['Do this'],
            expectedOutcome: 'Success'
          }
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockWarn).toHaveBeenCalledWith(
        'AI module not found for task:',
        expect.any(Object)
      );
      expect(mockLog).toHaveBeenCalledWith('Using default AI module configuration');
      
      // Verify default AI module was used
      const generatedPrompt = mockGenerateContent.mock.calls[0][0];
      expect(generatedPrompt).toContain('helpful AI tutor');
      expect(generatedPrompt).toContain('supportive learning assistant');
    });

    it('should handle AI module with snake_case naming', async () => {
      const taskWithSnakeCase = {
        ...mockTask,
        metadata: {
          taskTemplate: {
            ai_module: {
              role: 'mentor',
              persona: 'experienced guide',
              initial_prompt: 'Let me guide you'
            }
          }
        }
      };
      mockTaskRepo.findById.mockResolvedValue(taskWithSnakeCase);

      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Help me',
          sessionId: 'session-123',
          context: {
            scenarioId: 'scenario-123',
            taskId: 'task-123',
            taskTitle: 'Test Task',
            taskDescription: 'Test Description',
            instructions: ['Learn'],
            expectedOutcome: 'Knowledge'
          }
        })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const generatedPrompt = mockGenerateContent.mock.calls[0][0];
      expect(generatedPrompt).toContain('experienced guide');
      expect(generatedPrompt).toContain('mentor');
      expect(generatedPrompt).toContain('Let me guide you');
    });
  });

  describe('Language Support', () => {
    it('should use English by default', async () => {
      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          sessionId: 'session-123',
          context: {
            scenarioId: 'scenario-123',
            taskId: 'task-123',
            taskTitle: 'Test Task',
            taskDescription: 'Test Description',
            instructions: ['Do this'],
            expectedOutcome: 'Success'
          }
        })
      });
      
      await POST(request);
      
      const generatedPrompt = mockGenerateContent.mock.calls[0][0];
      expect(generatedPrompt).toContain('Please respond in English');
    });

    it('should support multiple languages', async () => {
      const languages = [
        { code: 'zhTW', instruction: '請用繁體中文回應。' },
        { code: 'es', instruction: 'Por favor responde en español.' },
        { code: 'ja', instruction: '日本語で応答してください。' },
        { code: 'ko', instruction: '한국어로 응답해 주세요.' }
      ];

      for (const { code, instruction } of languages) {
        jest.clearAllMocks();
        
        const request = new NextRequest(`http://localhost/api/pbl/chat?lang=${code}`, {
          method: 'POST',
          body: JSON.stringify({
            message: 'Hello',
            sessionId: 'session-123',
            context: {
              scenarioId: 'scenario-123',
              taskId: 'task-123',
              taskTitle: 'Test Task',
              taskDescription: 'Test Description',
              instructions: ['Do this'],
              expectedOutcome: 'Success'
            }
          })
        });
        
        await POST(request);
        
        const generatedPrompt = mockGenerateContent.mock.calls[0][0];
        expect(generatedPrompt).toContain(instruction);
      }
    });
  });

  describe('Conversation History', () => {
    it('should include conversation history in prompt', async () => {
      const conversationHistory: ChatMessage[] = [
        { role: 'user', content: 'What is AI?' },
        { role: 'assistant', content: 'AI stands for Artificial Intelligence.' }
      ];

      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Tell me more',
          sessionId: 'session-123',
          context: {
            scenarioId: 'scenario-123',
            taskId: 'task-123',
            taskTitle: 'Test Task',
            taskDescription: 'Test Description',
            instructions: ['Learn AI'],
            expectedOutcome: 'Understanding',
            conversationHistory
          }
        })
      });
      
      await POST(request);
      
      expect(mockLog).toHaveBeenCalledWith(
        'Conversation history received:',
        expect.objectContaining({
          count: 2,
          history: conversationHistory
        })
      );
      
      const generatedPrompt = mockGenerateContent.mock.calls[0][0];
      expect(generatedPrompt).toContain('Previous conversation:');
      expect(generatedPrompt).toContain('User: What is AI?');
      expect(generatedPrompt).toContain('Assistant: AI stands for Artificial Intelligence.');
      expect(generatedPrompt).toContain('User: Tell me more');
    });

    it('should handle empty conversation history', async () => {
      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          sessionId: 'session-123',
          context: {
            scenarioId: 'scenario-123',
            taskId: 'task-123',
            taskTitle: 'Test Task',
            taskDescription: 'Test Description',
            instructions: ['Do this'],
            expectedOutcome: 'Success',
            conversationHistory: []
          }
        })
      });
      
      await POST(request);
      
      const generatedPrompt = mockGenerateContent.mock.calls[0][0];
      expect(generatedPrompt).not.toContain('Previous conversation:');
      expect(generatedPrompt).toContain('User: Hello');
    });
  });

  describe('Vertex AI Integration', () => {
    it('should return 500 when GOOGLE_CLOUD_PROJECT not set', async () => {
      delete process.env.GOOGLE_CLOUD_PROJECT;

      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          sessionId: 'session-123',
          context: {
            scenarioId: 'scenario-123',
            taskId: 'task-123',
            taskTitle: 'Test Task',
            taskDescription: 'Test Description',
            instructions: ['Do this'],
            expectedOutcome: 'Success'
          }
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('AI service not configured');
      expect(mockError).toHaveBeenCalledWith(
        'GOOGLE_CLOUD_PROJECT environment variable not set'
      );
    });

    it('should configure Vertex AI correctly', async () => {
      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          sessionId: 'session-123',
          context: {
            scenarioId: 'scenario-123',
            taskId: 'task-123',
            taskTitle: 'Test Task',
            taskDescription: 'Test Description',
            instructions: ['Do this'],
            expectedOutcome: 'Success'
          }
        })
      });
      
      await POST(request);

      expect(VertexAI).toHaveBeenCalledWith({
        project: 'test-project',
        location: 'us-central1'
      });

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
          topP: 0.95
        }
      });
    });

    it('should handle Vertex AI generation errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Generation failed'));

      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          sessionId: 'session-123',
          context: {
            scenarioId: 'scenario-123',
            taskId: 'task-123',
            taskTitle: 'Test Task',
            taskDescription: 'Test Description',
            instructions: ['Do this'],
            expectedOutcome: 'Success'
          }
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('AI generation failed: Generation failed');
      expect(mockError).toHaveBeenCalledWith(
        'Vertex AI error:',
        expect.objectContaining({
          error: expect.any(Error),
          message: 'Generation failed',
          projectId: 'test-project'
        })
      );
    });

    it('should handle missing response content', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: []
        }
      });

      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          sessionId: 'session-123',
          context: {
            scenarioId: 'scenario-123',
            taskId: 'task-123',
            taskTitle: 'Test Task',
            taskDescription: 'Test Description',
            instructions: ['Do this'],
            expectedOutcome: 'Success'
          }
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBe('I apologize, but I was unable to generate a response.');
    });
  });

  describe('Error Handling', () => {
    it('should handle general errors gracefully', async () => {
      (mockScenarioRepo.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          sessionId: 'session-123',
          context: {
            scenarioId: 'scenario-123',
            taskId: 'task-123',
            taskTitle: 'Test Task',
            taskDescription: 'Test Description',
            instructions: ['Do this'],
            expectedOutcome: 'Success'
          }
        })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process chat request');
      expect(mockError).toHaveBeenCalledWith(
        'Chat API error:',
        expect.any(Error)
      );
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        body: 'invalid json'
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process chat request');
    });
  });
});