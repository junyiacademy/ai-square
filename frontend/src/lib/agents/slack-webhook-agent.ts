/**
 * Slack Webhook Agent - Simple incoming webhook implementation
 * Uses Slack incoming webhooks for sending messages
 */

export interface WorkProgress {
  taskName: string;
  status: 'completed' | 'in_progress' | 'failed';
  duration?: string;
  details?: string;
  metrics?: Record<string, any>;
  errors?: string[];
}

export class SlackWebhookAgent {
  private webhookUrl: string;
  private workSessions: WorkProgress[] = [];

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  /**
   * Add work progress
   */
  addProgress(progress: WorkProgress): void {
    this.workSessions.push(progress);
  }

  /**
   * Send message to Slack via webhook
   */
  private async sendToSlack(payload: any): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send to Slack:', error);
      throw error;
    }
  }

  /**
   * Send work summary to Slack
   */
  async sendSummary(): Promise<void> {
    if (this.workSessions.length === 0) {
      await this.sendNotification('No work progress to report.', 'info');
      return;
    }

    const completed = this.workSessions.filter(w => w.status === 'completed');
    const inProgress = this.workSessions.filter(w => w.status === 'in_progress');
    const failed = this.workSessions.filter(w => w.status === 'failed');

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🤖 AI Square Work Summary',
          emoji: true
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Generated at: ${new Date().toLocaleString()}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📊 Overview*\n• Total Tasks: ${this.workSessions.length}\n• ✅ Completed: ${completed.length}\n• 🔄 In Progress: ${inProgress.length}\n• ❌ Failed: ${failed.length}`
        }
      }
    ];

    // Add completed tasks
    if (completed.length > 0) {
      const completedText = completed.map(task => {
        let text = `• ${task.taskName}`;
        if (task.duration) text += ` _(${task.duration})_`;
        if (task.details) text += `\n  └─ ${task.details}`;
        return text;
      }).join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*✅ Completed Tasks*\n${completedText}`
        }
      });
    }

    // Add failed tasks
    if (failed.length > 0) {
      const failedText = failed.map(task => {
        let text = `• ${task.taskName}`;
        if (task.errors && task.errors.length > 0) {
          task.errors.forEach(error => {
            text += `\n  └─ Error: ${error}`;
          });
        }
        return text;
      }).join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*❌ Failed Tasks*\n${failedText}`
        }
      });
    }

    // Add metrics if available
    const tasksWithMetrics = this.workSessions.filter(w => w.metrics);
    if (tasksWithMetrics.length > 0) {
      const metricsText = tasksWithMetrics.map(task => {
        const metrics = Object.entries(task.metrics || {})
          .map(([key, value]) => `  • ${key}: ${value}`)
          .join('\n');
        return `*${task.taskName}*\n${metrics}`;
      }).join('\n\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📈 Metrics*\n${metricsText}`
        }
      });
    }

    await this.sendToSlack({ blocks });
  }

  /**
   * Send a simple notification
   */
  async sendNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> {
    const emojis = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    const colors = {
      info: '#36a64f',
      success: '#2eb886',
      warning: '#ffcc00',
      error: '#ff0000'
    };

    await this.sendToSlack({
      attachments: [
        {
          color: colors[type],
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${emojis[type]} ${message}`
              }
            }
          ]
        }
      ]
    });
  }

  /**
   * Clear session
   */
  clearSession(): void {
    this.workSessions = [];
  }
}

// Factory function
export function createSlackWebhookAgent(): SlackWebhookAgent | null {
  // Use development webhook URL if available, otherwise fall back to general webhook
  const webhookUrl = process.env.SLACK_AISQUARE_DEV_WEBHOOK_URL || 
                     process.env.SLACK_WEBHOOK_URL ||
                     process.env.SLACK_AISQUARE_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('No Slack webhook URL configured. Please set one of:');
    console.warn('- SLACK_AISQUARE_DEV_WEBHOOK_URL (for development)');
    console.warn('- SLACK_AISQUARE_WEBHOOK_URL (for production)');
    console.warn('- SLACK_WEBHOOK_URL (legacy)');
    return null;
  }

  return new SlackWebhookAgent(webhookUrl);
}

// Example usage
export const slackWebhookExample = async () => {
  const agent = createSlackWebhookAgent();
  if (!agent) {
    console.log('Please set SLACK_WEBHOOK_URL in your .env.local file');
    console.log('Example: SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX');
    return;
  }

  // Track work (development example)
  agent.addProgress({
    taskName: 'TypeScript Migration',
    status: 'completed',
    duration: '45m',
    details: 'Migrated 156 files to TypeScript',
    metrics: {
      'Files Migrated': 156,
      'Type Errors Fixed': 234,
      'Coverage Improvement (%)': 15.5
    }
  });

  agent.addProgress({
    taskName: 'Unit Tests',
    status: 'completed',
    duration: '12m',
    metrics: {
      'Tests Added': 45,
      'Coverage (%)': 82.5
    }
  });

  agent.addProgress({
    taskName: 'Deployment',
    status: 'failed',
    errors: ['Build failed: Out of memory', 'Retry limit exceeded']
  });

  // Send summary
  await agent.sendSummary();
  
  // Send a quick notification
  await agent.sendNotification('Development session completed!', 'success');
};