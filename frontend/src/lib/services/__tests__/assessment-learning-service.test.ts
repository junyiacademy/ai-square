/**
 * AssessmentLearningService Tests
 * 
 * TDD: Red → Green → Refactor
 * 測試 Assessment 學習服務的所有功能
 */

import { AssessmentLearningService } from '../assessment-learning-service';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { 
  IScenario, 
  IProgram, 
  ITask, 
  IEvaluation 
} from '@/types/unified-learning';

// Mock repositories
jest.mock('@/lib/repositories/base/repository-factory');

describe('AssessmentLearningService', () => {
  let service: AssessmentLearningService;
  let mockScenarioRepo: any;
  let mockProgramRepo: any;
  let mockTaskRepo: any;
  let mockEvaluationRepo: any;

  beforeEach(() => {
    // Setup mocks
    mockScenarioRepo = {
      findById: jest.fn(),
      findByMode: jest.fn(),
    };
    
    mockProgramRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUser: jest.fn(),
      updateProgress: jest.fn(),
      complete: jest.fn(),
    };
    
    mockTaskRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByProgram: jest.fn(),
      updateInteractions: jest.fn(),
      complete: jest.fn(),
    };
    
    mockEvaluationRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByProgram: jest.fn(),
      findByTask: jest.fn(),
    };

    // Mock factory returns
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
    (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);

    service = new AssessmentLearningService();
  });

  describe('startAssessment', () => {
    it('should create a new assessment program', async () => {
      // Arrange
      const userId = 'user-123';
      const scenarioId = 'scenario-456';
      const language = 'en';
      
      const mockScenario: IScenario = {
        id: scenarioId,
        mode: 'assessment',
        status: 'active',
        version: '1.0',
        sourceType: 'yaml',
        sourcePath: 'assessment_data/ai_literacy/ai_literacy_questions_en.yaml',
        sourceMetadata: {},
        title: { en: 'AI Literacy Assessment' },
        description: { en: 'Test your AI knowledge' },
        objectives: ['Evaluate AI knowledge'],
        difficulty: 'intermediate',
        estimatedMinutes: 15,
        prerequisites: [],
        taskTemplates: [{ id: 'assessment-task', title: { en: 'Complete Assessment' }, type: 'question' }],
        taskCount: 12,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {
          totalQuestions: 12,
          timeLimit: 15,
          passingScore: 60,
          domains: ['domain1', 'domain2'],
          questionBankByLanguage: {
            en: [
              { id: 'q1', question: 'What is AI?', options: ['A', 'B', 'C'], correct_answer: 'A' }
            ]
          }
        },
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {}
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      
      const createdProgram: IProgram = {
        id: 'program-789',
        userId,
        scenarioId,
        mode: 'assessment',
        status: 'active',
        currentTaskIndex: 0,
        completedTaskCount: 0,
        totalTaskCount: 1,
        totalScore: 0,
        domainScores: {},
        xpEarned: 0,
        badgesEarned: [],
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        timeSpentSeconds: 0,
        pblData: {},
        discoveryData: {},
        assessmentData: {
          selectedQuestions: ['q1'],
          timeStarted: new Date().toISOString(),
          timeLimit: 15
        },
        metadata: {}
      };
      
      mockProgramRepo.create.mockResolvedValue(createdProgram);

      // Act
      const result = await service.startAssessment(userId, scenarioId, language);

      // Assert
      expect(mockScenarioRepo.findById).toHaveBeenCalledWith(scenarioId);
      expect(mockProgramRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          scenarioId,
          mode: 'assessment',
          status: 'active',
          totalTaskCount: 1
        })
      );
      expect(result).toEqual(createdProgram);
    });

    it('should throw error if scenario not found', async () => {
      // Arrange
      mockScenarioRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.startAssessment('user-123', 'invalid-id', 'en')
      ).rejects.toThrow('Scenario not found');
    });

    it('should throw error if scenario is not assessment type', async () => {
      // Arrange
      const mockScenario = {
        id: 'scenario-456',
        mode: 'pbl', // Wrong mode
        assessmentData: null
      };
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      // Act & Assert
      await expect(
        service.startAssessment('user-123', 'scenario-456', 'en')
      ).rejects.toThrow('Scenario is not an assessment');
    });
  });

  describe('submitAnswer', () => {
    it('should record answer and update task interactions', async () => {
      // Arrange
      const programId = 'program-789';
      const questionId = 'q1';
      const answer = 'A';
      
      const mockTask: ITask = {
        id: 'task-123',
        programId,
        mode: 'assessment',
        taskIndex: 0,
        title: { en: 'Assessment Task' },
        type: 'question',
        status: 'active',
        content: {
          questions: [
            { id: 'q1', question: 'What is AI?', options: ['A', 'B', 'C'], correct_answer: 'A' }
          ]
        },
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 1,
        attemptCount: 0,
        timeSpentSeconds: 0,
        aiConfig: {},
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      };

      mockTaskRepo.findByProgram.mockResolvedValue([mockTask]);
      mockTaskRepo.updateInteractions.mockResolvedValue({
        ...mockTask,
        interactions: [{
          timestamp: new Date().toISOString(),
          type: 'user_input',
          content: {
            questionId,
            selectedAnswer: answer,
            isCorrect: true,
            timeSpent: 5
          }
        }]
      });

      // Act
      const result = await service.submitAnswer(programId, questionId, answer);

      // Assert
      expect(mockTaskRepo.findByProgram).toHaveBeenCalledWith(programId);
      expect(mockTaskRepo.updateInteractions).toHaveBeenCalled();
      expect(result.isCorrect).toBe(true);
    });
  });

  describe('completeAssessment', () => {
    it('should calculate scores and complete the program', async () => {
      // Arrange
      const programId = 'program-789';
      
      const mockProgram: IProgram = {
        id: programId,
        userId: 'user-123',
        scenarioId: 'scenario-456',
        mode: 'assessment',
        status: 'active',
        currentTaskIndex: 0,
        completedTaskCount: 0,
        totalTaskCount: 1,
        totalScore: 0,
        domainScores: {},
        xpEarned: 0,
        badgesEarned: [],
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        timeSpentSeconds: 300,
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      };

      const mockTask: ITask = {
        id: 'task-123',
        programId,
        mode: 'assessment',
        taskIndex: 0,
        type: 'question',
        status: 'active',
        content: {},
        interactions: [
          {
            timestamp: new Date().toISOString(),
            type: 'user_input',
            content: {
              questionId: 'q1',
              selectedAnswer: 'A',
              isCorrect: true,
              timeSpent: 5
            }
          }
        ],
        interactionCount: 1,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 1,
        attemptCount: 1,
        timeSpentSeconds: 5,
        aiConfig: {},
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      };

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue([mockTask]);
      mockProgramRepo.complete.mockResolvedValue({
        ...mockProgram,
        status: 'completed',
        totalScore: 100,
        completedAt: new Date().toISOString()
      });

      const mockEvaluation: IEvaluation = {
        id: 'eval-123',
        userId: 'user-123',
        programId,
        mode: 'assessment',
        evaluationType: 'program',
        score: 100,
        maxScore: 100,
        domainScores: { domain1: 100 },
        feedbackData: {},
        aiAnalysis: {},
        timeTakenSeconds: 300,
        createdAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      };

      mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);

      // Act
      const result = await service.completeAssessment(programId);

      // Assert
      expect(mockProgramRepo.findById).toHaveBeenCalledWith(programId);
      expect(mockTaskRepo.findByProgram).toHaveBeenCalledWith(programId);
      expect(mockProgramRepo.complete).toHaveBeenCalledWith(programId);
      expect(mockEvaluationRepo.create).toHaveBeenCalled();
      expect(result.evaluation).toBeDefined();
      expect(result.evaluation.score).toBe(100);
    });
  });

  describe('getProgress', () => {
    it('should return current assessment progress', async () => {
      // Arrange
      const programId = 'program-789';
      
      const mockProgram: IProgram = {
        id: programId,
        userId: 'user-123',
        scenarioId: 'scenario-456',
        mode: 'assessment',
        status: 'active',
        currentTaskIndex: 0,
        completedTaskCount: 0,
        totalTaskCount: 1,
        totalScore: 0,
        domainScores: {},
        xpEarned: 0,
        badgesEarned: [],
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        timeSpentSeconds: 120,
        pblData: {},
        discoveryData: {},
        assessmentData: {
          selectedQuestions: ['q1', 'q2', 'q3'],
          timeStarted: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
          timeLimit: 15
        },
        metadata: {}
      };

      const mockTask: ITask = {
        id: 'task-123',
        programId,
        mode: 'assessment',
        taskIndex: 0,
        type: 'question',
        status: 'active',
        content: {
          questions: [
            { id: 'q1', question: 'Q1' },
            { id: 'q2', question: 'Q2' },
            { id: 'q3', question: 'Q3' }
          ]
        },
        interactions: [
          { timestamp: '', type: 'user_input', content: { questionId: 'q1' } }
        ],
        interactionCount: 1,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 1,
        attemptCount: 0,
        timeSpentSeconds: 120,
        aiConfig: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      };

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue([mockTask]);

      // Act
      const result = await service.getProgress(programId);

      // Assert
      expect(result.answeredQuestions).toBe(1);
      expect(result.totalQuestions).toBe(3);
      expect(result.timeRemaining).toBeLessThan(15 * 60); // Less than 15 minutes
      expect(result.status).toBe('active');
    });
  });
});