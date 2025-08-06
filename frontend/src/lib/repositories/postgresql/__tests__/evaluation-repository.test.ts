/**
 * Unit tests for PostgreSQLEvaluationRepository
 * Tests evaluation database operations
 */

import { Pool } from 'pg';
import { PostgreSQLEvaluationRepository } from '../evaluation-repository';
import type { DBEvaluation } from '@/types/database';
import type { IEvaluation } from '@/types/unified-learning';

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  }))
}));

describe('PostgreSQLEvaluationRepository', () => {
  let repository: PostgreSQLEvaluationRepository;
  let mockPool: jest.Mocked<Pool>;

  const mockDBEvaluation: DBEvaluation = {
    id: 'eval-123',
    user_id: 'user-456',
    program_id: 'program-789',
    task_id: 'task-321',
    mode: 'pbl',
    evaluation_type: 'formative',
    evaluation_subtype: 'task_completion',
    score: 87.5,
    max_score: 100,
    domain_scores: { knowledge: 85, skills: 88, attitudes: 90 },
    feedback_text: 'Good work on this task!',
    feedback_data: { strengths: ['problem-solving'], improvements: ['clarity'] },
    ai_provider: 'openai',
    ai_model: 'gpt-4',
    ai_analysis: { confidence: 0.85, reasoning: 'Well-structured response' },
    time_taken_seconds: 1800,
    created_at: '2024-01-01T00:00:00.000Z',
    pbl_data: { complexity_handled: 'medium' },
    discovery_data: {},
    assessment_data: {},
    metadata: { source: 'auto-evaluation' }
  };

  const expectedEvaluation: IEvaluation = {
    id: 'eval-123',
    userId: 'user-456',
    programId: 'program-789',
    taskId: 'task-321',
    mode: 'pbl',
    evaluationType: 'formative',
    evaluationSubtype: 'task_completion',
    score: 87.5,
    maxScore: 100,
    domainScores: { knowledge: 85, skills: 88, attitudes: 90 },
    feedbackText: 'Good work on this task!',
    feedbackData: { strengths: ['problem-solving'], improvements: ['clarity'] },
    aiProvider: 'openai',
    aiModel: 'gpt-4',
    aiAnalysis: { confidence: 0.85, reasoning: 'Well-structured response' },
    timeTakenSeconds: 1800,
    createdAt: '2024-01-01T00:00:00.000Z',
    pblData: { complexity_handled: 'medium' },
    discoveryData: {},
    assessmentData: {},
    metadata: { source: 'auto-evaluation' }
  };

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    } as any;

    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);
    repository = new PostgreSQLEvaluationRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find evaluation by ID', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBEvaluation],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('eval-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM evaluations WHERE id = $1'),
        ['eval-123']
      );
      expect(result).toEqual(expectedEvaluation);
    });

    it('should return null if evaluation not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(repository.findById('eval-123'))
        .rejects.toThrow('Database error');
    });
  });

  describe('findByProgram', () => {
    it('should find evaluations by program ID', async () => {
      const eval2 = { ...mockDBEvaluation, id: 'eval-456' };
      
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBEvaluation, eval2],
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: []
      });

      const result = await repository.findByProgram('program-789');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE program_id = $1'),
        ['program-789']
      );
      expect(result).toHaveLength(2);
      expect(result[0].programId).toBe('program-789');
      expect(result[1].programId).toBe('program-789');
    });

    it('should order by creation time descending', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBEvaluation],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.findByProgram('program-789');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        ['program-789']
      );
    });

    it('should return empty array if no evaluations found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await repository.findByProgram('program-with-no-evals');

      expect(result).toEqual([]);
    });
  });

  describe('findByTask', () => {
    it('should find evaluations by task ID', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBEvaluation],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findByTask('task-321');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE task_id = $1'),
        ['task-321']
      );
      expect(result).toHaveLength(1);
      expect(result[0].taskId).toBe('task-321');
    });

    it('should order by creation time descending', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBEvaluation],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await repository.findByTask('task-321');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        ['task-321']
      );
    });
  });

  describe('findByUser', () => {
    it('should find evaluations by user ID', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBEvaluation],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findByUser('user-456');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-456']
      );
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-456');
    });
  });

  describe('create', () => {
    it('should create a new evaluation', async () => {
      const newEvaluation: Omit<IEvaluation, 'id'> = {
        userId: 'user-456',
        programId: 'program-789',
        taskId: 'task-321',
        mode: 'assessment',
        evaluationType: 'summative',
        score: 92,
        maxScore: 100,
        domainScores: {},
        feedbackData: {},
        aiAnalysis: {},
        timeTakenSeconds: 1200,
        createdAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      };

      const createdDBEvaluation = {
        ...mockDBEvaluation,
        id: 'new-eval-id',
        mode: 'assessment',
        evaluation_type: 'summative',
        score: 92,
        time_taken_seconds: 1200
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [createdDBEvaluation],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.create(newEvaluation);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO evaluations'),
        expect.any(Array)
      );
      expect(result.mode).toBe('assessment');
      expect(result.evaluationType).toBe('summative');
      expect(result.score).toBe(92);
    });

    it('should handle optional fields correctly', async () => {
      const minimalEvaluation: Omit<IEvaluation, 'id'> = {
        userId: 'user-456',
        mode: 'pbl',
        evaluationType: 'formative',
        score: 0,
        maxScore: 100,
        domainScores: {},
        feedbackData: {},
        aiAnalysis: {},
        timeTakenSeconds: 0,
        createdAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBEvaluation, program_id: null, task_id: null }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.create(minimalEvaluation);

      expect(result.programId).toBeUndefined();
      expect(result.taskId).toBeUndefined();
    });

    it('should handle create errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Insert failed'));

      const newEvaluation = {
        userId: 'user-456',
        mode: 'pbl' as const,
        evaluationType: 'formative' as const,
        score: 0,
        maxScore: 100,
        domainScores: {},
        feedbackData: {},
        aiAnalysis: {},
        timeTakenSeconds: 0,
        createdAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      };

      await expect(repository.create(newEvaluation))
        .rejects.toThrow('Insert failed');
    });
  });

  describe('update', () => {
    it('should update evaluation score', async () => {
      const updates = { score: 95 };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          ...mockDBEvaluation,
          score: 95
        }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.update('eval-123', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE evaluations'),
        [95, 'eval-123']
      );
      expect(result.score).toBe(95);
    });

    it('should update feedback and AI analysis', async () => {
      const updates = {
        feedbackText: 'Updated feedback',
        aiAnalysis: { confidence: 0.95, reasoning: 'Updated reasoning' }
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          ...mockDBEvaluation,
          feedback_text: 'Updated feedback',
          ai_analysis: { confidence: 0.95, reasoning: 'Updated reasoning' }
        }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.update('eval-123', updates);

      expect(result.feedbackText).toBe('Updated feedback');
      expect(result.aiAnalysis).toEqual({ confidence: 0.95, reasoning: 'Updated reasoning' });
    });

    it('should handle empty updates', async () => {
      const updates = {};

      // For empty updates, the method calls findById, so we need to mock it
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBEvaluation],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.update('eval-123', updates);

      expect(result).toEqual(expectedEvaluation);
    });

    it('should handle update when evaluation not found', async () => {
      const updates = { score: 95 };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      await expect(repository.update('non-existent', updates))
        .rejects.toThrow('Evaluation not found');
    });
  });

  describe('Data conversion', () => {
    it('should handle evaluations with null optional fields', async () => {
      const dbEvaluationWithNulls = {
        ...mockDBEvaluation,
        program_id: null,
        task_id: null,
        evaluation_subtype: null,
        feedback_text: null,
        ai_provider: null,
        ai_model: null,
        discovery_data: null,
        assessment_data: null
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [dbEvaluationWithNulls],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('eval-123');

      expect(result).toBeDefined();
      expect(result!.programId).toBeUndefined();
      expect(result!.taskId).toBeUndefined();
      expect(result!.evaluationSubtype).toBeUndefined();
      expect(result!.feedbackText).toBeUndefined();
      expect(result!.aiProvider).toBeUndefined();
      expect(result!.aiModel).toBeUndefined();
    });

    it('should convert string scores to numbers', async () => {
      const dbEvaluationWithStringScores = {
        ...mockDBEvaluation,
        score: '87.5',
        max_score: '100.0'
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [dbEvaluationWithStringScores],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('eval-123');

      expect(result!.score).toBe(87.5);
      expect(result!.maxScore).toBe(100);
      expect(typeof result!.score).toBe('number');
      expect(typeof result!.maxScore).toBe('number');
    });

    it('should convert string time to number', async () => {
      const dbEvaluationWithStringTime = {
        ...mockDBEvaluation,
        time_taken_seconds: '1800'
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [dbEvaluationWithStringTime],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('eval-123');

      expect(result!.timeTakenSeconds).toBe(1800);
      expect(typeof result!.timeTakenSeconds).toBe('number');
    });

    it('should handle missing time_taken_seconds', async () => {
      const dbEvaluationNoTime = {
        ...mockDBEvaluation,
        time_taken_seconds: null
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [dbEvaluationNoTime],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await repository.findById('eval-123');

      expect(result!.timeTakenSeconds).toBe(0);
    });
  });

  describe('Complex queries', () => {
    it('should handle evaluations with different modes', async () => {
      const pblEval = { ...mockDBEvaluation, mode: 'pbl' };
      const assessmentEval = { ...mockDBEvaluation, id: 'eval-2', mode: 'assessment' };
      const discoveryEval = { ...mockDBEvaluation, id: 'eval-3', mode: 'discovery' };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [pblEval, assessmentEval, discoveryEval],
        command: 'SELECT',
        rowCount: 3,
        oid: 0,
        fields: []
      });

      const result = await repository.findByUser('user-456');

      expect(result).toHaveLength(3);
      expect(result[0].mode).toBe('pbl');
      expect(result[1].mode).toBe('assessment');
      expect(result[2].mode).toBe('discovery');
    });

    it('should handle evaluations with different evaluation types', async () => {
      const formativeEval = { ...mockDBEvaluation, evaluation_type: 'formative' };
      const summativeEval = { ...mockDBEvaluation, id: 'eval-2', evaluation_type: 'summative' };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [formativeEval, summativeEval],
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: []
      });

      const result = await repository.findByProgram('program-789');

      expect(result).toHaveLength(2);
      expect(result[0].evaluationType).toBe('formative');
      expect(result[1].evaluationType).toBe('summative');
    });
  });
});