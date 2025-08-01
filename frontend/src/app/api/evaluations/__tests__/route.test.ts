/**
 * Evaluations API Route Tests
 * 測試評估 API
 */

import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getVertexAI } from '@/lib/ai/vertex-ai-service';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/ai/vertex-ai-service');

// Mock console
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('/api/evaluations', () => {
  // Mock repositories
  const mockEvaluationRepo = {
    findByProgram: jest.fn(),
    findByTask: jest.fn(),
    getUserProgress: jest.fn(),
    create: jest.fn(),
  };

  const mockTaskRepo = {
    findById: jest.fn(),
    findByProgram: jest.fn(),
    update: jest.fn(),
  };

  const mockProgramRepo = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  // Mock AI model
  const mockGenerateContent = jest.fn();
  const mockModel = {
    generateContent: mockGenerateContent,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup repository factory mocks
    (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    
    // Setup AI service mock
    (getVertexAI as jest.Mock).mockReturnValue({
      preview: {
        getGenerativeModel: jest.fn(() => mockModel),
      },
    });
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('GET - Fetch Evaluations', () => {
    it('should return evaluations by userId', async () => {
      const mockProgress = {
        totalEvaluations: 10,
        averageScore: 85,
        ksaBreakdown: {
          knowledge: 88,
          skills: 82,
          attitudes: 85,
        },
      };

      mockEvaluationRepo.getUserProgress.mockResolvedValue(mockProgress);

      const request = new NextRequest('http://localhost:3000/api/evaluations?userId=user-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        evaluations: [],
        progress: mockProgress,
        ksaProgress: mockProgress,
      });
      expect(mockEvaluationRepo.getUserProgress).toHaveBeenCalledWith('user-123');
    });

    it('should return evaluations by programId', async () => {
      const mockEvaluations = [
        {
          id: 'eval-1',
          userId: 'user-123',
          programId: 'prog-456',
          score: 90,
          evaluationType: 'formative',
        },
        {
          id: 'eval-2',
          userId: 'user-123',
          programId: 'prog-456',
          score: 85,
          evaluationType: 'summative',
        },
      ];

      mockEvaluationRepo.findByProgram.mockResolvedValue(mockEvaluations);

      const request = new NextRequest('http://localhost:3000/api/evaluations?programId=prog-456');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockEvaluations);
      expect(mockEvaluationRepo.findByProgram).toHaveBeenCalledWith('prog-456');
    });

    it('should return evaluations by taskId', async () => {
      const mockEvaluations = [{
        id: 'eval-1',
        taskId: 'task-789',
        score: 88,
      }];

      mockEvaluationRepo.findByTask.mockResolvedValue(mockEvaluations);

      const request = new NextRequest('http://localhost:3000/api/evaluations?taskId=task-789');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockEvaluations);
      expect(mockEvaluationRepo.findByTask).toHaveBeenCalledWith('task-789');
    });

    it('should return 400 when no query parameters provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/evaluations');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'userId, programId, or taskId is required' });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockEvaluationRepo.findByProgram.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/evaluations?programId=prog-456');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal server error' });
      expect(mockConsoleError).toHaveBeenCalledWith('Error fetching evaluations:', error);
    });
  });

  describe('POST - Create Evaluation', () => {
    const mockAIResponse = {
      score: 92,
      feedback: 'Excellent work! Your understanding of AI concepts is strong.',
      ksaScores: {
        knowledge: 95,
        skills: 90,
        attitudes: 90,
      },
      strengths: ['Clear understanding', 'Good examples'],
      improvements: ['Could elaborate more on ethical considerations'],
    };

    beforeEach(() => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockAIResponse),
              }],
            },
          }],
        },
      });
    });

    it('should create evaluation with AI analysis', async () => {
      const mockTask = {
        id: 'task-123',
        programId: 'prog-456',
        taskIndex: 0,
        status: 'active',
      };

      const mockProgram = {
        id: 'prog-456',
        totalTaskCount: 3,
        completedTaskCount: 0,
      };

      const mockCreatedEvaluation = {
        id: 'eval-new',
        userId: 'user-123',
        taskId: 'task-123',
        score: 92,
        feedbackText: mockAIResponse.feedback,
      };

      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue([mockTask]);
      mockEvaluationRepo.create.mockResolvedValue(mockCreatedEvaluation);

      const requestData = {
        userId: 'user-123',
        programId: 'prog-456',
        taskId: 'task-123',
        evaluationType: 'formative',
        context: { topic: 'AI Ethics' },
        userResponse: { answer: 'AI should be transparent and fair' },
        rubric: { criteria: ['understanding', 'application'] },
      };

      const request = new NextRequest('http://localhost:3000/api/evaluations', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockCreatedEvaluation);
      
      // Verify AI was called
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('AI literacy learning task')
      );
      
      // Verify evaluation was created with AI results
      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          score: 92,
          feedbackText: mockAIResponse.feedback,
          aiAnalysis: expect.objectContaining({
            strengths: mockAIResponse.strengths,
            improvements: mockAIResponse.improvements,
          }),
        })
      );
      
      // Verify task was updated
      expect(mockTaskRepo.update).toHaveBeenCalledWith('task-123', {
        status: 'completed',
        score: 92,
        completedAt: expect.any(String),
      });
    });

    it('should update program progress when task is completed', async () => {
      const mockTasks = [
        { id: 'task-1', status: 'completed', score: 90 },
        { id: 'task-2', status: 'completed', score: 85 },
        { id: 'task-3', status: 'active', score: 0 },
      ];

      const mockProgram = {
        id: 'prog-456',
        totalTaskCount: 3,
        completedTaskCount: 1,
      };

      mockTaskRepo.findById.mockResolvedValue(mockTasks[2]);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-new' });

      const request = new NextRequest('http://localhost:3000/api/evaluations', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          taskId: 'task-3',
          evaluationType: 'summative',
          context: {},
          userResponse: {},
          rubric: {},
        }),
      });

      await POST(request);

      // Verify program was updated with new progress
      expect(mockProgramRepo.update).toHaveBeenCalledWith('prog-456', {
        completedTaskCount: 2,
        totalScore: expect.any(Number),
        currentTaskIndex: expect.any(Number),
      });
    });

    it('should mark program as completed when all tasks done', async () => {
      const mockTasks = [
        { id: 'task-1', status: 'completed', score: 90 },
        { id: 'task-2', status: 'completed', score: 85 },
        { id: 'task-3', status: 'completed', score: 92 },
      ];

      const mockProgram = {
        id: 'prog-456',
        totalTaskCount: 3,
        completedTaskCount: 2,
      };

      mockTaskRepo.findById.mockResolvedValue(mockTasks[2]);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-new' });

      const request = new NextRequest('http://localhost:3000/api/evaluations', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          taskId: 'task-3',
          evaluationType: 'summative',
          context: {},
          userResponse: {},
          rubric: {},
        }),
      });

      await POST(request);

      // Verify program was marked as completed
      expect(mockProgramRepo.update).toHaveBeenCalledWith('prog-456', 
        expect.objectContaining({ status: 'completed' })
      );
    });

    it('should handle missing required fields', async () => {
      const testCases = [
        { evaluationType: 'formative' }, // Missing userId
        { userId: 'user-123' }, // Missing evaluationType
      ];

      for (const requestData of testCases) {
        const request = new NextRequest('http://localhost:3000/api/evaluations', {
          method: 'POST',
          body: JSON.stringify(requestData),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: 'userId and evaluationType are required' });
      }
    });

    it('should handle task not found error', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/evaluations', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          taskId: 'non-existent',
          evaluationType: 'formative',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Task not found' });
    });

    it('should handle AI generation errors', async () => {
      const error = new Error('AI service unavailable');
      mockGenerateContent.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/evaluations', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          evaluationType: 'formative',
          context: {},
          userResponse: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal server error' });
      expect(mockConsoleError).toHaveBeenCalledWith('Error creating evaluation:', error);
    });

    it('should handle malformed AI response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: 'Invalid JSON',
              }],
            },
          }],
        },
      });

      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval-new' });

      const request = new NextRequest('http://localhost:3000/api/evaluations', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          evaluationType: 'formative',
          context: {},
          userResponse: {},
        }),
      });

      const response = await POST(request);

      // Should still create evaluation with default values
      expect(response.status).toBe(201);
      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 0, // Default score
          feedbackText: undefined,
        })
      );
    });
  });
});

/**
 * Evaluations API Considerations:
 * 
 * 1. AI Integration:
 *    - Uses Vertex AI for evaluation
 *    - Handles AI service failures gracefully
 *    - Parses AI responses safely
 * 
 * 2. Progress Tracking:
 *    - Updates task completion status
 *    - Calculates program progress
 *    - Marks programs as completed
 * 
 * 3. Data Structure:
 *    - Supports multiple evaluation types
 *    - Tracks KSA (Knowledge, Skills, Attitudes)
 *    - Stores AI analysis details
 * 
 * 4. Query Options:
 *    - By user ID
 *    - By program ID
 *    - By task ID
 * 
 * 5. Future Enhancements:
 *    - AI usage tracking
 *    - Cost estimation
 *    - Batch evaluations
 */