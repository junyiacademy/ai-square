/**
 * Weekly Report API Endpoint
 * POST /api/reports/weekly
 *
 * Generates and sends weekly statistics report to Slack
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/get-pool';
import { getWeeklyStats } from '../lib/db-queries';
import { formatWeeklyReport } from '../lib/report-formatter';
import { sendToSlack } from '../lib/slack-client';

export async function POST(_request: NextRequest) {
  try {
    // Get database connection
    const pool = getPool();

    // Fetch weekly statistics
    const stats = await getWeeklyStats(pool);

    // Format report
    const report = formatWeeklyReport(stats);

    // Send to Slack
    const result = await sendToSlack(report);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send report to Slack'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Weekly report sent successfully',
      stats
    });
  } catch (error) {
    console.error('Error generating weekly report:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
