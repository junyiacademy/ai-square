import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';
import { VertexAIService } from '@/lib/ai/vertex-ai-service';
import { TranslationService } from '@/lib/services/translation-service';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/session');
jest.mock('@/lib/ai/vertex-ai-service');
jest.mock('@/lib/services/translation-service');

const mockGetServerSession = getServerSession as jest.Mock;
const mockGetProgramRepository = jest.fn();
const mockGetTaskRepository = jest.fn();
const mockGetEvaluationRepository = jest.fn();
const mockGetScenarioRepository = jest.fn();

const mockProgramRepo = {
  findById: jest.fn(),
  update: jest.fn(),
};

const mockTaskRepo = {
  findByProgram: jest.fn(),
};

const mockEvaluationRepo = {
  findByProgram: jest.fn(),
  create: jest.fn(),
};

const mockScenarioRepo = {
  findById: jest.fn(),
};

const mockVertexAIService = {
  sendMessage: jest.fn(),
};

const mockTranslationService = {
  translateFeedback: jest.fn(),
};

(repositoryFactory.getProgramRepository as jest.Mock) = mockGetProgramRepository;
(repositoryFactory.getTaskRepository as jest.Mock) = mockGetTaskRepository;
(repositoryFactory.getEvaluationRepository as jest.Mock) = mockGetEvaluationRepository;
(repositoryFactory.getScenarioRepository as jest.Mock) = mockGetScenarioRepository;
(VertexAIService as unknown as jest.Mock).mockImplementation(() => mockVertexAIService);
(TranslationService as unknown as jest.Mock).mockImplementation(() => mockTranslationService);

