/**
 * Assessment Results API Route Tests
 * 測試評估結果 API
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/session');

// Mock console
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('/api/assessment/results/[id]', () => {
  // Mock repositories
  const mockProgramRepo = {
    findById: jest.fn(),
  };

  const mockEvaluationRepo = {
    findByProgram: jest.fn(),
  };

  const mockScenarioRepo = {
    findById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup repository factory mocks
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
    (getServerSession as jest.Mock).mockResolvedValue(null);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
  });

  describe('GET - Get Assessment Results', () => {
    const mockProgram = {
      id: 'prog-123',
      mode: 'assessment',
      scenarioId: 'scenario-456',
      userId: 'user-789',
      status: 'completed',
      totalScore: 85,
      completedTaskCount: 20,
      totalTaskCount: 20,
      startedAt: '2025-01-01T10:00:00Z',
      completedAt: '2025-01-01T10:30:00Z',
      assessmentData: {
        timeSpent: 1800, // 30 minutes
        answeredQuestions: 20,
        correctAnswers: 17,
      },
    };

    const mockEvaluations = [
      {
        id: 'eval-1',
        programId: 'prog-123',
        evaluationType: 'summative',
        score: 90,
        feedback: { en: 'Excellent understanding of AI concepts' },
        criteria: {
          domain: 'engaging_with_ai',
          competency: 'understanding_ai_basics',
        },
      },
      {
        id: 'eval-2',
        programId: 'prog-123',
        evaluationType: 'summative',
        score: 80,
        feedback: { en: 'Good progress in AI creation' },
        criteria: {
          domain: 'creating_with_ai',
          competency: 'prompting_techniques',
        },
      },
      {
        id: 'eval-3',
        programId: 'prog-123',
        evaluationType: 'summative',
        score: 85,
        feedback: { en: 'Strong AI management skills' },
        criteria: {
          domain: 'managing_ai',
          competency: 'ai_ethics',
        },
      },
      {
        id: 'eval-4',
        programId: 'prog-123',
        evaluationType: 'summative',
        score: 70,
        feedback: { en: 'Developing understanding of AI design' },
        criteria: {
          domain: 'designing_ai',
          competency: 'system_design',
        },
      },
    ];

    const mockScenario = {
      id: 'scenario-456',
      title: { en: 'AI Literacy Assessment', zh: 'AI 素養評估' },
      description: { en: 'Comprehensive AI knowledge test' },
      assessmentData: {
        domains: ['engaging_with_ai', 'creating_with_ai', 'managing_ai', 'designing_ai'],
        passingScore: 60,
      },
    };

    it('should return detailed assessment results for authorized user', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockEvaluationRepo.findByProgram.mockResolvedValue(mockEvaluations);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        overallScore: 85,
        passed: true,
        timeSpent: 1800,
        completedAt: '2025-01-01T10:30:00Z',
        domainScores: {
          engaging_with_ai: 90,
          creating_with_ai: 80,
          managing_ai: 85,
          designing_ai: 70,
        },
        scenarioInfo: {
          title: 'AI Literacy Assessment',
          description: 'Comprehensive AI knowledge test',
        },
        statistics: {
          totalQuestions: 20,
          answeredQuestions: 20,
          correctAnswers: 17,
          accuracy: 85,
        },
      });
    });

    it('should support language parameter', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockEvaluationRepo.findByProgram.mockResolvedValue(mockEvaluations);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123?lang=zh');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarioInfo.title).toBe('AI 素養評估');
    });

    it('should return 404 when program not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/non-existent');
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Assessment not found');
    });

    it('should return 403 when user is not program owner', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'other-user', email: 'other@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 400 when program is not completed', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue({
        ...mockProgram,
        status: 'active',
        completedAt: null,
      });

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Assessment not completed');
    });

    it('should handle programs with no evaluations', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockEvaluationRepo.findByProgram.mockResolvedValue([]);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.domainScores).toEqual({
        engaging_with_ai: 0,
        creating_with_ai: 0,
        managing_ai: 0,
        designing_ai: 0,
      });
    });

    it('should calculate weak areas correctly', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockEvaluationRepo.findByProgram.mockResolvedValue([
        { ...mockEvaluations[0], score: 55 }, // Below 60
        { ...mockEvaluations[1], score: 45 }, // Below 60
        mockEvaluations[2], // 85
        mockEvaluations[3], // 70
      ]);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.weakAreas).toEqual(['engaging_with_ai', 'creating_with_ai']);
      expect(data.data.recommendations).toContain('engaging_with_ai');
      expect(data.data.recommendations).toContain('creating_with_ai');
    });

    it('should handle missing repository methods gracefully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      (mockEvaluationRepo as Partial<typeof mockEvaluationRepo>).findByProgram = undefined; // Missing method
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.domainScores).toEqual({});
      expect(data.data.weakAreas).toEqual([]);
    });

    it('should handle repository errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      const error = new Error('Database error');
      mockProgramRepo.findById.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch assessment results');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error fetching assessment results:',
        error
      );
    });

    it('should return 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/assessment/results/prog-123');
      const response = await GET(request, { params: Promise.resolve({ id: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});

/**
 * Assessment Results API Considerations:
 * 
 * 1. Authorization:
 *    - Must verify user owns the assessment
 *    - Returns 403 for unauthorized access
 * 
 * 2. Completion Status:
 *    - Only returns results for completed assessments
 *    - Returns 400 for incomplete assessments
 * 
 * 3. Domain Score Calculation:
 *    - Averages scores by domain
 *    - Identifies weak areas (< 60%)
 *    - Provides recommendations
 * 
 * 4. Statistics:
 *    - Question accuracy
 *    - Time spent
 *    - Pass/fail status
 * 
 * 5. Multi-language Support:
 *    - Returns content in requested language
 *    - Falls back to English
 */