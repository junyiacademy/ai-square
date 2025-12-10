/**
 * Slack client for sending weekly reports
 */

export interface SlackResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface SlackImageBlock {
  type: 'image';
  image_url: string;
  alt_text: string;
}

export interface SlackHeaderBlock {
  type: 'header';
  text: {
    type: 'plain_text';
    text: string;
  };
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
 * Uses Block Kit format for proper image display
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
    // Build Block Kit blocks for charts
    const blocks: Array<SlackHeaderBlock | SlackImageBlock> = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📈 Daily Registration Trend'
        }
      },
      {
        type: 'image',
        image_url: charts.registrationChart,
        alt_text: 'Daily Registration Trend Chart'
      },
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '👥 Daily Active Users'
        }
      },
      {
        type: 'image',
        image_url: charts.activeUsersChart,
        alt_text: 'Daily Active Users Chart'
      },
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📚 Completions by Mode'
        }
      },
      {
        type: 'image',
        image_url: charts.completionRateChart,
        alt_text: 'Completion Rate by Mode Chart'
      }
    ];

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: report,
        mrkdwn: true,
        blocks
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
