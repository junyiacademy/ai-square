/**
 * Service for verifying evaluation sync status and generating checksums
 */
import crypto from 'crypto';

interface TaskWithEvaluation {
  id: string;
  evaluationId?: string;
  completedAt?: string;
}

interface Program {
  id: string;
  metadata?: Record<string, unknown>;
}

interface Evaluation {
  id: string;
  metadata?: Record<string, unknown>;
}

interface VerificationResult {
  needsUpdate: boolean;
  reason: string;
  debug: Record<string, unknown>;
}

export class SyncVerificationService {
  /**
   * Generate MD5 checksum for task evaluations
   * Used to detect if evaluation results have changed
   */
  async generateChecksum(tasks: TaskWithEvaluation[]): Promise<string> {
    const checksumData = tasks
      .filter(t => t.evaluationId)
      .map(t => ({
        id: t.id,
        evaluationId: t.evaluationId,
        completedAt: t.completedAt
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return crypto
      .createHash('md5')
      .update(JSON.stringify(checksumData))
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Verify if program evaluation needs update
   * Three-layer verification:
   * 1. Check outdated flag
   * 2. Check isLatest flag
   * 3. Check task count
   * 4. Check checksum (probabilistic based on time since last sync)
   */
  async verifyEvaluationStatus(
    program: Program,
    evaluation: Evaluation,
    tasks: TaskWithEvaluation[]
  ): Promise<VerificationResult> {
    const debug: Record<string, unknown> = {
      evaluationId: evaluation.id,
      isLatest: evaluation.metadata?.isLatest,
      evaluationOutdated: program.metadata?.evaluationOutdated,
      lastSyncedAt: evaluation.metadata?.lastSyncedAt
    };

    // Layer 0: Check if marked as outdated
    if (program.metadata?.evaluationOutdated === true) {
      return {
        needsUpdate: true,
        reason: 'evaluation_outdated',
        debug: { ...debug, evaluationOutdated: true }
      };
    }

    // Layer 1: Flag check
    if (!evaluation.metadata?.isLatest) {
      return {
        needsUpdate: true,
        reason: 'flag_outdated',
        debug: { ...debug, flagCheck: 'failed' }
      };
    }

    // Layer 2: Task count check
    const currentEvaluatedCount = tasks.filter(t => t.evaluationId).length;
    debug.taskCountCheck = {
      stored: evaluation.metadata?.evaluatedTaskCount,
      current: currentEvaluatedCount
    };

    if (currentEvaluatedCount !== evaluation.metadata?.evaluatedTaskCount) {
      return {
        needsUpdate: true,
        reason: 'task_count_mismatch',
        debug
      };
    }

    // Layer 3: Checksum verification (based on time since last sync)
    const lastSync = new Date((evaluation.metadata?.lastSyncedAt as string | number) || 0);
    const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    debug.hoursSinceSync = hoursSinceSync;

    const shouldCheckChecksum =
      hoursSinceSync > 48 ? true :
      hoursSinceSync > 24 ? Math.random() < 0.2 :
      Math.random() < 0.05;

    if (shouldCheckChecksum) {
      const currentChecksum = await this.generateChecksum(tasks);
      debug.checksumVerification = {
        stored: evaluation.metadata?.syncChecksum,
        current: currentChecksum,
        match: currentChecksum === evaluation.metadata?.syncChecksum
      };

      if (currentChecksum !== evaluation.metadata?.syncChecksum) {
        return {
          needsUpdate: true,
          reason: 'checksum_mismatch',
          debug
        };
      }
    } else {
      debug.checksumVerification = 'skipped';
    }

    return { needsUpdate: false, reason: 'up_to_date', debug };
  }
}
