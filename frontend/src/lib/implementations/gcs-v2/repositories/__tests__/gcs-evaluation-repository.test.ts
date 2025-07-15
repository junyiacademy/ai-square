/**
 * TDD Test: GCS Evaluation Repository
 * Tests for unified learning architecture - Evaluation stage
 */

import { GCSEvaluationRepository } from '../gcs-evaluation-repository';
import { IEvaluation } from '@/types/unified-learning';
import { jest } from '@jest/globals';

// Mock GCS dependencies
jest.mock('@google-cloud/storage');
jest.mock('@/lib/config/gcs.config', () => ({
  GCS_CONFIG: {
    paths: {
      evaluations: 'test-evaluations/'
    }
  }
}));

describe('GCSEvaluationRepository - Unified Learning Architecture', () => {
  let repository: GCSEvaluationRepository;
  let mockSaveEntity: jest.Mock;
  let mockLoadEntity: jest.Mock;
  let mockListAllEntities: jest.Mock;
  let mockUpdateEntity: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    repository = new GCSEvaluationRepository();
    
    // Mock the base repository methods
    mockSaveEntity = jest.fn();
    mockLoadEntity = jest.fn();
    mockListAllEntities = jest.fn();
    mockUpdateEntity = jest.fn();
    
    (repository as any).saveEntity = mockSaveEntity;
    (repository as any).loadEntity = mockLoadEntity;
    (repository as any).listAllEntities = mockListAllEntities;
    (repository as any).updateEntity = mockUpdateEntity;
    (repository as any).generateId = jest.fn(() => 'eval-uuid-1234');
  });

  describe('create() - Task/Program → Evaluation generation', () => {
    it('should create PBL task evaluation', async () => {
      // Red: Write failing test first
      const pblEvaluationData: Omit<IEvaluation, 'id'> = {
        entityType: 'task',
        entityId: 'task-uuid-1234',
        programId: 'program-uuid',
        userId: 'user@example.com',
        type: 'ai_feedback',
        createdAt: '2024-01-01T00:00:00.000Z',
        metadata: {
          sourceType: 'pbl',
          ksaCodes: ['K1', 'S2', 'A1'],
          aiModules: ['research', 'analysis'],
          taskType: 'chat',
          performance: {
            qualityScore: 85,
            completionTime: 1800,
            aiCollaboration: 'effective',
            criticalThinking: 'good'
          },
          feedback: {
            strengths: ['Good use of research methodology', 'Clear analysis'],
            improvements: ['Consider more diverse sources', 'Deeper critical analysis'],
            nextSteps: ['Practice advanced research techniques']
          }
        }
      };

      const expectedEvaluation: IEvaluation = {
        ...pblEvaluationData,
        id: 'eval-uuid-1234',
        createdAt: expect.any(String)
      };

      mockSaveEntity.mockResolvedValue(expectedEvaluation);

      // Green: Make test pass
      const result = await repository.create(pblEvaluationData);

      expect(result).toEqual(expectedEvaluation);
      expect(result.entityType).toBe('task');
      expect(result.type).toBe('ai_feedback');
      expect(result.metadata?.sourceType).toBe('pbl');
      expect(result.metadata?.performance).toBeDefined();
      expect(mockSaveEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          ...pblEvaluationData,
          id: 'eval-uuid-1234',
          createdAt: expect.any(String)
        })
      );
    });

    it('should create Discovery program evaluation', async () => {
      const discoveryEvaluationData: Omit<IEvaluation, 'id'> = {
        entityType: 'program',
        entityId: 'program-uuid-1234',
        programId: 'program-uuid-1234',
        userId: 'user@example.com',
        type: 'program_completion',
        createdAt: '2024-01-01T00:00:00.000Z',
        metadata: {
          sourceType: 'discovery',
          careerType: 'app_developer',
          worldSetting: 'Tech Hub City',
          programMetrics: {
            totalTasks: 5,
            completedTasks: 5,
            totalXP: 250,
            skillsGained: ['programming', 'problem_solving', 'communication'],
            achievements: ['first_program', 'skill_master'],
            completionRate: 100,
            averageTaskTime: 1200
          },
          finalAssessment: {
            overallRating: 'excellent',
            careerReadiness: 85,
            skillProficiency: {
              technical: 80,
              communication: 75,
              problem_solving: 90
            },
            mentorFeedback: 'Excellent progress in app development fundamentals'
          }
        }
      };

      const expectedEvaluation: IEvaluation = {
        ...discoveryEvaluationData,
        id: 'eval-uuid-1234',
        createdAt: expect.any(String)
      };

      mockSaveEntity.mockResolvedValue(expectedEvaluation);

      const result = await repository.create(discoveryEvaluationData);

      expect(result).toEqual(expectedEvaluation);
      expect(result.entityType).toBe('program');
      expect(result.type).toBe('program_completion');
      expect(result.metadata?.sourceType).toBe('discovery');
      expect(result.metadata?.programMetrics).toBeDefined();
      expect(result.metadata?.finalAssessment).toBeDefined();
    });

    it('should create Assessment task evaluation', async () => {
      const assessmentEvaluationData: Omit<IEvaluation, 'id'> = {
        entityType: 'task',
        entityId: 'task-uuid-1234',
        programId: 'program-uuid',
        userId: 'user@example.com',
        type: 'auto_grading',
        createdAt: '2024-01-01T00:00:00.000Z',
        metadata: {
          sourceType: 'assessment',
          questionType: 'multiple_choice',
          domain: 'Engaging_with_AI',
          grading: {
            userAnswer: 'A',
            correctAnswer: 'A',
            isCorrect: true,
            points: 10,
            maxPoints: 10,
            timeSpent: 45,
            attempts: 1
          },
          analytics: {
            difficulty: 'beginner',
            averageScore: 7.5,
            correctRate: 0.75,
            commonMistakes: ['Option B selected by 20%']
          }
        }
      };

      const expectedEvaluation: IEvaluation = {
        ...assessmentEvaluationData,
        id: 'eval-uuid-1234',
        createdAt: expect.any(String)
      };

      mockSaveEntity.mockResolvedValue(expectedEvaluation);

      const result = await repository.create(assessmentEvaluationData);

      expect(result).toEqual(expectedEvaluation);
      expect(result.entityType).toBe('task');
      expect(result.type).toBe('auto_grading');
      expect(result.metadata?.sourceType).toBe('assessment');
      expect(result.metadata?.grading).toBeDefined();
      expect(result.metadata?.analytics).toBeDefined();
    });
  });

  describe('findById() - Evaluation retrieval', () => {
    it('should find evaluation by UUID', async () => {
      const evaluationId = 'eval-uuid-1234';
      const expectedEvaluation: IEvaluation = {
        id: evaluationId,
        entityType: 'task',
        entityId: 'task-uuid',
        programId: 'program-uuid',
        userId: 'user@example.com',
        type: 'ai_feedback',
        createdAt: '2024-01-01T00:00:00.000Z',
        metadata: {
          sourceType: 'pbl',
          performance: { qualityScore: 85 }
        }
      };

      mockLoadEntity.mockResolvedValue(expectedEvaluation);

      const result = await repository.findById(evaluationId);

      expect(result).toEqual(expectedEvaluation);
      expect(mockLoadEntity).toHaveBeenCalledWith(evaluationId);
    });

    it('should return null for non-existent evaluation', async () => {
      mockLoadEntity.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByEntity() - Entity evaluations', () => {
    it('should find all evaluations for a task', async () => {
      const entityId = 'task-uuid-1234';
      const mockEvaluations: IEvaluation[] = [
        {
          id: 'eval-1',
          entityType: 'task',
          entityId,
          programId: 'program-uuid',
          userId: 'user@example.com',
          type: 'ai_feedback',
          createdAt: '2024-01-01T00:00:00.000Z',
          metadata: { sourceType: 'pbl' }
        },
        {
          id: 'eval-2',
          entityType: 'task',
          entityId,
          programId: 'program-uuid',
          userId: 'user@example.com',
          type: 'peer_review',
          createdAt: '2024-01-01T01:00:00.000Z',
          metadata: { sourceType: 'pbl' }
        }
      ];

      mockListAllEntities.mockResolvedValue([
        ...mockEvaluations,
        {
          id: 'eval-3',
          entityType: 'task',
          entityId: 'other-task-uuid',
          programId: 'program-uuid',
          userId: 'user@example.com',
          type: 'ai_feedback',
          createdAt: '2024-01-01T02:00:00.000Z',
          metadata: { sourceType: 'pbl' }
        }
      ]);

      const result = await repository.findByEntity('task', entityId);

      expect(result).toHaveLength(2);
      expect(result.every(e => e.entityId === entityId && e.entityType === 'task')).toBe(true);
    });

    it('should find evaluations for a program', async () => {
      const programId = 'program-uuid-1234';
      const mockEvaluations: IEvaluation[] = [
        {
          id: 'eval-1',
          entityType: 'program',
          entityId: programId,
          programId,
          userId: 'user@example.com',
          type: 'program_completion',
          createdAt: '2024-01-01T00:00:00.000Z',
          metadata: { sourceType: 'discovery' }
        }
      ];

      mockListAllEntities.mockResolvedValue(mockEvaluations);

      const result = await repository.findByEntity('program', programId);

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('program');
      expect(result[0].entityId).toBe(programId);
    });
  });

  describe('findByProgram() - Program evaluations', () => {
    it('should find all evaluations for a program', async () => {
      const programId = 'program-uuid-1234';
      const mockEvaluations: IEvaluation[] = [
        {
          id: 'eval-1',
          entityType: 'task',
          entityId: 'task-1',
          programId,
          userId: 'user@example.com',
          type: 'ai_feedback',
          createdAt: '2024-01-01T00:00:00.000Z',
          metadata: { sourceType: 'pbl' }
        },
        {
          id: 'eval-2',
          entityType: 'task',
          entityId: 'task-2',
          programId,
          userId: 'user@example.com',
          type: 'ai_feedback',
          createdAt: '2024-01-01T01:00:00.000Z',
          metadata: { sourceType: 'pbl' }
        },
        {
          id: 'eval-3',
          entityType: 'program',
          entityId: programId,
          programId,
          userId: 'user@example.com',
          type: 'program_completion',
          createdAt: '2024-01-01T02:00:00.000Z',
          metadata: { sourceType: 'pbl' }
        }
      ];

      mockListAllEntities.mockResolvedValue([
        ...mockEvaluations,
        {
          id: 'eval-4',
          entityType: 'task',
          entityId: 'task-3',
          programId: 'other-program',
          userId: 'user@example.com',
          type: 'ai_feedback',
          createdAt: '2024-01-01T03:00:00.000Z',
          metadata: { sourceType: 'discovery' }
        }
      ]);

      const result = await repository.findByProgram(programId);

      expect(result).toHaveLength(3);
      expect(result.every(e => e.programId === programId)).toBe(true);
    });
  });

  describe('findByUser() - User evaluations', () => {
    it('should find all evaluations for a user', async () => {
      const userId = 'user@example.com';
      const mockEvaluations: IEvaluation[] = [
        {
          id: 'eval-1',
          entityType: 'task',
          entityId: 'task-1',
          programId: 'program-1',
          userId,
          type: 'ai_feedback',
          createdAt: '2024-01-01T00:00:00.000Z',
          metadata: { sourceType: 'pbl' }
        },
        {
          id: 'eval-2',
          entityType: 'program',
          entityId: 'program-2',
          programId: 'program-2',
          userId,
          type: 'program_completion',
          createdAt: '2024-01-01T01:00:00.000Z',
          metadata: { sourceType: 'discovery' }
        }
      ];

      mockListAllEntities.mockResolvedValue([
        ...mockEvaluations,
        {
          id: 'eval-3',
          entityType: 'task',
          entityId: 'task-2',
          programId: 'program-3',
          userId: 'other@example.com',
          type: 'ai_feedback',
          createdAt: '2024-01-01T02:00:00.000Z',
          metadata: { sourceType: 'assessment' }
        }
      ]);

      const result = await repository.findByUser(userId);

      expect(result).toHaveLength(2);
      expect(result.every(e => e.userId === userId)).toBe(true);
    });
  });

  describe('update() - Evaluation modification', () => {
    it('should update evaluation metadata', async () => {
      const evaluationId = 'eval-uuid-1234';
      const updates = {
        metadata: {
          sourceType: 'pbl',
          performance: { qualityScore: 90 },
          feedback: { strengths: ['Updated feedback'] }
        }
      };

      const updatedEvaluation: IEvaluation = {
        id: evaluationId,
        entityType: 'task',
        entityId: 'task-uuid',
        programId: 'program-uuid',
        userId: 'user@example.com',
        type: 'ai_feedback',
        createdAt: '2024-01-01T00:00:00.000Z',
        metadata: updates.metadata
      };

      mockUpdateEntity.mockResolvedValue(updatedEvaluation);

      const result = await repository.update(evaluationId, updates);

      expect(result).toEqual(updatedEvaluation);
      expect(result.metadata?.performance?.qualityScore).toBe(90);
      expect(mockUpdateEntity).toHaveBeenCalledWith(evaluationId, updates);
    });
  });

  describe('Unified Architecture Compliance', () => {
    it('should ensure all evaluations follow IEvaluation interface', async () => {
      const testEvaluations = [
        {
          sourceType: 'pbl',
          entityType: 'task' as const,
          type: 'ai_feedback' as const,
          expectedFields: ['performance', 'feedback', 'ksaCodes']
        },
        {
          sourceType: 'discovery',
          entityType: 'program' as const,
          type: 'program_completion' as const,
          expectedFields: ['programMetrics', 'finalAssessment', 'careerType']
        },
        {
          sourceType: 'assessment',
          entityType: 'task' as const,
          type: 'auto_grading' as const,
          expectedFields: ['grading', 'analytics', 'domain']
        }
      ];

      for (const testCase of testEvaluations) {
        const evaluationData: Omit<IEvaluation, 'id'> = {
          entityType: testCase.entityType,
          entityId: testCase.entityType === 'program' ? 'program-uuid' : 'task-uuid',
          programId: 'program-uuid',
          userId: 'user@example.com',
          type: testCase.type,
          createdAt: '2024-01-01T00:00:00.000Z',
          metadata: {
            sourceType: testCase.sourceType as any,
            // Add type-specific metadata
            ...(testCase.sourceType === 'pbl' && {
              performance: { qualityScore: 85 },
              feedback: { strengths: ['Good work'] },
              ksaCodes: ['K1']
            }),
            ...(testCase.sourceType === 'discovery' && {
              programMetrics: { totalTasks: 5, completedTasks: 5 },
              finalAssessment: { overallRating: 'excellent' },
              careerType: 'app_developer'
            }),
            ...(testCase.sourceType === 'assessment' && {
              grading: { isCorrect: true, points: 10 },
              analytics: { difficulty: 'beginner' },
              domain: 'Engaging_with_AI'
            })
          }
        };

        const expectedEvaluation = {
          ...evaluationData,
          id: 'eval-uuid-1234',
          createdAt: expect.any(String)
        };

        mockSaveEntity.mockResolvedValue(expectedEvaluation);

        const result = await repository.create(evaluationData);

        // Verify unified interface compliance
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('entityType');
        expect(result).toHaveProperty('entityId');
        expect(result).toHaveProperty('programId');
        expect(result).toHaveProperty('userId');
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('createdAt');
        expect(result).toHaveProperty('metadata');
        
        // Verify entity type is valid
        expect(['task', 'program']).toContain(result.entityType);
        
        // Verify evaluation type is valid
        expect(['ai_feedback', 'peer_review', 'self_assessment', 'auto_grading', 'program_completion']).toContain(result.type);
      }
    });
  });
});