/**
 * Unit tests for weekly report API endpoint
 * TDD: Red → Green → Refactor
 */

import { POST } from "../route";
import { NextRequest } from "next/server";
import { getPool } from "@/lib/db/get-pool";
import * as dbQueries from "../../lib/db-queries";
import * as reportFormatter from "../../lib/report-formatter";
import * as slackClient from "../../lib/slack-client";
import * as aiInsights from "../../lib/ai-insights";
import * as chartGenerator from "../../lib/chart-generator";

// Mock dependencies
jest.mock("@/lib/db/get-pool");
jest.mock("../../lib/db-queries");
jest.mock("../../lib/report-formatter");
jest.mock("../../lib/slack-client");
jest.mock("../../lib/ai-insights");
jest.mock("../../lib/chart-generator");

describe("Weekly Report API Route", () => {
  let mockPool: any;

  const mockStats: dbQueries.WeeklyStats = {
    userGrowth: {
      totalUsers: 394,
      newThisWeek: 142,
      newLastWeek: 135,
      weekOverWeekGrowth: 5.2,
      dailyTrend: [20, 23, 29, 34, 20, 8, 13],
      avgPerDay: 20.3,
      weeklyTrend: [
        { weekLabel: "11/04", value: 110 },
        { weekLabel: "11/11", value: 125 },
        { weekLabel: "11/18", value: 135 },
        { weekLabel: "11/25", value: 130 },
        { weekLabel: "12/02", value: 142 },
        { weekLabel: "12/09", value: 150 },
        { weekLabel: "12/16", value: 145 },
        { weekLabel: "12/23", value: 152 },
      ],
    },
    engagement: {
      weeklyActiveUsers: 245,
      dailyAvgActive: 85,
      retentionRate: 45.0,
      activeRate: 62.2,
      weeklyActiveTrend: [
        { weekLabel: "11/04", value: 200 },
        { weekLabel: "11/11", value: 215 },
        { weekLabel: "11/18", value: 230 },
        { weekLabel: "11/25", value: 220 },
        { weekLabel: "12/02", value: 245 },
        { weekLabel: "12/09", value: 250 },
        { weekLabel: "12/16", value: 255 },
        { weekLabel: "12/23", value: 260 },
      ],
    },
    learning: {
      assessmentCompletions: 234,
      pblCompletions: 89,
      discoveryCompletions: 156,
      totalCompletions: 479,
      completionRate: 78.5,
      topContent: [],
    },
    // systemHealth: undefined - real monitoring not yet integrated
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);
    (dbQueries.getWeeklyStats as jest.Mock).mockResolvedValue(mockStats);
    (reportFormatter.formatWeeklyReport as jest.Mock).mockReturnValue(
      "Mock report",
    );
    (slackClient.sendToSlackWithCharts as jest.Mock).mockResolvedValue({
      success: true,
      message: "Report sent successfully",
    });
    // Mock AI insights to return null in test environment (graceful degradation)
    (aiInsights.generateAIInsights as jest.Mock).mockResolvedValue(null);
    // Mock chart generation
    (chartGenerator.generateWeeklyCharts as jest.Mock).mockReturnValue({
      registrationChart: "https://quickchart.io/chart?c=mock-registration",
      activeUsersChart: "https://quickchart.io/chart?c=mock-active-users",
      completionRateChart: "https://quickchart.io/chart?c=mock-completion-rate",
    });
  });

  describe("POST /api/reports/weekly", () => {
    it("should generate and send weekly report successfully", async () => {
      // Arrange
      const request = new NextRequest(
        "http://localhost:3000/api/reports/weekly",
        {
          method: "POST",
        },
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("sent successfully");
    });

    it("should call database queries to get statistics", async () => {
      // Arrange
      const request = new NextRequest(
        "http://localhost:3000/api/reports/weekly",
        {
          method: "POST",
        },
      );

      // Act
      await POST(request);

      // Assert
      expect(dbQueries.getWeeklyStats).toHaveBeenCalledWith(mockPool);
    });

    it("should format report with statistics and AI insights", async () => {
      // Arrange
      const request = new NextRequest(
        "http://localhost:3000/api/reports/weekly",
        {
          method: "POST",
        },
      );

      // Act
      await POST(request);

      // Assert
      expect(reportFormatter.formatWeeklyReport).toHaveBeenCalledWith(
        mockStats,
        null,
      );
    });

    it("should send formatted report with charts to Slack", async () => {
      // Arrange
      const request = new NextRequest(
        "http://localhost:3000/api/reports/weekly",
        {
          method: "POST",
        },
      );

      // Act
      await POST(request);

      // Assert
      expect(slackClient.sendToSlackWithCharts).toHaveBeenCalledWith(
        "Mock report",
        {
          registrationChart: "https://quickchart.io/chart?c=mock-registration",
          activeUsersChart: "https://quickchart.io/chart?c=mock-active-users",
          completionRateChart:
            "https://quickchart.io/chart?c=mock-completion-rate",
        },
      );
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      (dbQueries.getWeeklyStats as jest.Mock).mockRejectedValueOnce(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/reports/weekly",
        {
          method: "POST",
        },
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Database error");
    });

    it("should handle Slack sending errors gracefully", async () => {
      // Arrange
      (slackClient.sendToSlackWithCharts as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: "Slack error",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/reports/weekly",
        {
          method: "POST",
        },
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Slack error");
    });

    it("should return statistics in response", async () => {
      // Arrange
      const request = new NextRequest(
        "http://localhost:3000/api/reports/weekly",
        {
          method: "POST",
        },
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(data.stats).toBeDefined();
      expect(data.stats.userGrowth.totalUsers).toBe(394);
    });
  });
});