describe('/api/discovery/programs/[programId]/regenerate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProgramRepository.mockReturnValue(mockProgramRepo);
    mockGetTaskRepository.mockReturnValue(mockTaskRepo);
    mockGetEvaluationRepository.mockReturnValue(mockEvaluationRepo);
    mockGetScenarioRepository.mockReturnValue(mockScenarioRepo);
  });

  describe('POST', () => {
    const mockSession = {
      user: {
        id: 'user123',
        email: 'test@example.com'
      }
    };

    const mockProgram = {
      id: 'program123',
      userId: 'user123',
      scenarioId: 'scenario123',
      status: 'completed',
      createdAt: '2024-01-01T00:00:00Z',
      metadata: {}
    };

    const mockScenario = {
      id: 'scenario123',
      title: { en: 'Software Engineer Discovery' },
      metadata: { careerType: 'software_engineer' }
    };

    const mockCompletedTasks = [
      {
        id: 'task1',
        programId: 'program123',
        title: { en: 'Problem Solving Task' },
        type: 'question',
        status: 'completed',
        completedAt: '2024-01-02T00:00:00Z',
        evaluation: {
          score: 85,
          feedback: 'Good work',
          metadata: { skillsImproved: ['problem-solving', 'critical-thinking'] }
        },
        interactions: [
          { type: 'user_input', context: { timeSpent: 300 } },
          { type: 'user_input', context: { timeSpent: 200 } }
        ]
      },
      {
        id: 'task2',
        programId: 'program123',
        title: { en: 'Communication Task' },
        type: 'chat',
        status: 'completed',
        completedAt: '2024-01-03T00:00:00Z',
        evaluation: {
          score: 90,
          feedback: 'Excellent communication',
          metadata: { skillsImproved: ['communication', 'teamwork'] }
        },
        interactions: [
          { type: 'user_input', context: { timeSpent: 400 } }
        ]
      }
    ];

    const mockAIFeedback = {
      overallAssessment: 'The learner demonstrated strong problem-solving skills',
      careerAlignment: 'Shows great potential for software engineering',
      strengths: ['Analytical thinking', 'Communication skills'],
      growthAreas: ['Technical depth', 'System design'],
      nextSteps: ['Study algorithms', 'Build projects']
    };

    it('successfully regenerates evaluation for completed program', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockCompletedTasks);
      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);
      mockEvaluationRepo.findByProgram.mockResolvedValue([]);
      mockVertexAIService.sendMessage.mockResolvedValue({
        content: `Here is the assessment:\n${JSON.stringify(mockAIFeedback, null, 2)}`
      });
      mockEvaluationRepo.create.mockResolvedValue({
        id: 'eval123',
        programId: 'program123',
        evaluationType: 'discovery_complete'
      });

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/regenerate', {
        method: 'POST',
        headers: { 'accept-language': 'en' }
      });

      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: 'Evaluation created successfully',
        evaluationId: 'eval123',
        metrics: {
          totalXP: 175, // 85 + 90
          avgScore: 88, // (85 + 90) / 2 rounded
          daysUsed: 2,
          completedTasks: 2
        }
      });

      expect(mockVertexAIService.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Discovery learning journey')
      );
      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          programId: 'program123',
          mode: 'discovery',
          evaluationType: 'program',
          evaluationSubtype: 'discovery_complete',
          score: 88,
          discoveryData: {
            careerType: 'software_engineer',
            totalXP: 175,
            totalTasks: 2,
            completedTasks: 2,
            daysUsed: 2
          }
        })
      );
    });

    it('updates existing evaluation instead of creating new one', async () => {
      const existingEvaluation = {
        id: 'existing-eval',
        programId: 'program123',
        evaluationType: 'discovery_complete'
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockCompletedTasks);
      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);
      mockEvaluationRepo.findByProgram.mockResolvedValue([existingEvaluation]);
      mockVertexAIService.sendMessage.mockResolvedValue({
        content: JSON.stringify(mockAIFeedback)
      });

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/regenerate', {
        method: 'POST'
      });

      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Evaluation regenerated successfully');
      expect(data.evaluationId).toBe('existing-eval');
      expect(mockEvaluationRepo.create).not.toHaveBeenCalled();
      expect(mockProgramRepo.update).toHaveBeenCalled();
    });

    it('handles non-English feedback generation', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockCompletedTasks);
      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);
      mockEvaluationRepo.findByProgram.mockResolvedValue([]);
      
      const chineseFeedback = {
        overallAssessment: '學習者展現了優秀的問題解決能力',
        careerAlignment: '非常適合軟體工程師職涯',
        strengths: ['分析思維', '溝通技巧'],
        growthAreas: ['技術深度', '系統設計'],
        nextSteps: ['學習演算法', '建立專案']
      };
      
      mockVertexAIService.sendMessage.mockResolvedValue({
        content: JSON.stringify(chineseFeedback)
      });
      
      mockTranslationService.translateFeedback
        .mockResolvedValueOnce('The learner demonstrated excellent problem-solving skills')
        .mockResolvedValueOnce('Very suitable for software engineering career')
        .mockResolvedValueOnce('Analytical thinking')
        .mockResolvedValueOnce('Communication skills')
        .mockResolvedValueOnce('Technical depth')
        .mockResolvedValueOnce('System design')
        .mockResolvedValueOnce('Study algorithms')
        .mockResolvedValueOnce('Build projects');

      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval123' });

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/regenerate', {
        method: 'POST',
        headers: { 'accept-language': 'zhTW' }
      });

      await POST(request, { params: Promise.resolve({'programId':'test-id'}) });

      expect(mockVertexAIService.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Traditional Chinese (繁體中文)')
      );
      expect(mockTranslationService.translateFeedback).toHaveBeenCalledTimes(8);
    });

    it('returns 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/regenerate', {
        method: 'POST'
      });

      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('returns 404 when program not found', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockProgramRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/regenerate', {
        method: 'POST'
      });

      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Program not found or access denied' });
    });

    it('returns 404 when user does not own program', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockProgramRepo.findById.mockResolvedValue({
        ...mockProgram,
        userId: 'other-user'
      });

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/regenerate', {
        method: 'POST'
      });

      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Program not found or access denied' });
    });

    it('handles programs with no completed tasks', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue([
        { id: 'task1', status: 'pending' },
        { id: 'task2', status: 'in_progress' }
      ]);
      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);
      mockEvaluationRepo.findByProgram.mockResolvedValue([]);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval123' });

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/regenerate', {
        method: 'POST'
      });

      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics).toEqual({
        totalXP: 0,
        avgScore: 0,
        daysUsed: 0,
        completedTasks: 0
      });
    });

    it('handles AI feedback generation errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockCompletedTasks);
      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);
      mockEvaluationRepo.findByProgram.mockResolvedValue([]);
      mockVertexAIService.sendMessage.mockRejectedValue(new Error('AI service unavailable'));
      mockEvaluationRepo.create.mockResolvedValue({ id: 'eval123' });

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/regenerate', {
        method: 'POST'
      });

      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          feedbackText: '{}', // Empty feedback when AI fails
        })
      );
    });

    it('handles general errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockProgramRepo.findById.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/program123/regenerate', {
        method: 'POST'
      });

      const response = await POST(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to regenerate evaluation' });
    });
  });
});
