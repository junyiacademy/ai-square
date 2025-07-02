import { NextRequest } from 'next/server';
import { POST } from '../route';
import { promises as fs } from 'fs';
import yaml from 'js-yaml';
import { VertexAI } from '@google-cloud/vertexai';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));

jest.mock('js-yaml', () => ({
  load: jest.fn()
}));

jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn()
    })
  }))
}));

describe('/api/pbl/chat', () => {
  const mockScenarioData = {
    tasks: [
      {
        id: 'task1',
        ai_module: {
          initial_prompt: 'You are a helpful AI tutor.',
          persona: 'AI Tutor',
          model: 'gemini-2.5-flash'
        }
      }
    ]
  };

  const validRequestBody = {
    message: 'How do I analyze a resume?',
    sessionId: 'test-session-123',
    context: {
      scenarioId: 'career-advisor',
      taskId: 'task1',
      taskTitle: 'Resume Analysis',
      taskDescription: 'Learn to analyze resumes effectively',
      instructions: ['Read the resume', 'Identify key skills'],
      expectedOutcome: 'Understand resume structure',
      conversationHistory: [
        { type: 'user', content: 'Hello' },
        { type: 'assistant', content: 'Hi! How can I help?' }
      ]
    }
  };

  const createRequest = (body: any, headers: Record<string, string> = {}) => {
    return new NextRequest('http://localhost:3000/api/pbl/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body)
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.readFile as jest.Mock).mockResolvedValue('yaml content');
    (yaml.load as jest.Mock).mockReturnValue(mockScenarioData);
  });

  describe('successful responses', () => {
    it('processes a valid chat request', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: 'To analyze a resume, first look for relevant experience...'
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
      expect(data.response).toBe('To analyze a resume, first look for relevant experience...');
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{
          role: 'user',
          parts: [{
            text: expect.stringContaining('You are a helpful AI tutor')
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      });
    });

    it('handles different languages correctly', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: '履歴書を分析するには...'
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

      const request = createRequest(validRequestBody, {
        'accept-language': 'zhTW'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Check that Chinese language instruction was included
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[0].parts[0].text).toContain('繁體中文');
    });

    it('handles greeting-only messages', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: 'Hello! Let\'s focus on analyzing resumes...'
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
        message: 'Hello!'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Check that greeting handling instruction was included
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[0].parts[0].text).toContain('The user sent only a greeting');
    });

    it('handles off-topic messages', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: 'Let\'s get back to resume analysis...'
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
        message: 'What is the weather like today in Tokyo?'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Check that off-topic handling instruction was included
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[0].parts[0].text).toContain('appears off-topic');
    });
  });

  describe('error responses', () => {
    it('returns 400 for missing message', async () => {
      const request = createRequest({
        ...validRequestBody,
        message: undefined
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required fields');
    });

    it('returns 400 for missing sessionId', async () => {
      const request = createRequest({
        ...validRequestBody,
        sessionId: undefined
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required fields');
    });

    it('returns 400 for missing context', async () => {
      const request = createRequest({
        ...validRequestBody,
        context: undefined
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required fields');
    });

    it('returns 404 when task not found', async () => {
      (yaml.load as jest.Mock).mockReturnValue({
        tasks: [{ id: 'different-task' }]
      });

      const request = createRequest(validRequestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Task or AI module not found');
    });

    it('returns 404 when AI module not found', async () => {
      (yaml.load as jest.Mock).mockReturnValue({
        tasks: [{ id: 'task1' }] // No ai_module
      });

      const request = createRequest(validRequestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Task or AI module not found');
    });

    it('handles file read errors', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const request = createRequest(validRequestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to process chat request');
      expect(data.details).toBe('File not found');
    });

    it('handles AI generation errors', async () => {
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
      expect(data.error).toBe('Failed to process chat request');
      expect(data.details).toBe('AI service unavailable');
    });

    it('handles empty AI response', async () => {
      (VertexAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              candidates: []
            }
          })
        })
      }));

      const request = createRequest(validRequestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.response).toBe('I apologize, but I was unable to generate a response. Please try again.');
    });
  });

  describe('edge cases', () => {
    it('handles empty conversation history', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: 'Response without history'
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
        context: {
          ...validRequestBody.context,
          conversationHistory: []
        }
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Check that "No previous conversation" was included
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[0].parts[0].text).toContain('No previous conversation');
    });

    it('handles scenario ID with hyphens', async () => {
      const request = createRequest({
        ...validRequestBody,
        context: {
          ...validRequestBody.context,
          scenarioId: 'multi-part-scenario-name'
        }
      });
      
      await POST(request);

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('multi_part_scenario_name_scenario.yaml'),
        'utf8'
      );
    });

    it('uses default model when not specified', async () => {
      (yaml.load as jest.Mock).mockReturnValue({
        tasks: [{
          id: 'task1',
          ai_module: {
            initial_prompt: 'Test prompt',
            persona: 'Test Persona'
            // No model specified
          }
        }]
      });

      const mockGetGenerativeModel = jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: {
            candidates: [{
              content: {
                parts: [{
                  text: 'Response'
                }]
              }
            }]
          }
        })
      });

      (VertexAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: mockGetGenerativeModel
      }));

      const request = createRequest(validRequestBody);
      await POST(request);

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash'
      });
    });
  });
});