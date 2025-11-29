import { describe, it, expect } from '@jest/globals';
import { SyncVerificationService } from '../sync-verification.service';

describe('SyncVerificationService', () => {
  const service = new SyncVerificationService();

  describe('generateChecksum', () => {
    it('should generate consistent checksum for same tasks', async () => {
      const tasks = [
        { id: 'task1', evaluationId: 'eval1', completedAt: '2024-01-01' },
        { id: 'task2', evaluationId: 'eval2', completedAt: '2024-01-02' }
      ];

      const checksum1 = await service.generateChecksum(tasks);
      const checksum2 = await service.generateChecksum(tasks);

      expect(checksum1).toBe(checksum2);
      expect(checksum1).toHaveLength(8);
    });

    it('should filter and process tasks correctly', async () => {
      const tasks1 = [
        { id: 'task1', evaluationId: 'eval1', completedAt: '2024-01-01' }
      ];
      const tasks2 = [
        { id: 'task2', evaluationId: 'eval2', completedAt: '2024-01-02' }
      ];

      const checksum1 = await service.generateChecksum(tasks1);
      const checksum2 = await service.generateChecksum(tasks2);

      // Checksums should be strings of length 8
      expect(typeof checksum1).toBe('string');
      expect(typeof checksum2).toBe('string');
      expect(checksum1).toHaveLength(8);
      expect(checksum2).toHaveLength(8);
    });

    it('should filter out tasks without evaluationId', async () => {
      const tasks = [
        { id: 'task1', evaluationId: 'eval1', completedAt: '2024-01-01' },
        { id: 'task2', evaluationId: undefined, completedAt: '2024-01-02' },
        { id: 'task3', evaluationId: 'eval3', completedAt: '2024-01-03' }
      ];

      const checksum = await service.generateChecksum(tasks);
      expect(checksum).toHaveLength(8);
    });

    it('should sort tasks by id for consistent ordering', async () => {
      const tasks1 = [
        { id: 'task2', evaluationId: 'eval2', completedAt: '2024-01-02' },
        { id: 'task1', evaluationId: 'eval1', completedAt: '2024-01-01' }
      ];
      const tasks2 = [
        { id: 'task1', evaluationId: 'eval1', completedAt: '2024-01-01' },
        { id: 'task2', evaluationId: 'eval2', completedAt: '2024-01-02' }
      ];

      const checksum1 = await service.generateChecksum(tasks1);
      const checksum2 = await service.generateChecksum(tasks2);

      expect(checksum1).toBe(checksum2);
    });
  });

  describe('verifyEvaluationStatus', () => {
    it('should require update if evaluation marked as outdated', async () => {
      const program = {
        id: 'prog1',
        metadata: { evaluationOutdated: true }
      };
      const evaluation = {
        id: 'eval1',
        metadata: { isLatest: true, evaluatedTaskCount: 5 }
      };
      const tasks = [
        { id: 'task1', evaluationId: 'eval1', completedAt: '2024-01-01' }
      ];

      const result = await service.verifyEvaluationStatus(program, evaluation, tasks);

      expect(result.needsUpdate).toBe(true);
      expect(result.reason).toBe('evaluation_outdated');
    });

    it('should require update if isLatest flag is false', async () => {
      const program = { id: 'prog1', metadata: {} };
      const evaluation = {
        id: 'eval1',
        metadata: { isLatest: false, evaluatedTaskCount: 5 }
      };
      const tasks = [
        { id: 'task1', evaluationId: 'eval1', completedAt: '2024-01-01' }
      ];

      const result = await service.verifyEvaluationStatus(program, evaluation, tasks);

      expect(result.needsUpdate).toBe(true);
      expect(result.reason).toBe('flag_outdated');
    });

    it('should require update if task count mismatch', async () => {
      const program = { id: 'prog1', metadata: {} };
      const evaluation = {
        id: 'eval1',
        metadata: { isLatest: true, evaluatedTaskCount: 2 }
      };
      const tasks = [
        { id: 'task1', evaluationId: 'eval1', completedAt: '2024-01-01' }
      ];

      const result = await service.verifyEvaluationStatus(program, evaluation, tasks);

      expect(result.needsUpdate).toBe(true);
      expect(result.reason).toBe('task_count_mismatch');
    });

    it('should skip checksum verification within 24 hours (most cases)', async () => {
      const program = { id: 'prog1', metadata: {} };
      const recentSync = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(); // 12 hours ago
      const evaluation = {
        id: 'eval1',
        metadata: {
          isLatest: true,
          evaluatedTaskCount: 1,
          lastSyncedAt: recentSync,
          syncChecksum: 'wrongchecksum'
        }
      };
      const tasks = [
        { id: 'task1', evaluationId: 'eval1', completedAt: '2024-01-01' }
      ];

      // Run multiple times to check probabilistic skipping
      let skippedCount = 0;
      for (let i = 0; i < 20; i++) {
        const result = await service.verifyEvaluationStatus(program, evaluation, tasks);
        if (result.debug.checksumVerification === 'skipped') {
          skippedCount++;
        }
      }

      // Most should be skipped (5% probability, so expect ~19/20 skipped)
      expect(skippedCount).toBeGreaterThan(15);
    });

    it('should detect checksum mismatch when verified', async () => {
      const program = { id: 'prog1', metadata: {} };
      const oldSync = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(); // 50 hours ago
      const tasks = [
        { id: 'task1', evaluationId: 'eval1', completedAt: '2024-01-01' }
      ];
      const validChecksum = await service.generateChecksum(tasks);

      const evaluation = {
        id: 'eval1',
        metadata: {
          isLatest: true,
          evaluatedTaskCount: 1,
          lastSyncedAt: oldSync,
          syncChecksum: 'wrongchecksum' // Different from valid checksum
        }
      };

      const result = await service.verifyEvaluationStatus(program, evaluation, tasks);

      // Should always verify after 48 hours
      expect(result.debug.checksumVerification).not.toBe('skipped');
      expect(result.needsUpdate).toBe(true);
      expect(result.reason).toBe('checksum_mismatch');
    });

    it('should return up_to_date when all checks pass', async () => {
      const program = { id: 'prog1', metadata: {} };
      const recentSync = new Date().toISOString();
      const tasks = [
        { id: 'task1', evaluationId: 'eval1', completedAt: '2024-01-01' }
      ];
      const validChecksum = await service.generateChecksum(tasks);

      const evaluation = {
        id: 'eval1',
        metadata: {
          isLatest: true,
          evaluatedTaskCount: 1,
          lastSyncedAt: recentSync,
          syncChecksum: validChecksum
        }
      };

      const result = await service.verifyEvaluationStatus(program, evaluation, tasks);

      expect(result.needsUpdate).toBe(false);
      expect(result.reason).toBe('up_to_date');
    });
  });
});
