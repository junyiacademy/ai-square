/**
 * PostgreSQL Evaluation Repository Tests
 * 提升覆蓋率從 2.7% 到 80%+
 */

import { Pool } from 'pg';
import { PostgreSQLEvaluationRepository } from '../evaluation-repository';
import type { DBEvaluation } from '@/types/database';
import type { IEvaluation } from '@/types/unified-learning';
import type { UpdateEvaluationDto } from '../../interfaces';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn()
}));

describe('PostgreSQLEvaluationRepository', () => {
  let repository: PostgreSQLEvaluationRepository;
  let mockPool: any;
  let mockClient: any;
  let mockQuery: jest.Mock;
  let mockClientQuery: jest.Mock;

  // Mock data
  const mockDBEvaluation: DBEvaluation = {
    id: 'eval-123',
    user_id: 'user-123',
    program_id: 'prog-123',
    task_id: 'task-123',
    mode: 'pbl',
    evaluation_type: 'formative',
    evaluation_subtype: 'task_completion',
    score: '85.5' as any, // PostgreSQL returns DECIMAL as string
    max_score: '100' as any,
    domain_scores: { problem_solving: 85, creativity: 90 } as any,
    feedback_text: 'Great job!',
    feedback_data: { detailed: { en: 'Great job!' } } as any,
    ai_provider: 'vertex-ai',
    ai_model: 'gemini-1.5-flash',
    ai_analysis: { confidence: 0.95 } as any,
    time_taken_seconds: '120' as any, // Can be string from DB
    pbl_data: { extra: 'data' } as any,
    discovery_data: {} as any,
    assessment_data: {} as any,
    metadata: { key: 'value' } as any,
    created_at: '2024-01-01T00:00:00Z'
  };

  const mockIEvaluation: IEvaluation = {
    id: 'eval-123',
    userId: 'user-123',
    programId: 'prog-123',
    taskId: 'task-123',
    mode: 'pbl',
    evaluationType: 'formative',
    evaluationSubtype: 'task_completion',
    score: 85.5,
    maxScore: 100,
    domainScores: { problem_solving: 85, creativity: 90 },
    feedbackText: 'Great job!',
    feedbackData: { detailed: { en: 'Great job!' } },
    aiProvider: 'vertex-ai',
    aiModel: 'gemini-1.5-flash',
    aiAnalysis: { confidence: 0.95 },
    timeTakenSeconds: 120,
    pblData: { extra: 'data' },
    discoveryData: {},
    assessmentData: {},
    metadata: { key: 'value' },
    createdAt: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock pool methods
    mockQuery = jest.fn();
    mockClientQuery = jest.fn();
    
    mockClient = {
      query: mockClientQuery,
      release: jest.fn()
    };

    mockPool = {
      query: mockQuery,
      connect: jest.fn().mockResolvedValue(mockClient)
    };

    // Create repository instance
    repository = new PostgreSQLEvaluationRepository(mockPool);
  });

  describe('findById', () => {
    it('should find evaluation by id', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBEvaluation] });

      const result = await repository.findById('eval-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM evaluations WHERE id = $1'),
        ['eval-123']
      );
      expect(result).toMatchObject({
        id: 'eval-123',
        userId: 'user-123',
        score: 85.5
      });
    });

    it('should return null when evaluation not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle numeric string conversions', async () => {
      const evalWithNumbers = {
        ...mockDBEvaluation,
        score: '95.75',
        max_score: '100.0',
        time_taken_seconds: '300'
      };
      mockQuery.mockResolvedValue({ rows: [evalWithNumbers] });

      const result = await repository.findById('eval-123');

      expect(result?.score).toBe(95.75);
      expect(result?.maxScore).toBe(100);
      expect(result?.timeTakenSeconds).toBe(300);
    });

    it('should handle missing optional fields', async () => {
      const minimalEval = {
        ...mockDBEvaluation,
        program_id: null,
        task_id: null,
        evaluation_subtype: null,
        feedback_text: null,
        ai_provider: null,
        ai_model: null,
        time_taken_seconds: null
      };
      mockQuery.mockResolvedValue({ rows: [minimalEval] });

      const result = await repository.findById('eval-123');

      expect(result?.programId).toBeUndefined();
      expect(result?.taskId).toBeUndefined();
      expect(result?.evaluationSubtype).toBeUndefined();
      expect(result?.feedbackText).toBeUndefined();
      expect(result?.aiProvider).toBeUndefined();
      expect(result?.aiModel).toBeUndefined();
      expect(result?.timeTakenSeconds).toBe(0);
    });
  });

  describe('findByProgram', () => {
    it('should find evaluations by program', async () => {
      const evaluations = [mockDBEvaluation, { ...mockDBEvaluation, id: 'eval-124' }];
      mockQuery.mockResolvedValue({ rows: evaluations });

      const result = await repository.findByProgram('prog-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE program_id = $1'),
        ['prog-123']
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('findByTask', () => {
    it('should find evaluations by task', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBEvaluation] });

      const result = await repository.findByTask('task-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE task_id = $1'),
        ['task-123']
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findByUser', () => {
    it('should find evaluations by user', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBEvaluation] });

      const result = await repository.findByUser('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-123']
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findByType', () => {
    it('should find evaluations by type', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBEvaluation] });

      const result = await repository.findByType('formative');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE evaluation_type = $1'),
        ['formative']
      );
      expect(result).toHaveLength(1);
    });

    it('should filter by subtype when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBEvaluation] });

      const result = await repository.findByType('formative', 'task_completion');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND evaluation_subtype = $2'),
        ['formative', 'task_completion']
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create a new evaluation', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBEvaluation] });

      const newEvaluation = {
        ...mockIEvaluation,
        id: undefined as any
      };
      delete newEvaluation.id;

      const result = await repository.create(newEvaluation);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO evaluations'),
        expect.arrayContaining([
          'user-123',
          'prog-123',
          'task-123',
          'formative',
          'task_completion'
        ])
      );
      expect(result.id).toBe('eval-123');
    });

    it('should handle minimal evaluation', async () => {
      const minimalEval = {
        userId: 'user-123',
        mode: 'pbl' as const,
        evaluationType: 'formative',
        score: 80,
        maxScore: 100,
        timeTakenSeconds: 60,
        createdAt: '2024-01-01T00:00:00Z',
        domainScores: {},
        feedbackData: {},
        aiAnalysis: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      };

      mockQuery.mockResolvedValue({ rows: [mockDBEvaluation] });

      await repository.create(minimalEval);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO evaluations'),
        expect.arrayContaining([
          'user-123',
          null, // program_id
          null, // task_id
          'formative',
          null  // evaluation_subtype
        ])
      );
    });
  });

  describe('getLatestForTask', () => {
    it('should get latest evaluation for task', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBEvaluation] });

      const result = await repository.getLatestForTask('task-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE task_id = $1'),
        ['task-123']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1'),
        expect.any(Array)
      );
      expect(result?.id).toBe('eval-123');
    });

    it('should return null when no evaluation found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getLatestForTask('task-123');

      expect(result).toBeNull();
    });
  });

  describe('getLatestForProgram', () => {
    it('should get latest program-level evaluation', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBEvaluation] });

      const result = await repository.getLatestForProgram('prog-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE program_id = $1 AND task_id IS NULL'),
        ['prog-123']
      );
      expect(result?.id).toBe('eval-123');
    });
  });

  describe('getUserProgress', () => {
    it('should get user progress statistics', async () => {
      mockClientQuery
        .mockResolvedValueOnce({ rows: [{ total: '5', completed: '3' }] }) // programs
        .mockResolvedValueOnce({ rows: [{ total: '20', completed: '15', avg_score: '87.5', total_time: '7200' }] }) // tasks
        .mockResolvedValueOnce({ rows: [{ total_xp: 1500 }] }) // xp
        .mockResolvedValueOnce({ rows: [ // achievements
          { id: 'ach-1', code: 'FIRST_TASK', name: 'First Task', description: 'Complete first task', xp_reward: 50, earned_at: '2024-01-01' }
        ] });

      const result = await repository.getUserProgress('user-123');

      expect(mockPool.connect).toHaveBeenCalled();
      expect(result).toEqual({
        totalPrograms: 5,
        completedPrograms: 3,
        totalTasks: 20,
        completedTasks: 15,
        totalXpEarned: 1500,
        averageScore: 87.5,
        timeSpentSeconds: 7200,
        achievements: [
          {
            id: 'ach-1',
            code: 'FIRST_TASK',
            type: 'achievement',
            xpReward: 50,
            earnedAt: new Date('2024-01-01')
          }
        ]
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle null values in progress stats', async () => {
      mockClientQuery
        .mockResolvedValueOnce({ rows: [{ total: '0', completed: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0', completed: '0', avg_score: null, total_time: null }] })
        .mockResolvedValueOnce({ rows: [{ total_xp: null }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await repository.getUserProgress('user-123');

      expect(result.totalXpEarned).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.timeSpentSeconds).toBe(0);
      expect(result.achievements).toEqual([]);
    });
  });

  describe('getDetailedEvaluations', () => {
    it('should get evaluations with scenario and task details', async () => {
      const detailedRow = {
        ...mockDBEvaluation,
        scenario_mode: 'pbl',
        scenario_difficulty: 'intermediate',
        task_type: 'question',
        task_index: 2
      };
      mockQuery.mockResolvedValue({ rows: [detailedRow] });

      const result = await repository.getDetailedEvaluations('user-123', 5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN programs p'),
        ['user-123', 5]
      );
      expect(result[0]).toMatchObject({
        id: 'eval-123',
        scenarioMode: 'pbl',
        scenarioDifficulty: 'intermediate',
        taskType: 'question',
        taskIndex: 2
      });
    });
  });

  describe('getDimensionProgress', () => {
    it('should get dimension scores over time', async () => {
      const progressRows = [
        { date: '2024-01-01', domain_scores: { problem_solving: 80 } },
        { date: '2024-01-02', domain_scores: { problem_solving: 85 } }
      ];
      mockQuery.mockResolvedValue({ rows: progressRows });

      const result = await repository.getDimensionProgress('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at::date as date'),
        ['user-123']
      );
      expect(result).toHaveLength(2);
      expect(result[0].scores.problem_solving).toBe(80);
    });

    it('should filter by dimension when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.getDimensionProgress('user-123', 'problem_solving');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND domain_scores ? $2'),
        ['user-123', 'problem_solving']
      );
    });
  });

  describe('getUserStrengthsWeaknesses', () => {
    it('should calculate strengths and weaknesses', async () => {
      const dimensionRows = [
        { dimension: 'problem_solving', avg_score: '90.5' },
        { dimension: 'creativity', avg_score: '88.0' },
        { dimension: 'communication', avg_score: '85.5' },
        { dimension: 'critical_thinking', avg_score: '70.0' }
      ];
      mockQuery.mockResolvedValue({ rows: dimensionRows });

      const result = await repository.getUserStrengthsWeaknesses('user-123');

      expect(result.strengths).toHaveLength(3);
      expect(result.strengths[0]).toEqual({
        dimension: 'problem_solving',
        avgScore: 90.5
      });
      expect(result.weaknesses).toHaveLength(3);
      expect(result.weaknesses[0]).toEqual({
        dimension: 'critical_thinking',
        avgScore: 70.0
      });
    });
  });

  describe('trackAIUsage', () => {
    it('should track AI usage for evaluation', async () => {
      const usage = {
        provider: 'vertex-ai',
        model: 'gemini-1.5-flash',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        estimatedCostUsd: 0.005
      };

      await repository.trackAIUsage('eval-123', usage);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ai_usage'),
        expect.arrayContaining([
          'eval-123',
          'vertex-ai',
          'gemini-1.5-flash',
          100,
          50,
          150,
          0.005
        ])
      );
    });
  });

  describe('findByDateRange', () => {
    it('should find evaluations within date range', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBEvaluation] });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const result = await repository.findByDateRange('user-123', startDate, endDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND created_at >= $2'),
        ['user-123', startDate.toISOString(), endDate.toISOString()]
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update evaluation fields', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBEvaluation] });

      const updates: UpdateEvaluationDto = {
        score: 90,
        feedbackText: 'Excellent!',
        domainScores: { problem_solving: 95 },
        metadata: { updated: true }
      };

      const result = await repository.update('eval-123', updates);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE evaluations'),
        expect.arrayContaining([90, 'Excellent!', { problem_solving: 95 }, { updated: true }, 'eval-123'])
      );
      expect(result.id).toBe('eval-123');
    });

    it('should handle all update fields', async () => {
      const fullUpdate: UpdateEvaluationDto = {
        score: 95,
        maxScore: 100,
        domainScores: { all: 95 },
        feedbackText: 'Perfect!',
        feedbackData: { detailed: 'Perfect!' },
        aiAnalysis: { confidence: 0.99 },
        metadata: { complete: true }
      };

      mockQuery.mockResolvedValue({ rows: [mockDBEvaluation] });

      await repository.update('eval-123', fullUpdate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('score = $1'),
        expect.arrayContaining([95, 100])
      );
    });

    it('should return existing evaluation when no updates', async () => {
      mockQuery.mockResolvedValue({ rows: [mockDBEvaluation] });

      const result = await repository.update('eval-123', {});

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM evaluations WHERE id = $1'),
        ['eval-123']
      );
      expect(result.id).toBe('eval-123');
    });

    it('should throw error when evaluation not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(repository.update('eval-123', { score: 90 }))
        .rejects.toThrow('Evaluation not found');
    });
  });

  describe('getAverageScoresByType', () => {
    it('should get average scores grouped by type', async () => {
      const avgRows = [
        { evaluation_type: 'formative', evaluation_subtype: 'task', avg_score: '87.5', count: '10' },
        { evaluation_type: 'summative', evaluation_subtype: null, avg_score: '82.0', count: '5' }
      ];
      mockQuery.mockResolvedValue({ rows: avgRows });

      const result = await repository.getAverageScoresByType('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY evaluation_type, evaluation_subtype'),
        ['user-123']
      );
      expect(result).toEqual([
        {
          evaluationType: 'formative',
          evaluationSubtype: 'task',
          avgScore: 87.5,
          count: 10
        },
        {
          evaluationType: 'summative',
          evaluationSubtype: null,
          avgScore: 82.0,
          count: 5
        }
      ]);
    });
  });
});