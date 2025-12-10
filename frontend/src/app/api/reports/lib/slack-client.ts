/**
 * Slack client for sending weekly reports
 */

export interface SlackResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface SlackAttachment {
  fallback: string;
  title: string;
  image_url: string;
}

/**
 * Send formatted report to Slack
 */
export async function sendToSlack(report: string): Promise<SlackResult> {
  const webhookUrl =
    process.env.SLACK_AISQUARE_WEBHOOK_URL ||
    process.env.SLACK_AISQUARE_DEV_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('Slack webhook URL not configured');
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: report,
        mrkdwn: true
      })
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to send to Slack: ${response.statusText}`
      };
    }

    return {
      success: true,
      message: 'Report sent to Slack successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send formatted report with chart visualizations to Slack
 */
export async function sendToSlackWithCharts(
  report: string,
  charts: {
    registrationChart: string;
    activeUsersChart: string;
    completionRateChart: string;
  }
): Promise<SlackResult> {
  const webhookUrl =
    process.env.SLACK_AISQUARE_WEBHOOK_URL ||
    process.env.SLACK_AISQUARE_DEV_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('Slack webhook URL not configured');
  }

  try {
    const attachments: SlackAttachment[] = [
      {
        fallback: 'Daily Registration Trend Chart',
        title: '📈 Daily Registration Trend',
        image_url: charts.registrationChart
      },
      {
        fallback: 'Daily Active Users Chart',
        title: '👥 Daily Active Users',
        image_url: charts.activeUsersChart
      },
      {
        fallback: 'Completion Rate by Mode Chart',
        title: '📚 Completions by Mode',
        image_url: charts.completionRateChart
      }
    ];

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: report,
        mrkdwn: true,
        attachments
      })
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to send to Slack: ${response.statusText}`
      };
    }

    return {
      success: true,
      message: 'Report with charts sent to Slack successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
