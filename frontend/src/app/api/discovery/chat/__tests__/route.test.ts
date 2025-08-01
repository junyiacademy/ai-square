import { NextRequest } from 'next/server';
import { POST } from '../route';
import { VertexAI } from '@google-cloud/vertexai';

// Mock dependencies
jest.mock('@google-cloud/vertexai');

describe('Discovery Chat API Route', () => {
  let mockGenerateContent: jest.Mock;
  let mockGetGenerativeModel: jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup environment variables
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    process.env.GOOGLE_CLOUD_LOCATION = 'us-central1';
    
    // Setup Vertex AI mocks
    mockGenerateContent = jest.fn();
    mockGetGenerativeModel = jest.fn().mockReturnValue({
      generateContent: mockGenerateContent
    });
    
    (VertexAI as jest.Mock).mockImplementation(() => ({
      preview: {
        getGenerativeModel: mockGetGenerativeModel
      }
    } as any));
  });

  describe('POST /api/discovery/chat', () => {
    it('should return 400 when message or context is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/discovery/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello'
          // Missing context
        })
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Message and context are required');
    });

    it('should handle successful chat interaction', async () => {
      const mockAIResponse = '很高興能幫助你！讓我們開始探索科技創業的世界吧！🚀';
      
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: mockAIResponse
              }]
            }
          }]
        }
      });

      const context = {
        aiRole: 'Tech Mentor',
        pathTitle: 'Tech Entrepreneur',
        currentTask: 'Build MVP',
        taskIndex: 1,
        totalTasks: 5,
        currentTaskDescription: 'Create a minimum viable product',
        taskProgress: 50,
        completedTasks: ['Research market'],
        skills: ['Product Design', 'Coding', 'Marketing']
      };

      const request = new NextRequest('http://localhost:3000/api/discovery/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '我該如何開始建立 MVP？',
          context
        })
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.response).toBe(mockAIResponse);
      
      // Verify model was called correctly
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7,
          candidateCount: 1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      });
      
      // Verify content was generated with correct prompts
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [
          {
            role: 'user',
            parts: [{
              text: expect.stringContaining('我該如何開始建立 MVP？')
            }]
          }
        ],
        systemInstruction: {
          role: 'system',
          parts: [{
            text: expect.stringContaining('Tech Mentor')
          }]
        }
      });
    });

    it('should include all context information in system prompt', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: 'Response text'
              }]
            }
          }]
        }
      });

      const context = {
        aiRole: 'Data Science Coach',
        pathTitle: 'Data Analyst',
        currentTask: 'Clean dataset',
        taskIndex: 2,
        totalTasks: 10,
        currentTaskDescription: 'Remove duplicates and handle missing values',
        taskProgress: 75,
        completedTasks: ['Load data'],
        skills: ['Python', 'SQL', 'Statistics']
      };

      const request = new NextRequest('http://localhost:3000/api/discovery/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'How do I handle missing values?',
          context
        })
      });

      await POST(request);
      
      // Check that system prompt includes all context
      const systemPrompt = mockGenerateContent.mock.calls[0][0].systemInstruction.parts[0].text;
      
      expect(systemPrompt).toContain('Data Science Coach');
      expect(systemPrompt).toContain('Data Analyst');
      expect(systemPrompt).toContain('Clean dataset');
      expect(systemPrompt).toContain('2/10');
      expect(systemPrompt).toContain('75%');
      expect(systemPrompt).toContain('Python, SQL, Statistics');
    });

    it('should handle AI service errors gracefully', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('AI service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/discovery/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          context: {
            aiRole: 'Mentor',
            pathTitle: 'Test Path',
            currentTask: 'Task 1',
            taskIndex: 1,
            totalTasks: 1,
            currentTaskDescription: 'Test task',
            taskProgress: 0,
            completedTasks: [],
            skills: []
          }
        })
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to generate response');
    });

    it('should handle missing AI response gracefully', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          candidates: []
        }
      });

      const request = new NextRequest('http://localhost:3000/api/discovery/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          context: {
            aiRole: 'Mentor',
            pathTitle: 'Test Path',
            currentTask: 'Task 1',
            taskIndex: 1,
            totalTasks: 1,
            currentTaskDescription: 'Test task',
            taskProgress: 0,
            completedTasks: [],
            skills: []
          }
        })
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.response).toBe('我很樂意幫助你！請問有什麼問題嗎？');
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/discovery/chat', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to generate response');
    });

    it('should use correct generation config', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: 'Test response'
              }]
            }
          }]
        }
      });

      const request = new NextRequest('http://localhost:3000/api/discovery/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test',
          context: {
            aiRole: 'Mentor',
            pathTitle: 'Path',
            currentTask: 'Task',
            taskIndex: 1,
            totalTasks: 1,
            currentTaskDescription: 'Description',
            taskProgress: 0,
            completedTasks: [],
            skills: []
          }
        })
      });

      await POST(request);
      
      // Verify generation config
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7,
          candidateCount: 1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      });
    });
  });
});