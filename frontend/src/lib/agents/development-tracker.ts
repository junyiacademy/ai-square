/**
 * Development Tracker - Simple integration with Slack webhook
 * Tracks development progress and sends summaries
 */

import { createSlackWebhookAgent, type SlackWebhookAgent } from './slack-webhook-agent';

class DevelopmentTracker {
  private agent: SlackWebhookAgent | null;
  private sessionStart: Date;
  private autoSummaryInterval?: NodeJS.Timeout;

  constructor() {
    this.agent = createSlackWebhookAgent();
    this.sessionStart = new Date();
    
    if (!this.agent) {
      console.log('Slack webhook not configured - progress tracking disabled');
    }
  }

  /**
   * Track test execution
   */
  trackTests(passed: number, failed: number, duration: string) {
    if (!this.agent) return;

    this.agent.addProgress({
      taskName: 'Test Execution',
      status: failed === 0 ? 'completed' : 'failed',
      duration,
      details: `${passed} passed, ${failed} failed`,
      metrics: {
        'Tests Passed': passed,
        'Tests Failed': failed,
        'Success Rate (%)': ((passed / (passed + failed)) * 100).toFixed(1)
      },
      errors: failed > 0 ? [`${failed} tests failed`] : undefined
    });
  }

  /**
   * Track build process
   */
  trackBuild(success: boolean, duration: string, bundleSize?: string) {
    if (!this.agent) return;

    this.agent.addProgress({
      taskName: 'Build Process',
      status: success ? 'completed' : 'failed',
      duration,
      details: success ? `Bundle size: ${bundleSize || 'N/A'}` : 'Build failed',
      metrics: bundleSize ? { 'Bundle Size': bundleSize } : undefined,
      errors: success ? undefined : ['Build process failed']
    });
  }

  /**
   * Track TypeScript/ESLint fixes
   */
  trackCodeFixes(type: 'typescript' | 'eslint', fixed: number, remaining: number) {
    if (!this.agent) return;

    const taskName = type === 'typescript' ? 'TypeScript Fixes' : 'ESLint Fixes';
    
    this.agent.addProgress({
      taskName,
      status: remaining === 0 ? 'completed' : 'in_progress',
      details: `Fixed ${fixed} issues, ${remaining} remaining`,
      metrics: {
        'Issues Fixed': fixed,
        'Issues Remaining': remaining,
        'Progress (%)': ((fixed / (fixed + remaining)) * 100).toFixed(1)
      }
    });
  }

  /**
   * Track feature implementation
   */
  trackFeature(featureName: string, status: 'completed' | 'in_progress' | 'failed', details?: string) {
    if (!this.agent) return;

    this.agent.addProgress({
      taskName: `Feature: ${featureName}`,
      status,
      details
    });
  }

  /**
   * Send session summary
   */
  async sendSummary(customMessage?: string) {
    if (!this.agent) return;

    const duration = this.calculateDuration(this.sessionStart);
    
    // Add session info
    await this.agent.sendNotification(
      `Development session completed (Duration: ${duration})`,
      'info'
    );

    // Send work summary
    await this.agent.sendSummary();
    
    // Clear for next session
    this.agent.clearSession();
    this.sessionStart = new Date();
  }

  /**
   * Quick notification
   */
  async notify(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    if (!this.agent) return;
    await this.agent.sendNotification(message, type);
  }

  /**
   * Enable auto-summary every N minutes
   */
  enableAutoSummary(intervalMinutes: number = 60) {
    if (!this.agent) {
      console.warn('Cannot enable auto-summary: Slack not configured');
      return;
    }

    // Clear existing interval
    if (this.autoSummaryInterval) {
      clearInterval(this.autoSummaryInterval);
    }

    // Set new interval
    this.autoSummaryInterval = setInterval(async () => {
      await this.sendSummary();
    }, intervalMinutes * 60 * 1000);

    console.log(`Auto-summary enabled: every ${intervalMinutes} minutes`);
  }

  /**
   * Disable auto-summary
   */
  disableAutoSummary() {
    if (this.autoSummaryInterval) {
      clearInterval(this.autoSummaryInterval);
      this.autoSummaryInterval = undefined;
      console.log('Auto-summary disabled');
    }
  }

  /**
   * Calculate duration string
   */
  private calculateDuration(start: Date): string {
    const ms = new Date().getTime() - start.getTime();
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Export singleton
export const devTracker = new DevelopmentTracker();

// Auto-send summary on process exit (development only)
if (process.env.NODE_ENV === 'development') {
  process.on('SIGINT', async () => {
    console.log('\n📤 Sending development summary to Slack...');
    await devTracker.sendSummary();
    process.exit(0);
  });
}

// Example usage
export const devTrackerExample = async () => {
  // Track test results
  devTracker.trackTests(156, 2, '12s');
  
  // Track build
  devTracker.trackBuild(true, '45s', '2.3MB');
  
  // Track code fixes
  devTracker.trackCodeFixes('typescript', 102, 0);
  devTracker.trackCodeFixes('eslint', 45, 3);
  
  // Track feature
  devTracker.trackFeature('Slack Integration', 'completed', 'Webhook implementation complete');
  
  // Send notification
  await devTracker.notify('Starting deployment...', 'info');
  
  // Send summary
  await devTracker.sendSummary();
};