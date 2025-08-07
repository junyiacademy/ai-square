import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
/**
 * Assessment Batch Answers Route Tests
 * 提升覆蓋率從 0% 到 100%
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';
import type { ITask, IInteraction } from '@/types/unified-learning';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/session');

// Mock console
const mockConsoleError = createMockConsoleError();

describe('POST /api/assessment/programs/[programId]/batch-answers', () => {
  const mockTaskRepo = {
    findById: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn()
  };

  const mockTask: ITask = {
    id: 'task-123',
    programId: 'program-123',
    mode: 'assessment',
    taskIndex: 0,
    scenarioTaskIndex: 0,
    type: 'question',
    status: 'pending',
    title: { en: 'Assessment Task' },
    description: { en: 'Task Description' },
    content: {
      instructions: 'Answer these questions',
      questions: [
        {
          id: 'q1',
          text: 'What is AI?',
          correct_answer: 'a',
          ksa_mapping: { knowledge: ['K1', 'K2'] }
        },
        {
          id: 'q2',
          text: 'What is ML?',
          correct_answer: 'b',
          ksa_mapping: { skills: ['S1'] }
        },
        {
          id: 'q3',
          text: 'What is DL?',
          correct_answer: 'c',
          ksa_mapping: { attitudes: ['A1'] }
        }
      ]
    },
    interactions: [],
    interactionCount: 0,
    userResponse: {},
    score: 0,
    maxScore: 100,
    allowedAttempts: 3,
    attemptCount: 0,
    timeSpentSeconds: 0,
    aiConfig: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'test@example.com' }
    });
    mockTaskRepo.findById.mockResolvedValue(mockTask);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Authentication', () => {
    it('should accept authenticated session', async () => {
      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [
            { questionId: 'q1', answer: 'a', timeSpent: 10 }
          ]
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should accept userEmail query parameter when no session', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers?userEmail=test@example.com', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [
            { questionId: 'q1', answer: 'a' }
          ]
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 when no authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: []
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle session without email', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({ user: {} }); // No email

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: []
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Request Validation', () => {
    it('should return 400 when missing taskId', async () => {
      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          answers: []
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 when missing answers', async () => {
      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123'
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 when answers is not an array', async () => {
      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: 'not-an-array'
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });
  });

  describe('Task Handling', () => {
    it('should return 404 when task not found', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'invalid-task',
          answers: []
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Task not found');
    });
  });

  describe('Answer Processing', () => {
    it('should process correct answers', async () => {
      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [
            { questionId: 'q1', answer: 'a', timeSpent: 10 },
            { questionId: 'q2', answer: 'b', timeSpent: 15 },
            { questionId: 'q3', answer: 'c', timeSpent: 20 }
          ]
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.submitted).toBe(3);

      // Check that interactions were updated with correct answers
      const updateCall = mockTaskRepo.update.mock.calls[0];
      const updatedInteractions = updateCall[1].interactions as IInteraction[];
      
      expect(updatedInteractions).toHaveLength(3);
      
      // Check first interaction (converted to IInteraction format)
      const firstInteraction = updatedInteractions[0];
      expect(firstInteraction.type).toBe('system_event');
      expect(firstInteraction.content).toMatchObject({
        eventType: 'assessment_answer',
        questionId: 'q1',
        selectedAnswer: 'a',
        isCorrect: true,
        timeSpent: 10,
        ksa_mapping: { knowledge: ['K1', 'K2'] }
      });
    });

    it('should process incorrect answers', async () => {
      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [
            { questionId: 'q1', answer: 'b' }, // Wrong answer
            { questionId: 'q2', answer: 'c' }, // Wrong answer
            { questionId: 'q3', answer: 'a' }  // Wrong answer
          ]
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const updateCall = mockTaskRepo.update.mock.calls[0];
      const updatedInteractions = updateCall[1].interactions as IInteraction[];
      
      // Check all answers are marked as incorrect
      updatedInteractions.forEach((interaction, index) => {
        expect((interaction.content as Record<string, unknown>)?.isCorrect).toBe(false);
      });
    });

    it('should handle questions without correct_answer', async () => {
      const taskWithoutCorrectAnswers = {
        ...mockTask,
        content: {
          instructions: 'Answer these questions',
          questions: [
            { id: 'q1', text: 'Open ended question' } // No correct_answer
          ]
        }
      };
      mockTaskRepo.findById.mockResolvedValue(taskWithoutCorrectAnswers);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [
            { questionId: 'q1', answer: 'any answer' }
          ]
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const updateCall = mockTaskRepo.update.mock.calls[0];
      const updatedInteractions = updateCall[1].interactions as IInteraction[];
      
      // Should be marked as incorrect when no correct answer is defined
      expect((updatedInteractions[0].content as Record<string, unknown>)?.isCorrect).toBe(false);
    });

    it('should handle empty answers array', async () => {
      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: []
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.submitted).toBe(0);
    });

    it('should merge with existing interactions', async () => {
      const existingInteraction: IInteraction = {
        timestamp: '2024-01-01T00:00:00Z',
        type: 'system_event',
        content: 'Started assessment'
      };
      
      mockTaskRepo.findById.mockResolvedValue({
        ...mockTask,
        interactions: [existingInteraction]
      });

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [
            { questionId: 'q1', answer: 'a' }
          ]
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);

      const updateCall = mockTaskRepo.update.mock.calls[0];
      const updatedInteractions = updateCall[1].interactions as IInteraction[];
      
      expect(updatedInteractions).toHaveLength(2);
      expect(updatedInteractions[0]).toEqual(existingInteraction);
      expect(updatedInteractions[1].type).toBe('system_event');
    });

    it('should update task metadata', async () => {
      const existingMetadata = { startedAt: '2024-01-01T00:00:00Z' };
      mockTaskRepo.findById.mockResolvedValue({
        ...mockTask,
        metadata: existingMetadata
      });

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [{ questionId: 'q1', answer: 'a' }]
        })
      });
      
      await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });

      const updateCall = mockTaskRepo.update.mock.calls[0];
      
      expect(updateCall[1].metadata).toMatchObject({
        ...existingMetadata,
        lastAnsweredAt: expect.any(String)
      });
      expect(updateCall[1].interactionCount).toBe(1);
    });

    it('should handle answers with missing timeSpent', async () => {
      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [
            { questionId: 'q1', answer: 'a' } // No timeSpent
          ]
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      
      expect(response.status).toBe(200);

      const updateCall = mockTaskRepo.update.mock.calls[0];
      const updatedInteractions = updateCall[1].interactions as IInteraction[];
      
      // Should default to 0
      expect((updatedInteractions[0].content as Record<string, unknown>)?.timeSpent).toBe(0);
    });

    it('should convert numeric answers to strings for comparison', async () => {
      const taskWithNumericAnswer = {
        ...mockTask,
        content: {
          questions: [
            {
              id: 'q1',
              text: 'What is 2+2?',
              correct_answer: 4 // Numeric answer
            }
          ]
        }
      };
      mockTaskRepo.findById.mockResolvedValue(taskWithNumericAnswer);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [
            { questionId: 'q1', answer: '4' } // String answer
          ]
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      
      expect(response.status).toBe(200);

      const updateCall = mockTaskRepo.update.mock.calls[0];
      const updatedInteractions = updateCall[1].interactions as IInteraction[];
      
      // Should be correct even with type mismatch
      expect((updatedInteractions[0].content as Record<string, unknown>)?.isCorrect).toBe(true);
    });
  });

  describe('Task Status Update', () => {
    it('should update task status from pending to active', async () => {
      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [{ questionId: 'q1', answer: 'a' }]
        })
      });
      
      await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });

      expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith('task-123', 'active');
    });

    it('should not update task status if already active', async () => {
      mockTaskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: 'active'
      });

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [{ questionId: 'q1', answer: 'a' }]
        })
      });
      
      await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });

      expect(mockTaskRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('should not update task status if completed', async () => {
      mockTaskRepo.findById.mockResolvedValue({
        ...mockTask,
        status: 'completed'
      });

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [{ questionId: 'q1', answer: 'a' }]
        })
      });
      
      await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });

      expect(mockTaskRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle task without questions', async () => {
      mockTaskRepo.findById.mockResolvedValue({
        ...mockTask,
        content: { instructions: 'No questions' }
      });

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [{ questionId: 'q1', answer: 'a' }]
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      
      expect(response.status).toBe(200);

      const updateCall = mockTaskRepo.update.mock.calls[0];
      const updatedInteractions = updateCall[1].interactions as IInteraction[];
      
      // All should be marked as incorrect when question not found
      expect((updatedInteractions[0].content as Record<string, unknown>)?.isCorrect).toBe(false);
    });

    it('should handle task with no content', async () => {
      mockTaskRepo.findById.mockResolvedValue({
        ...mockTask,
        content: undefined
      });

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [{ questionId: 'q1', answer: 'a' }]
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      
      expect(response.status).toBe(200);
    });

    it('should handle question without ksa_mapping', async () => {
      const taskWithoutKSA = {
        ...mockTask,
        content: {
          questions: [
            {
              id: 'q1',
              text: 'Question without KSA',
              correct_answer: 'a'
            }
          ]
        }
      };
      mockTaskRepo.findById.mockResolvedValue(taskWithoutKSA);

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [{ questionId: 'q1', answer: 'a' }]
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      
      expect(response.status).toBe(200);

      const updateCall = mockTaskRepo.update.mock.calls[0];
      const updatedInteractions = updateCall[1].interactions as IInteraction[];
      
      expect((updatedInteractions[0].content as Record<string, unknown>)?.ksa_mapping).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockTaskRepo.findById.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: []
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to submit answers');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error submitting batch answers:',
        expect.any(Error)
      );
    });

    it('should handle update errors', async () => {
      mockTaskRepo.update.mockRejectedValue(new Error('Update failed'));

      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 'task-123',
          answers: [{ questionId: 'q1', answer: 'a' }]
        })
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to submit answers');
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost/api/assessment/programs/program-123/batch-answers', {
        method: 'POST',
        body: 'invalid json'
      });
      
      const response = await POST(request, { params: Promise.resolve({ programId: 'program-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to submit answers');
    });
  });
});