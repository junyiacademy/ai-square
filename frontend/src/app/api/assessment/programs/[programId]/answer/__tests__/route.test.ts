/**
 * Assessment Answer API Route Tests
 * 測試評估答案提交 API
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/session');

// Mock console
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('/api/assessment/programs/[programId]/answer', () => {
  // Mock repositories
  const mockProgramRepo = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockTaskRepo = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockEvaluationRepo = {
    create: jest.fn(),
    findByTask: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup repository factory mocks
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
    (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);
    (getServerSession as jest.Mock).mockResolvedValue(null);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
  });

  describe('POST - Submit Assessment Answer', () => {
    const mockProgram = {
      id: 'prog-123',
      mode: 'assessment',
      userId: 'user-789',
      status: 'active',
      completedTaskCount: 5,
      totalTaskCount: 10,
      assessmentData: {
        answeredQuestions: 5,
        correctAnswers: 3,
      },
    };

    const mockTask = {
      id: 'task-456',
      programId: 'prog-123',
      type: 'question',
      status: 'active',
      content: {
        question: 'What is AI?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'B',
      },
    };

    it('should submit correct answer successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockTaskRepo.update?.mockResolvedValue({
        ...mockTask,
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      mockEvaluationRepo.create.mockResolvedValue({
        id: 'eval-1',
        taskId: 'task-456',
        evaluationType: 'summative',
        score: 100,
        feedback: { en: 'Correct!' },
      });
      mockProgramRepo.update?.mockResolvedValue({
        ...mockProgram,
        completedTaskCount: 6,
        assessmentData: {
          answeredQuestions: 6,
          correctAnswers: 4,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/prog-123/answer', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-456',
          answer: 'B',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        correct: true,
        score: 100,
        feedback: 'Correct!',
        progress: {
          completedTasks: 6,
          totalTasks: 10,
          percentage: 60,
        },
      });

      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        'task-456',
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(String),
        })
      );

      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'assessment',
          programId: 'prog-123',
          taskId: 'task-456',
          userId: 'user-789',
          evaluationType: 'summative',
          score: 100,
        })
      );
    });

    it('should handle incorrect answer', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockTaskRepo.update?.mockResolvedValue({
        ...mockTask,
        status: 'completed',
      });
      mockEvaluationRepo.create.mockResolvedValue({
        id: 'eval-2',
        score: 0,
        feedback: { en: 'Incorrect. The correct answer was B.' },
      });

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/prog-123/answer', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-456',
          answer: 'A', // Wrong answer
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.correct).toBe(false);
      expect(data.data.score).toBe(0);
      expect(data.data.correctAnswer).toBe('B');
    });

    it('should complete assessment when all questions answered', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      const almostCompleteProgram = {
        ...mockProgram,
        completedTaskCount: 9,
        totalTaskCount: 10,
      };

      mockProgramRepo.findById.mockResolvedValue(almostCompleteProgram);
      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockTaskRepo.update?.mockResolvedValue({ ...mockTask, status: 'completed' });
      mockEvaluationRepo.create.mockResolvedValue({ score: 100 });
      mockProgramRepo.update?.mockResolvedValue({
        ...almostCompleteProgram,
        completedTaskCount: 10,
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/prog-123/answer', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-456',
          answer: 'B',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.assessmentComplete).toBe(true);
      expect(data.data.progress.percentage).toBe(100);
      expect(mockProgramRepo.update).toHaveBeenCalledWith(
        'prog-123',
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(String),
        })
      );
    });

    it('should return 400 when required fields missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/prog-123/answer', {
        method: 'POST',
        body: JSON.stringify({
          // Missing taskId and answer
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Task ID and answer are required');
    });

    it('should return 404 when program not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/prog-123/answer', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-456',
          answer: 'A',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Program not found');
    });

    it('should return 403 when user is not program owner', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'other-user', email: 'other@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/prog-123/answer', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-456',
          answer: 'A',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should handle task already completed', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: 'completed', // Already completed
      });

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/prog-123/answer', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-456',
          answer: 'B',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Task already completed');
    });

    it('should handle partial scoring for multi-part questions', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      const multiPartTask = {
        ...mockTask,
        content: {
          question: 'Select all that apply',
          options: ['A', 'B', 'C', 'D'],
          correctAnswers: ['B', 'C'], // Multiple correct answers
          type: 'multiple-choice',
        },
      };

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findById.mockResolvedValue(multiPartTask);
      mockEvaluationRepo.create.mockResolvedValue({
        score: 50, // Partial score
        feedback: { en: 'Partially correct. You got 1 out of 2.' },
      });

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/prog-123/answer', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-456',
          answer: ['B'], // Only one of the correct answers
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.score).toBe(50);
      expect(data.data.feedback).toContain('Partially correct');
    });

    it('should return 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/programs/prog-123/answer', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-456',
          answer: 'A',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});

/**
 * Assessment Answer API Considerations:
 * 
 * 1. Answer Validation:
 *    - Single choice questions
 *    - Multiple choice questions
 *    - Partial scoring support
 * 
 * 2. Progress Tracking:
 *    - Update task completion
 *    - Track correct/incorrect answers
 *    - Calculate assessment progress
 * 
 * 3. Completion Handling:
 *    - Auto-complete assessment when all questions answered
 *    - Calculate final score
 *    - Generate completion certificate
 * 
 * 4. Security:
 *    - Verify user owns the program
 *    - Prevent re-answering completed questions
 *    - Validate answer format
 * 
 * 5. Feedback:
 *    - Immediate feedback on answers
 *    - Show correct answer for wrong responses
 *    - Progress percentage updates
 */