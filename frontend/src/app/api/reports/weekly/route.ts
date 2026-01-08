/**
 * Weekly Report API Endpoint
 * POST /api/reports/weekly
 *
 * Generates and sends weekly statistics report to Slack with chart visualizations
 */

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db/get-pool";
import { getWeeklyStats } from "../lib/db-queries";
import { formatWeeklyReport } from "../lib/report-formatter";
import { sendToSlackWithCharts } from "../lib/slack-client";
import { generateAIInsights } from "../lib/ai-insights";
import { generateWeeklyCharts } from "../lib/chart-generator";

export async function POST(_request: NextRequest) {
  try {
    // Get database connection
    const pool = getPool();

    // Fetch weekly statistics
    const stats = await getWeeklyStats(pool);

    // Generate AI insights (non-blocking, graceful degradation)
    const aiInsights = await generateAIInsights(stats);

    // Format report (with optional AI insights)
    const report = formatWeeklyReport(stats, aiInsights);

    // Generate chart visualizations
    const charts = generateWeeklyCharts(stats);

    // Send to Slack with charts
    const result = await sendToSlackWithCharts(report, charts);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to send report to Slack",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Weekly report sent successfully",
      stats,
      aiInsights: aiInsights !== null,
      charts,
    });
  } catch (error) {
    console.error("Error generating weekly report:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
