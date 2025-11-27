/**
 * Slack client for sending weekly reports
 */

export interface SlackResult {
  success: boolean;
  message?: string;
  error?: string;
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
