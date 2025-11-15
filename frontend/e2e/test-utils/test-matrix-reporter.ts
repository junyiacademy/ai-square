/**
 * Test Matrix Reporter for 3x5 E2E Tests
 * Tracks and reports test results in a clear matrix format
 */

export interface StageResult {
  stage: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'PENDING';
  error?: string;
  screenshot?: string;
  duration?: number;
  details?: any;
}

export interface ModeResults {
  mode: string;
  stages: StageResult[];
  totalDuration: number;
  passCount: number;
  failCount: number;
  skipCount: number;
}

export class TestMatrixReporter {
  private results: Map<string, ModeResults> = new Map();
  private startTime: number = Date.now();

  constructor() {
    // Initialize modes
    ['PBL', 'Assessment', 'Discovery'].forEach(mode => {
      this.results.set(mode, {
        mode,
        stages: [],
        totalDuration: 0,
        passCount: 0,
        failCount: 0,
        skipCount: 0
      });
    });
  }

  /**
   * Record a stage result
   */
  recordStage(mode: string, stage: string, status: 'PASS' | 'FAIL' | 'SKIP', error?: string, details?: any) {
    const modeResult = this.results.get(mode);
    if (!modeResult) return;

    const stageResult: StageResult = {
      stage,
      status,
      error,
      details,
      duration: Date.now() - this.startTime
    };

    modeResult.stages.push(stageResult);

    // Update counters
    switch (status) {
      case 'PASS':
        modeResult.passCount++;
        break;
      case 'FAIL':
        modeResult.failCount++;
        break;
      case 'SKIP':
        modeResult.skipCount++;
        break;
    }

    modeResult.totalDuration = Date.now() - this.startTime;
  }

  /**
   * Skip remaining stages after a failure
   */
  skipRemainingStages(mode: string, fromStage: number) {
    const stages = ['List', 'Create', 'Tasks', 'Submit', 'Complete'];
    for (let i = fromStage; i < stages.length; i++) {
      this.recordStage(mode, `Stage${i + 1}_${stages[i]}`, 'SKIP', 'Skipped due to previous failure');
    }
  }

  /**
   * Generate matrix report
   */
  generateMatrix(): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('=' .repeat(80));
    lines.push('                    E2E TEST MATRIX RESULTS (3x5)');
    lines.push('=' .repeat(80));
    lines.push('');

    // Header
    lines.push('Mode'.padEnd(12) + '| Stage 1    | Stage 2    | Stage 3    | Stage 4    | Stage 5    |');
    lines.push('-'.repeat(80));

    // Results for each mode
    ['PBL', 'Assessment', 'Discovery'].forEach(mode => {
      const modeResult = this.results.get(mode);
      if (!modeResult) return;

      let row = mode.padEnd(12) + '|';

      // Ensure we have 5 stages
      const stages = modeResult.stages;
      for (let i = 0; i < 5; i++) {
        const stage = stages[i];
        if (stage) {
          const statusIcon = this.getStatusIcon(stage.status);
          row += ` ${statusIcon.padEnd(10)} |`;
        } else {
          row += ` ⏳ PENDING |`;
        }
      }

      lines.push(row);
    });

    lines.push('-'.repeat(80));

    // Summary
    let totalPass = 0, totalFail = 0, totalSkip = 0;
    this.results.forEach(result => {
      totalPass += result.passCount;
      totalFail += result.failCount;
      totalSkip += result.skipCount;
    });

    lines.push('');
    lines.push('Summary:');
    lines.push(`  ✅ Passed: ${totalPass}`);
    lines.push(`  ❌ Failed: ${totalFail}`);
    lines.push(`  ⏭️  Skipped: ${totalSkip}`);
    lines.push(`  Total: ${totalPass + totalFail + totalSkip}/15`);

    // Failed details
    if (totalFail > 0) {
      lines.push('');
      lines.push('Failed Stages:');
      this.results.forEach(result => {
        result.stages.forEach(stage => {
          if (stage.status === 'FAIL') {
            lines.push(`  [${result.mode} - ${stage.stage}]: ${stage.error || 'Unknown error'}`);
          }
        });
      });
    }

    lines.push('');
    lines.push('=' .repeat(80));

    return lines.join('\n');
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'PASS': return '✅ PASS';
      case 'FAIL': return '❌ FAIL';
      case 'SKIP': return '⏭️  SKIP';
      default: return '⏳ PEND';
    }
  }

  /**
   * Export results as JSON
   */
  exportJSON(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      results: Array.from(this.results.values())
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get specific mode results
   */
  getModeResults(mode: string): ModeResults | undefined {
    return this.results.get(mode);
  }

  /**
   * Check if all tests passed
   */
  allPassed(): boolean {
    let allPass = true;
    this.results.forEach(result => {
      if (result.failCount > 0 || result.skipCount > 0) {
        allPass = false;
      }
    });
    return allPass;
  }
}
