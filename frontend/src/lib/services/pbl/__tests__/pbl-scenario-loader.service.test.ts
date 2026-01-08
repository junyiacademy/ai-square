/**
 * Tests for PBLScenarioLoaderService
 * Handles loading and processing PBL scenarios from database
 */

import { PBLScenarioLoaderService } from "../pbl-scenario-loader.service";
import type { IScenario } from "@/types/unified-learning";

// Mock dependencies
jest.mock("@/lib/repositories/base/repository-factory", () => ({
  repositoryFactory: {
    getScenarioRepository: jest.fn(() => ({
      findByMode: jest.fn(),
    })),
  },
}));

jest.mock("@/lib/services/scenario-index-service", () => ({
  scenarioIndexService: {
    buildIndex: jest.fn(),
  },
}));

describe("PBLScenarioLoaderService", () => {
  let service: PBLScenarioLoaderService;

  beforeEach(() => {
    service = new PBLScenarioLoaderService();
    jest.clearAllMocks();
  });

  describe("loadScenarios", () => {
    it("should load and process scenarios from database", async () => {
      const mockScenarios: Partial<IScenario>[] = [
        {
          id: "uuid-1",
          sourceId: "ai-job-search",
          title: { en: "AI Job Search", zhTW: "AI 職涯探索" },
          description: {
            en: "Learn AI for job search",
            zhTW: "學習使用 AI 尋找工作",
          },
          difficulty: "intermediate",
          estimatedMinutes: 60,
          metadata: {
            yamlId: "ai-job-search",
            targetDomains: ["engaging_with_ai"],
            estimatedDuration: 60,
          },
          taskTemplates: [
            { id: "task-1", title: { en: "Task 1" }, type: "interactive" },
            { id: "task-2", title: { en: "Task 2" }, type: "reflection" },
          ], // 2 tasks
          status: "active",
          mode: "pbl",
        },
      ];

      const { repositoryFactory } =
        await import("@/lib/repositories/base/repository-factory");
      const mockFindByMode = jest.fn().mockResolvedValue(mockScenarios);
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue({
        findByMode: mockFindByMode,
      });

      const result = await service.loadScenarios("en");

      expect(mockFindByMode).toHaveBeenCalledWith("pbl");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "uuid-1",
        yamlId: "ai-job-search",
        sourceType: "pbl",
        title: "AI Job Search",
        description: "Learn AI for job search",
        difficulty: "intermediate",
        estimatedDuration: 60,
        targetDomains: ["engaging_with_ai"],
        taskCount: 2,
        isAvailable: true,
      });
    });

    it("should process scenarios with Traditional Chinese language", async () => {
      const mockScenarios: Partial<IScenario>[] = [
        {
          id: "uuid-1",
          sourceId: "test",
          title: { en: "Test", zhTW: "測試" },
          description: { en: "Test description", zhTW: "測試說明" },
          metadata: {},
        },
      ];

      const { repositoryFactory } =
        await import("@/lib/repositories/base/repository-factory");
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue({
        findByMode: jest.fn().mockResolvedValue(mockScenarios),
      });

      const result = await service.loadScenarios("zhTW");

      expect(result[0].title).toBe("測試");
      expect(result[0].description).toBe("測試說明");
    });

    it("should handle string titles and descriptions", async () => {
      const mockScenarios: Partial<IScenario>[] = [
        {
          id: "uuid-1",
          sourceId: "test",
          title: "Simple Title" as unknown as Record<string, string>,
          description: "Simple Description" as unknown as Record<
            string,
            string
          >,
          metadata: {},
        },
      ];

      const { repositoryFactory } =
        await import("@/lib/repositories/base/repository-factory");
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue({
        findByMode: jest.fn().mockResolvedValue(mockScenarios),
      });

      const result = await service.loadScenarios("en");

      expect(result[0].title).toBe("Simple Title");
      expect(result[0].description).toBe("Simple Description");
    });

    it("should fallback to English when language not available", async () => {
      const mockScenarios: Partial<IScenario>[] = [
        {
          id: "uuid-1",
          sourceId: "test",
          title: { en: "English Title" } as Record<string, string>,
          description: { en: "English Description" } as Record<string, string>,
          metadata: {},
        },
      ];

      const { repositoryFactory } =
        await import("@/lib/repositories/base/repository-factory");
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue({
        findByMode: jest.fn().mockResolvedValue(mockScenarios),
      });

      const result = await service.loadScenarios("fr"); // French not available

      expect(result[0].title).toBe("English Title");
      expect(result[0].description).toBe("English Description");
    });

    it("should extract targetDomains from multiple sources", async () => {
      const mockScenarios: Partial<IScenario>[] = [
        {
          id: "uuid-1",
          sourceId: "test",
          title: "Test" as unknown as Record<string, string>,
          description: "Test" as unknown as Record<string, string>,
          metadata: {
            targetDomains: ["engaging_with_ai", "creating_with_ai"],
          },
        },
      ];

      const { repositoryFactory } =
        await import("@/lib/repositories/base/repository-factory");
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue({
        findByMode: jest.fn().mockResolvedValue(mockScenarios),
      });

      const result = await service.loadScenarios("en");

      expect(result[0].targetDomains).toEqual([
        "engaging_with_ai",
        "creating_with_ai",
      ]);
      expect(result[0].targetDomain).toEqual([
        "engaging_with_ai",
        "creating_with_ai",
      ]);
      expect(result[0].domains).toEqual([
        "engaging_with_ai",
        "creating_with_ai",
      ]);
    });

    it("should handle empty scenario list gracefully", async () => {
      const { repositoryFactory } =
        await import("@/lib/repositories/base/repository-factory");
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue({
        findByMode: jest.fn().mockResolvedValue([]),
      });

      const result = await service.loadScenarios("en");

      expect(result).toEqual([]);
    });

    it("should handle repository errors gracefully", async () => {
      const { repositoryFactory } =
        await import("@/lib/repositories/base/repository-factory");
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue({
        findByMode: jest.fn().mockRejectedValue(new Error("Database error")),
      });

      const result = await service.loadScenarios("en");

      expect(result).toEqual([]);
    });

    it("should handle scenario processing errors gracefully", async () => {
      const mockScenarios: Partial<IScenario>[] = [
        {
          id: "uuid-1",
          sourceId: "test",
          title: "Good Scenario" as unknown as Record<string, string>,
          description: "Good" as unknown as Record<string, string>,
          metadata: {},
        },
        {
          id: "uuid-2",
          // Missing required fields - will cause error
          sourceId: null as unknown as string,
          title: null as unknown as Record<string, string>,
          description: null as unknown as Record<string, string>,
        },
        {
          id: "uuid-3",
          sourceId: "test-2",
          title: "Another Good Scenario" as unknown as Record<string, string>,
          description: "Good 2" as unknown as Record<string, string>,
          metadata: {},
        },
      ];

      const { repositoryFactory } =
        await import("@/lib/repositories/base/repository-factory");
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue({
        findByMode: jest.fn().mockResolvedValue(mockScenarios),
      });

      const result = await service.loadScenarios("en");

      // Should skip the bad scenario and continue processing
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("should build scenario index after loading", async () => {
      const mockScenarios: Partial<IScenario>[] = [
        {
          id: "uuid-1",
          sourceId: "test",
          title: "Test" as unknown as Record<string, string>,
          description: "Test" as unknown as Record<string, string>,
          metadata: {},
        },
      ];

      const { repositoryFactory } =
        await import("@/lib/repositories/base/repository-factory");
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue({
        findByMode: jest.fn().mockResolvedValue(mockScenarios),
      });

      const { scenarioIndexService } =
        await import("@/lib/services/scenario-index-service");

      await service.loadScenarios("en");

      expect(scenarioIndexService.buildIndex).toHaveBeenCalledWith(
        mockScenarios,
      );
    });
  });

  describe("getScenarioEmoji", () => {
    it("should return correct emoji for known scenarios", () => {
      expect(service.getScenarioEmoji("ai-job-search")).toBe("💼");
      expect(service.getScenarioEmoji("ai-education-design")).toBe("🎓");
      expect(service.getScenarioEmoji("ai-stablecoin-trading")).toBe("₿");
      expect(service.getScenarioEmoji("ai-robotics-development")).toBe("🤖");
      expect(service.getScenarioEmoji("high-school-climate-change")).toBe("🌍");
    });

    it("should return default emoji for unknown scenarios", () => {
      expect(service.getScenarioEmoji("unknown-scenario")).toBe("🤖");
      expect(service.getScenarioEmoji("")).toBe("🤖");
    });
  });
});
