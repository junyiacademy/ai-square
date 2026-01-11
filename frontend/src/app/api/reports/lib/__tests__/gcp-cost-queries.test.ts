/**
 * Tests for GCP Cost Queries
 */

import { getGCPCostStats } from "../gcp-cost-queries";

describe("GCP Cost Queries", () => {
  describe("getGCPCostStats", () => {
    it("should return unavailable data source in test environment", async () => {
      const result = await getGCPCostStats();

      expect(result).toBeDefined();
      expect(result.dataSource).toBe("unavailable");
      expect(result.vertexAI.costThisWeek).toBe(0);
      expect(result.vertexAI.breakdown).toEqual([]);
      expect(result.cloudRun.costThisWeek).toBe(0);
      expect(result.cloudSQL.costThisWeek).toBe(0);
      expect(result.totalGCPCost).toBe(0);
    });

    it("should have correct interface structure", async () => {
      const result = await getGCPCostStats();

      // Verify vertexAI structure
      expect(result.vertexAI).toHaveProperty("totalCost");
      expect(result.vertexAI).toHaveProperty("costThisWeek");
      expect(result.vertexAI).toHaveProperty("costLastWeek");
      expect(result.vertexAI).toHaveProperty("weekOverWeekChange");
      expect(result.vertexAI).toHaveProperty("breakdown");
      expect(result.vertexAI).toHaveProperty("currency");

      // Verify cloudRun structure
      expect(result.cloudRun).toHaveProperty("totalCost");
      expect(result.cloudRun).toHaveProperty("costThisWeek");

      // Verify cloudSQL structure
      expect(result.cloudSQL).toHaveProperty("totalCost");
      expect(result.cloudSQL).toHaveProperty("costThisWeek");

      // Verify top-level properties
      expect(result).toHaveProperty("totalGCPCost");
      expect(result).toHaveProperty("dataSource");
      expect(result).toHaveProperty("lastUpdated");

      // Verify lastUpdated is a valid ISO date string
      expect(() => new Date(result.lastUpdated)).not.toThrow();
    });

    it("should return USD as default currency", async () => {
      const result = await getGCPCostStats();

      expect(result.vertexAI.currency).toBe("USD");
    });
  });
});
