// Mock dependencies first before imports
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/auth-utils');
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => ({
    url,
    method: init?.method || 'GET',
    headers: new Headers(init?.headers || {}),
    json: jest.fn().mockImplementation(async () => {
      if (init?.body) {
        try {
          return JSON.parse(init.body);
        } catch {
          throw new SyntaxError('Unexpected end of JSON input');
        }
      }
      return {};
    })
  })),
  NextResponse: {
    json: jest.fn((body, init) => ({
      json: async () => body,
      status: init?.status || 200
    }))
  }
}));

import { POST } from '../complete/route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getAuthFromRequest } from '@/lib/auth/auth-utils';
import { NextRequest } from 'next/server';

const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;
const mockGetAuthFromRequest = getAuthFromRequest as jest.MockedFunction<typeof getAuthFromRequest>;

describe('POST /api/assessment/programs/[programId]/complete', () => {
  const mockUser = { email: 'test@example.com', id: 'user123' };
  const mockProgramId = 'program123';
  const mockEvaluationId = 'eval123';
  
  const mockProgram = {
    id: mockProgramId,
    userId: mockUser.email,
    status: 'active',
    taskIds: ['task1', 'task2'],
    metadata: {}
  };

  const mockTasks = [
    {
      id: 'task1',
      title: 'Task 1',
      status: 'completed',
      content: {
        context: {
          questions: [
            {
              id: 'Q1',
              domain: 'engaging_with_ai',
              question: 'Test question 1',
              options: { a: 'Option A', b: 'Option B', c: 'Option C', d: 'Option D' },
              correct_answer: 'a',
              ksa_mapping: { knowledge: ['K1.1'], skills: ['S1.1'], attitudes: ['A1.1'] }
            }
          ]
        }
      },
      interactions: [
        {
          type: 'assessment_answer',
          content: {
            questionId: 'Q1',
            selectedAnswer: 'a',
            timeSpent: 30,
            isCorrect: true
          }
        }
      ]
    },
    {
      id: 'task2',
      title: 'Task 2',
      status: 'completed',
      content: {
        context: {
          questions: [
            {
              id: 'Q2',
              domain: 'creating_with_ai',
              question: 'Test question 2',
              options: { a: 'Option A', b: 'Option B', c: 'Option C', d: 'Option D' },
              correct_answer: 'b',
              ksa_mapping: { knowledge: ['K2.1'], skills: ['S2.1'], attitudes: ['A2.1'] }
            }
          ]
        }
      },
      interactions: [
        {
          type: 'assessment_answer',
          content: {
            questionId: 'Q2',
            selectedAnswer: 'c',
            timeSpent: 45,
            isCorrect: false
          }
        }
      ]
    }
  ];

  const mockExistingEvaluation = {
    id: mockEvaluationId,
    targetType: 'program',
    targetId: mockProgramId,
    evaluationType: 'assessment_complete',
    score: 75,
    createdAt: new Date().toISOString()
  };

  let mockProgramRepo: any;
  let mockTaskRepo: any;
  let mockEvaluationRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockProgramRepo = {
      findById: jest.fn(),
      update: jest.fn(),
      complete: jest.fn()
    };
    
    mockTaskRepo = {
      findById: jest.fn(),
      complete: jest.fn()
    };
    
    mockEvaluationRepo = {
      findById: jest.fn(),
      findByTarget: jest.fn(),
      create: jest.fn()
    };
    
    mockRepositoryFactory.getProgramRepository = jest.fn().mockReturnValue(mockProgramRepo);
    mockRepositoryFactory.getTaskRepository = jest.fn().mockReturnValue(mockTaskRepo);
    mockRepositoryFactory.getEvaluationRepository = jest.fn().mockReturnValue(mockEvaluationRepo);
    mockGetAuthFromRequest.mockResolvedValue({ 
      userId: 1, 
      email: mockUser.email, 
      role: 'user',
      name: 'Test User'
    });
  });

  const createRequest = (body: unknown = {}) => {
    const MockedNextRequest = NextRequest as jest.MockedClass<typeof NextRequest>;
    return new MockedNextRequest('http://localhost:3000/api/assessment/programs/program123/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    }) as any;
  };

  it('should prevent duplicate evaluation creation', async () => {
    // Setup: Program already completed with evaluation
    mockProgramRepo.findById.mockResolvedValue({
      ...mockProgram,
      status: 'completed',
      metadata: { evaluationId: mockEvaluationId, score: 75 }
    });
    mockEvaluationRepo.findById.mockResolvedValue(mockExistingEvaluation);

    const request = createRequest();
    const response = await POST(request, { params: Promise.resolve({ programId: mockProgramId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alreadyCompleted).toBe(true);
    expect(data.evaluationId).toBe(mockEvaluationId);
    expect(data.score).toBe(75);
    
    // Should not create new evaluation
    expect(mockEvaluationRepo.create).not.toHaveBeenCalled();
  });

  it('should detect existing evaluation even if program not marked complete', async () => {
    // Setup: Program not completed but evaluation exists
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockEvaluationRepo.findByTarget.mockResolvedValue([mockExistingEvaluation]);

    const request = createRequest();
    const response = await POST(request, { params: Promise.resolve({ programId: mockProgramId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alreadyCompleted).toBe(true);
    expect(data.evaluationId).toBe(mockEvaluationId);
    
    // Should update program status
    expect(mockProgramRepo.update).toHaveBeenCalledWith(mockProgramId, {
      metadata: expect.objectContaining({
        evaluationId: mockEvaluationId,
        score: 75
      })
    });
    expect(mockProgramRepo.complete).toHaveBeenCalledWith(mockProgramId);
  });

  it('should create new evaluation when none exists', async () => {
    // Setup: No existing evaluation
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockEvaluationRepo.findByTarget.mockResolvedValue([]);
    mockTaskRepo.findById
      .mockResolvedValueOnce(mockTasks[0])
      .mockResolvedValueOnce(mockTasks[1]);
    
    const newEvaluation = {
      id: 'new-eval-123',
      score: 50,
      targetType: 'program',
      targetId: mockProgramId
    };
    mockEvaluationRepo.create.mockResolvedValue(newEvaluation);

    const request = createRequest();
    const response = await POST(request, { params: Promise.resolve({ programId: mockProgramId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.evaluationId).toBe('new-eval-123');
    expect(data.score).toBe(50);
    expect(data.alreadyCompleted).toBeUndefined();
    
    // Should create new evaluation
    expect(mockEvaluationRepo.create).toHaveBeenCalled();
  });

  it('should collect questions and answers from all tasks', async () => {
    // Setup
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockEvaluationRepo.findByTarget.mockResolvedValue([]);
    mockTaskRepo.findById
      .mockResolvedValueOnce(mockTasks[0])
      .mockResolvedValueOnce(mockTasks[1]);
    
    mockEvaluationRepo.create.mockImplementation((evalData: { metadata: { totalQuestions: number; correctAnswers: number }; score: number }) => {
      // Verify that evaluation includes data from both tasks
      expect(evalData.metadata.totalQuestions).toBe(2);
      expect(evalData.metadata.correctAnswers).toBe(1);
      expect(evalData.score).toBe(50); // 1 correct out of 2
      
      return Promise.resolve({
        id: 'new-eval-123',
        ...evalData
      });
    });

    const request = createRequest();
    await POST(request, { params: Promise.resolve({ programId: mockProgramId }) });

    expect(mockEvaluationRepo.create).toHaveBeenCalled();
  });

  it('should handle missing authentication', async () => {
    mockGetAuthFromRequest.mockResolvedValue(null);

    const request = createRequest();
    const response = await POST(request, { params: Promise.resolve({ programId: mockProgramId }) });
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Authentication required');
  });

  it('should handle program not found', async () => {
    mockProgramRepo.findById.mockResolvedValue(null);

    const request = createRequest();
    const response = await POST(request, { params: Promise.resolve({ programId: mockProgramId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Program not found or access denied');
  });

  it('should handle access denied for other user\'s program', async () => {
    mockProgramRepo.findById.mockResolvedValue({
      ...mockProgram,
      userId: 'other@example.com'
    });

    const request = createRequest();
    const response = await POST(request, { params: Promise.resolve({ programId: mockProgramId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Program not found or access denied');
  });
});