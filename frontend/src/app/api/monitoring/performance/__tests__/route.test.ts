import { NextRequest } from "next/server";
import { GET, DELETE } from "../route";

// Mock performance monitor
jest.mock("@/lib/monitoring/performance-monitor", () => ({
  getPerformanceReport: jest.fn(() => ({
    summary: {
      totalRequests: 100,
      averageResponseTime: 250,
      errorRate: 0.02,
    },
    alerts: [],
    endpoints: {},
  })),
  performanceMonitor: {
    getMetrics: jest.fn((endpoint, method) => {
      if (endpoint === "api/test") {
        return {
          requests: 10,
          averageTime: 200,
          errors: 0,
        };
      }
      return null;
    }),
    clearMetrics: jest.fn(),
  },
}));

describe("/api/monitoring/performance", () => {
  describe("GET", () => {
    it("should return full performance report by default", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/monitoring/performance",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("summary");
      expect(data).toHaveProperty("alerts");
      expect(data).toHaveProperty("endpoints");
      expect(data.summary).toHaveProperty("totalRequests");
      expect(data.summary).toHaveProperty("averageResponseTime");
    });

    it("should return summary format when requested", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/monitoring/performance?format=summary",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("summary");
      expect(data).toHaveProperty("alertCount");
      expect(data).not.toHaveProperty("endpoints");
    });

    it("should return metrics for specific endpoint", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/monitoring/performance?endpoint=api/test&method=GET",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("metrics");
      expect(data.metrics).toHaveProperty("requests", 10);
      expect(data.metrics).toHaveProperty("averageTime", 200);
    });

    it("should return 404 when endpoint metrics not found", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/monitoring/performance?endpoint=nonexistent",
      );
      const response = await GET(request);

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe("No metrics found for this endpoint");
    });

    it("should handle errors gracefully", async () => {
      const mockGetReport =
        require("@/lib/monitoring/performance-monitor").getPerformanceReport;
      mockGetReport.mockImplementationOnce(() => {
        throw new Error("Monitor error");
      });

      const request = new NextRequest(
        "http://localhost:3000/api/monitoring/performance",
      );
      const response = await GET(request);

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe("Failed to get performance metrics");
    });

    it("should default method to GET when not specified", async () => {
      const mockGetMetrics = require("@/lib/monitoring/performance-monitor")
        .performanceMonitor.getMetrics;

      const request = new NextRequest(
        "http://localhost:3000/api/monitoring/performance?endpoint=api/test",
      );
      await GET(request);

      expect(mockGetMetrics).toHaveBeenCalledWith("api/test", "GET");
    });

    it("should use provided method parameter", async () => {
      const mockGetMetrics = require("@/lib/monitoring/performance-monitor")
        .performanceMonitor.getMetrics;

      const request = new NextRequest(
        "http://localhost:3000/api/monitoring/performance?endpoint=api/test&method=POST",
      );
      await GET(request);

      expect(mockGetMetrics).toHaveBeenCalledWith("api/test", "POST");
    });

    it("should return JSON format by default", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/monitoring/performance",
      );
      const response = await GET(request);

      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
    });

    it("should handle missing search params", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/monitoring/performance",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should validate URL parsing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/monitoring/performance?invalid=param",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE", () => {
    it("should clear performance metrics successfully", async () => {
      const response = await DELETE();

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Performance metrics cleared");
    });

    it("should call clearMetrics on performance monitor", async () => {
      const mockClearMetrics = require("@/lib/monitoring/performance-monitor")
        .performanceMonitor.clearMetrics;

      await DELETE();

      expect(mockClearMetrics).toHaveBeenCalled();
    });

    it("should handle clear metrics error", async () => {
      const mockClearMetrics = require("@/lib/monitoring/performance-monitor")
        .performanceMonitor.clearMetrics;
      mockClearMetrics.mockImplementationOnce(() => {
        throw new Error("Clear failed");
      });

      const response = await DELETE();

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe("Failed to clear performance metrics");
    });

    it("should return JSON response", async () => {
      const response = await DELETE();

      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
    });

    it("should handle multiple delete requests", async () => {
      const responses = await Promise.all([DELETE(), DELETE(), DELETE()]);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe("Error handling", () => {
    it("should log errors to console", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const mockGetReport =
        require("@/lib/monitoring/performance-monitor").getPerformanceReport;

      mockGetReport.mockImplementationOnce(() => {
        throw new Error("Test error");
      });

      const request = new NextRequest(
        "http://localhost:3000/api/monitoring/performance",
      );
      await GET(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error getting performance metrics:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it("should handle malformed URLs gracefully", async () => {
      // This test ensures our route can handle various URL formats
      const request = new NextRequest(
        "http://localhost:3000/api/monitoring/performance?endpoint=api%2Ftest%20with%20spaces",
      );
      const response = await GET(request);

      // Should not throw an error
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });
  });
});
