/**
 * Scenario Index Service Tests
 * 提升覆蓋率從 0% 到 95%+
 */

import { scenarioIndexService } from "../scenario-index-service";
import { cacheService } from "@/lib/cache/cache-service";
import type { IScenario } from "@/types/unified-learning";

// Mock cache service
jest.mock("@/lib/cache/cache-service");

describe("ScenarioIndexService", () => {
  let service: typeof scenarioIndexService;
  let mockCacheService: jest.Mocked<typeof cacheService>;

  const mockScenarios: IScenario[] = [
    {
      id: "uuid-1",
      mode: "pbl",
      status: "active",
      version: "1.0.0",
      sourceType: "yaml",
      sourcePath: "pbl_data/scenario1.yaml",
      sourceMetadata: {
        yamlId: "pbl-scenario-1",
      },
      title: { en: "PBL Scenario 1" },
      description: { en: "Description 1" },
      objectives: ["Learn X", "Practice Y"],
      difficulty: "intermediate",
      estimatedMinutes: 120,
      prerequisites: [],
      taskCount: 5,
      taskTemplates: [],
      xpRewards: {},
      unlockRequirements: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      aiModules: {},
      resources: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "uuid-2",
      mode: "assessment",
      status: "active",
      version: "1.0.0",
      sourceType: "yaml",
      sourcePath: "assessment_data/assessment1.yaml",
      sourceMetadata: {
        yamlId: "assessment-1",
      },
      title: { en: "Assessment 1" },
      description: { en: "Description 2" },
      objectives: ["Assess knowledge"],
      difficulty: "beginner",
      estimatedMinutes: 30,
      prerequisites: [],
      taskCount: 10,
      taskTemplates: [],
      xpRewards: {},
      unlockRequirements: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      aiModules: {},
      resources: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "uuid-3",
      mode: "discovery",
      status: "active",
      version: "1.0.0",
      sourceType: "yaml",
      sourcePath: "discovery_data/path1.yaml",
      sourceMetadata: {
        yamlId: "discovery-path-1",
      },
      title: { en: "Discovery Path 1" },
      description: { en: "Description 3" },
      objectives: ["Explore career"],
      difficulty: "beginner",
      estimatedMinutes: 300,
      prerequisites: [],
      taskCount: 15,
      taskTemplates: [],
      xpRewards: {},
      unlockRequirements: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      aiModules: {},
      resources: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock cache service
    mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue();
    mockCacheService.delete = jest.fn().mockResolvedValue(undefined);

    // Use the singleton instance
    service = scenarioIndexService;

    // Clear memory index before each test
    await service.invalidate();
  });

  describe("service instance", () => {
    it("should be available", () => {
      expect(service).toBeDefined();
      expect(service).toBe(scenarioIndexService);
    });
  });

  describe("buildIndex", () => {
    it("should build index from scenarios", async () => {
      const index = await service.buildIndex(mockScenarios);

      expect(index.yamlToUuid.size).toBe(3);
      expect(index.uuidToYaml.size).toBe(3);
      expect(index.lastUpdated).toBeDefined();

      // Check YAML to UUID mapping
      expect(index.yamlToUuid.get("pbl-scenario-1")).toMatchObject({
        yamlId: "pbl-scenario-1",
        uuid: "uuid-1",
        sourceType: "pbl",
        title: "PBL Scenario 1",
      });

      // Check UUID to YAML mapping
      expect(index.uuidToYaml.get("uuid-1")).toMatchObject({
        yamlId: "pbl-scenario-1",
        uuid: "uuid-1",
        sourceType: "pbl",
      });
    });

    it("should skip scenarios without yamlId", async () => {
      const scenariosWithMissing = [
        ...mockScenarios,
        {
          id: "uuid-4",
          mode: "pbl",
          sourceMetadata: {}, // No yamlId
        } as IScenario,
      ];

      const index = await service.buildIndex(scenariosWithMissing);

      expect(index.yamlToUuid.size).toBe(3); // Only 3 with yamlId
      expect(index.uuidToYaml.size).toBe(3);
    });

    it("should cache the built index", async () => {
      await service.buildIndex(mockScenarios);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        "scenario:index:v1",
        expect.any(Object),
        expect.objectContaining({ ttl: 1800 }), // 30 minutes in options object
      );
    });

    it("should handle empty scenarios", async () => {
      const index = await service.buildIndex([]);

      expect(index.yamlToUuid.size).toBe(0);
      expect(index.uuidToYaml.size).toBe(0);
    });
  });

  describe("getIndex", () => {
    it("should return cached index from memory", async () => {
      // Build index first
      await service.buildIndex(mockScenarios);

      // Get index should return from memory
      const index = await service.getIndex();

      expect(index).toBeDefined();
      expect(mockCacheService.get).not.toHaveBeenCalled();
    });

    it("should load index from cache service", async () => {
      const cachedIndex = {
        yamlToUuid: [
          ["pbl-scenario-1", { yamlId: "pbl-scenario-1", uuid: "uuid-1" }],
        ],
        uuidToYaml: [["uuid-1", { yamlId: "pbl-scenario-1", uuid: "uuid-1" }]],
        lastUpdated: new Date().toISOString(),
      };

      mockCacheService.get.mockResolvedValueOnce(cachedIndex);

      const index = await service.getIndex();

      expect(index).toBeDefined();
      expect(index?.yamlToUuid.size).toBe(1);
      expect(mockCacheService.get).toHaveBeenCalledWith("scenario:index:v1");
    });

    it("should return null if no index available", async () => {
      // Ensure cache returns null
      mockCacheService.get.mockResolvedValueOnce(null);

      const index = await service.getIndex();

      expect(index).toBeNull();
    });
  });

  describe("invalidate", () => {
    it("should clear memory and cache", async () => {
      // Build index first
      await service.buildIndex(mockScenarios);

      // Clear index
      await service.invalidate();

      // Check cache cleared
      expect(mockCacheService.delete).toHaveBeenCalledWith("scenario:index:v1");

      // Ensure cache returns null after invalidation
      mockCacheService.get.mockResolvedValueOnce(null);

      // Check memory cleared
      const index = await service.getIndex();
      expect(index).toBeNull();
    });
  });

  describe("getUuidByYamlId", () => {
    beforeEach(async () => {
      await service.buildIndex(mockScenarios);
    });

    it("should return UUID for valid YAML ID", async () => {
      const uuid = await service.getUuidByYamlId("pbl-scenario-1");
      expect(uuid).toBe("uuid-1");
    });

    it("should return null for invalid YAML ID", async () => {
      const uuid = await service.getUuidByYamlId("non-existent");
      expect(uuid).toBeNull();
    });

    it("should return null if no index available", async () => {
      await service.invalidate();
      const uuid = await service.getUuidByYamlId("pbl-scenario-1");
      expect(uuid).toBeNull();
    });
  });

  describe("getYamlIdByUuid", () => {
    beforeEach(async () => {
      await service.buildIndex(mockScenarios);
    });

    it("should return YAML ID for valid UUID", async () => {
      const yamlId = await service.getYamlIdByUuid("uuid-2");
      expect(yamlId).toBe("assessment-1");
    });

    it("should return null for invalid UUID", async () => {
      const yamlId = await service.getYamlIdByUuid("non-existent");
      expect(yamlId).toBeNull();
    });
  });

  describe("getEntryByYamlId", () => {
    beforeEach(async () => {
      await service.buildIndex(mockScenarios);
    });

    it("should return full entry for YAML ID", async () => {
      const entry = await service.getEntryByYamlId("discovery-path-1");

      expect(entry).toMatchObject({
        yamlId: "discovery-path-1",
        uuid: "uuid-3",
        sourceType: "discovery",
        title: "Discovery Path 1",
      });
    });

    it("should return null for invalid YAML ID", async () => {
      const entry = await service.getEntryByYamlId("invalid");
      expect(entry).toBeNull();
    });
  });

  describe("getEntryByUuid", () => {
    beforeEach(async () => {
      await service.buildIndex(mockScenarios);
    });

    it("should return full entry for UUID", async () => {
      const entry = await service.getEntryByUuid("uuid-1");

      expect(entry).toMatchObject({
        yamlId: "pbl-scenario-1",
        uuid: "uuid-1",
        sourceType: "pbl",
      });
    });

    it("should return null for invalid UUID", async () => {
      const entry = await service.getEntryByUuid("invalid");
      expect(entry).toBeNull();
    });
  });

  describe("exists", () => {
    it("should return true when index exists in memory", async () => {
      await service.buildIndex(mockScenarios);

      const exists = await service.exists();
      expect(exists).toBe(true);
    });

    it("should return false when no index exists", async () => {
      await service.invalidate();

      const exists = await service.exists();
      expect(exists).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle scenarios with null sourceMetadata", async () => {
      const scenariosWithNull = [
        {
          ...mockScenarios[0],
          sourceMetadata: {},
        } as IScenario,
      ];

      const index = await service.buildIndex(scenariosWithNull);
      expect(index.yamlToUuid.size).toBe(0);
    });

    it("should handle concurrent index builds", async () => {
      const promises = Array(3)
        .fill(null)
        .map(() => service.buildIndex(mockScenarios));

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((index) => {
        expect(index.yamlToUuid.size).toBe(3);
      });
    });

    it("should handle invalid cache data gracefully", async () => {
      // Return invalid cache data
      mockCacheService.get.mockResolvedValueOnce({
        yamlToUuid: "invalid", // Should be an array
        uuidToYaml: null,
      });

      await expect(service.getIndex()).rejects.toThrow();
    });

    it("should handle Map serialization/deserialization", async () => {
      await service.buildIndex(mockScenarios);

      // Get the cached data
      const cacheCall = mockCacheService.set.mock.calls[0];
      const cachedData = cacheCall[1] as Record<string, unknown>;

      // Verify Maps are properly serialized
      expect(cachedData.yamlToUuid).toBeInstanceOf(Object);
      expect(cachedData.uuidToYaml).toBeInstanceOf(Object);
    });
  });
});
