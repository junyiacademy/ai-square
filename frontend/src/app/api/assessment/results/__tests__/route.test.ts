/**
 * Assessment Results API Tests
 * Following TDD principles from @CLAUDE.md
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// Mock the repository factory
jest.mock('@/lib/repositories/base/repository-factory');

const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

describe('/api/assessment/results', () => {
  let mockUserRepo: any;
  let mockProgramRepo: any;
  let mockEvaluationRepo: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock repositories
    mockUserRepo = {
      findByEmail: jest.fn(),
      update: jest.fn(),
    };

    mockProgramRepo = {
      findByUser: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    mockEvaluationRepo = {
      create: jest.fn(),
    };

    mockRepositoryFactory.getUserRepository.mockReturnValue(mockUserRepo);
    mockRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo);
    mockRepositoryFactory.getEvaluationRepository.mockReturnValue(mockEvaluationRepo);
  });

  describe('POST /api/assessment/results', () => {
    const validRequestBody = {
      userId: 'test-user-id',
      userEmail: 'test@example.com',
      scenarioId: 'test-scenario',
      language: 'en',
      answers: [
        {
          question_id: 'q1',
          selected: 'a',
          correct: 'a',
          time_spent: 30,
          ksa_mapping: { K1: 'knowledge_item' }
        }
      ],
      result: {
        overallScore: 85,
        totalQuestions: 10,
        correctAnswers: 8,
        level: 'Proficient',
        domainScores: {
          engaging_with_ai: 80,
          creating_with_ai: 75,
          managing_with_ai: 90,
          designing_with_ai: 85
        }
      }
    };

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'test-user'
          // Missing answers and result
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 404 when user not found', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should create new assessment program when none exists', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', totalXp: 100 };
      const mockProgram = { id: 'program-123', userId: 'user-123', status: 'active' };
      const mockEvaluation = { id: 'eval-123', score: 85 };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findByUser.mockResolvedValue([]); // No existing programs
      mockProgramRepo.create.mockResolvedValue(mockProgram);
      mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockProgramRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          scenarioId: 'test-scenario',
          mode: 'assessment',
          status: 'active',
          totalTaskCount: 10,
          metadata: expect.objectContaining({
            language: 'en'
          })
        })
      );
    });

    it('should use existing assessment program when available', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', totalXp: 100 };
      const existingProgram = { 
        id: 'program-123', 
        userId: 'user-123', 
        scenarioId: 'test-scenario',
        status: 'active',
        metadata: {}
      };
      const mockEvaluation = { id: 'eval-123', score: 85 };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findByUser.mockResolvedValue([existingProgram]);
      mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.assessmentId).toBeDefined();
      expect(data.programId).toBeDefined();
      expect(data.message).toBe('Assessment result saved successfully');
      expect(data.xpEarned).toBeDefined();
      expect(mockProgramRepo.create).not.toHaveBeenCalled(); // Should not create new program
    });

    it('should create evaluation with correct domain scores', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', totalXp: 100 };
      const mockProgram = { id: 'program-123', userId: 'user-123', status: 'active' };
      const mockEvaluation = { id: 'eval-123', score: 85 };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findByUser.mockResolvedValue([]);
      mockProgramRepo.create.mockResolvedValue(mockProgram);
      mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      });

      const response = await POST(request);

      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          programId: 'program-123',
          mode: 'assessment',
          evaluationType: 'assessment_complete',
          score: 85,
          maxScore: 100,
          domainScores: validRequestBody.result.domainScores,
          feedbackText: 'Assessment completed. Level: Proficient',
          aiAnalysis: expect.objectContaining({
            insights: expect.arrayContaining([
              expect.stringContaining('Proficient level with 8/10 correct answers')
            ]),
            strengths: expect.arrayContaining([
              expect.stringContaining('Strong performance in managing_with_ai')
            ])
          })
        })
      );
    });

    it('should handle repository errors gracefully', async () => {
      mockUserRepo.findByEmail.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to save assessment result');
    });

    it('should validate answer structure and store detailed data', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', totalXp: 100 };
      const mockProgram = { id: 'program-123', userId: 'user-123', status: 'active' };
      const mockEvaluation = { id: 'eval-123', score: 85 };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findByUser.mockResolvedValue([]);
      mockProgramRepo.create.mockResolvedValue(mockProgram);
      mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);

      const requestWithDetailedAnswers = {
        ...validRequestBody,
        answers: [
          {
            question_id: 'q1',
            selected: 'a',
            correct: 'a',
            time_spent: 30,
            ksa_mapping: { K1: 'knowledge_item', S2: 'skill_item' }
          },
          {
            question_id: 'q2',
            selected: 'b',
            correct: 'c',
            time_spent: 45,
            ksa_mapping: { A1: 'attitude_item' }
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify(requestWithDetailedAnswers),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.assessmentId).toBeDefined();
      expect(data.programId).toBeDefined();
      expect(data.message).toBe('Assessment result saved successfully');
      expect(data.xpEarned).toBeDefined();
    });

    it('should use default values when optional fields are missing', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', totalXp: 100 };
      const mockProgram = { id: 'program-123', userId: 'user-123', status: 'active' };
      const mockEvaluation = { id: 'eval-123', score: 85 };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findByUser.mockResolvedValue([]);
      mockProgramRepo.create.mockResolvedValue(mockProgram);
      mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);

      const minimalRequest = {
        userId: 'test-user-id',
        answers: [{ question_id: 'q1', selected: 'a', correct: 'a', time_spent: 30 }],
        result: { overallScore: 75, totalQuestions: 1, correctAnswers: 1, level: 'Basic' }
      };

      const request = new NextRequest('http://localhost:3000/api/assessment/results', {
        method: 'POST',
        body: JSON.stringify(minimalRequest),
      });

      const response = await POST(request);

      expect(mockProgramRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scenarioId: 'assessment-default', // Default scenario
          metadata: expect.objectContaining({
            language: 'en' // Default language
          })
        })
      );
    });
  });
}); 