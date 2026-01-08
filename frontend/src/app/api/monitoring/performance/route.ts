import { NextRequest, NextResponse } from "next/server";
import {
  getPerformanceReport,
  performanceMonitor,
} from "@/lib/monitoring/performance-monitor";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");
    const method = searchParams.get("method") || "GET";
    const format = searchParams.get("format") || "json";

    if (endpoint) {
      // Get metrics for specific endpoint
      const metrics = performanceMonitor.getMetrics(endpoint, method);
      if (!metrics) {
        return NextResponse.json(
          { error: "No metrics found for this endpoint" },
          { status: 404 },
        );
      }

      return NextResponse.json({ metrics });
    }

    // Get full performance report
    const report = getPerformanceReport();

    if (format === "summary") {
      return NextResponse.json({
        summary: report.summary,
        alertCount: report.alerts.length,
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error getting performance metrics:", error);
    return NextResponse.json(
      { error: "Failed to get performance metrics" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    performanceMonitor.clearMetrics();
    return NextResponse.json({
      success: true,
      message: "Performance metrics cleared",
    });
  } catch (error) {
    console.error("Error clearing performance metrics:", error);
    return NextResponse.json(
      { error: "Failed to clear performance metrics" },
      { status: 500 },
    );
  }
}
