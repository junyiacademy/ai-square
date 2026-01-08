/**
 * Tests for PBL Initialization Service
 */

import { PBLInitializationService } from "../pbl-initialization-service";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import { distributedCacheService } from "@/lib/cache/distributed-cache-service";
import type { IScenario } from "@/types/unified-learning";

// Mock dependencies
jest.mock("@/lib/repositories/base/repository-factory");
jest.mock("@/lib/cache/distributed-cache-service");
jest.mock("fs/promises");
jest.mock("js-yaml");

describe("PBLInitializationService", () => {
  let service: PBLInitializationService;
  let mockScenarioRepo: Record<string, unknown>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock scenario repository
    mockScenarioRepo = {
      findByMode: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(
      mockScenarioRepo,
    );

    service = new PBLInitializationService();
  });

  describe("cleanAllScenarios", () => {
    it("should delete all PBL scenarios when clean flag is true", async () => {
      const mockScenarios = [
        { id: "pbl-1", mode: "pbl" },
        { id: "pbl-2", mode: "pbl" },
      ];

      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(
        mockScenarios,
      );
      (mockScenarioRepo.delete as jest.Mock).mockResolvedValue(undefined);

      const result = await service.cleanAllScenarios();

      expect(mockScenarioRepo.findByMode).toHaveBeenCalledWith("pbl", true);
      expect(mockScenarioRepo.delete).toHaveBeenCalledTimes(2);
      expect(mockScenarioRepo.delete).toHaveBeenCalledWith("pbl-1");
      expect(mockScenarioRepo.delete).toHaveBeenCalledWith("pbl-2");
      expect(result.deleted).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it("should continue deletion even if one scenario fails", async () => {
      const mockScenarios = [
        { id: "pbl-1", mode: "pbl" },
        { id: "pbl-2", mode: "pbl" },
      ];

      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(
        mockScenarios,
      );
      (mockScenarioRepo.delete as jest.Mock)
        .mockRejectedValueOnce(new Error("Delete failed"))
        .mockResolvedValueOnce(undefined);

      const result = await service.cleanAllScenarios();

      expect(mockScenarioRepo.delete).toHaveBeenCalledTimes(2);
      expect(result.deleted).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("pbl-1");
    });

    it("should handle empty scenario list", async () => {
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);

      const result = await service.cleanAllScenarios();

      expect(mockScenarioRepo.delete).not.toHaveBeenCalled();
      expect(result.deleted).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("scanScenarioDirectories", () => {
    it("should scan and return scenario directories", async () => {
      const fs = require("fs/promises");

      // Mock directory listing
      fs.readdir.mockResolvedValueOnce(["scenario1", "scenario2", "_template"]);
      fs.stat.mockImplementation((path: string) => {
        if (path.includes("_template")) {
          return Promise.resolve({ isDirectory: () => false });
        }
        return Promise.resolve({ isDirectory: () => true });
      });
      fs.readdir.mockResolvedValueOnce([
        "scenario1_en.yaml",
        "scenario1_zh.yaml",
      ]);
      fs.readdir.mockResolvedValueOnce(["scenario2_en.yaml"]);

      const result = await service.scanScenarioDirectories();

      expect(result).toHaveLength(2);
      expect(result[0].directory).toBe("scenario1");
      expect(result[0].languageFiles.size).toBe(2);
      expect(result[1].directory).toBe("scenario2");
      expect(result[1].languageFiles.size).toBe(1);
    });

    it("should skip directories starting with underscore", async () => {
      const fs = require("fs/promises");

      fs.readdir.mockResolvedValueOnce(["_template", "scenario1"]);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.readdir.mockResolvedValueOnce(["scenario1_en.yaml"]);

      const result = await service.scanScenarioDirectories();

      expect(result).toHaveLength(1);
      expect(result[0].directory).toBe("scenario1");
    });

    it("should skip directories with no YAML files", async () => {
      const fs = require("fs/promises");

      fs.readdir.mockResolvedValueOnce(["scenario1", "scenario2"]);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.readdir.mockResolvedValueOnce(["scenario1_en.yaml"]);
      fs.readdir.mockResolvedValueOnce(["readme.txt"]);

      const result = await service.scanScenarioDirectories();

      expect(result).toHaveLength(1);
      expect(result[0].directory).toBe("scenario1");
    });
  });

  describe("buildMultilingualScenario", () => {
    it("should build scenario with multilingual content", async () => {
      const fs = require("fs/promises");
      const yaml = require("js-yaml");

      const languageFiles = new Map([
        ["en", "/path/to/scenario_en.yaml"],
        ["zh", "/path/to/scenario_zh.yaml"],
      ]);

      const enData = {
        scenario_info: {
          id: "test-scenario",
          title: "Test Scenario",
          description: "English description",
          difficulty: "intermediate",
          estimated_duration: 60,
          target_domains: ["domain1"],
          prerequisites: ["prereq1"],
          learning_objectives: ["objective1"],
        },
        tasks: [
          {
            id: "task1",
            title: "Task 1",
            type: "chat",
          },
        ],
      };

      const zhData = {
        scenario_info: {
          id: "test-scenario",
          title: "測試場景",
          description: "中文描述",
        },
        tasks: [
          {
            id: "task1",
            title: "任務 1",
          },
        ],
      };

      // Mock readFile to return data in correct order based on file path
      fs.readFile.mockImplementation((filePath: string) => {
        if (filePath.includes("_en.yaml")) {
          return Promise.resolve(JSON.stringify(enData));
        } else if (filePath.includes("_zh.yaml")) {
          return Promise.resolve(JSON.stringify(zhData));
        }
        return Promise.resolve("{}");
      });

      // Mock yaml.load to return parsed data based on input
      yaml.load.mockImplementation((content: string) => {
        const parsed = JSON.parse(content);
        return parsed;
      });

      const result = await service.buildMultilingualScenario(
        "test-dir",
        languageFiles,
      );

      expect(result).toBeDefined();
      expect(result.sourceId).toBe("test-scenario");
      expect(result.title.en).toBe("Test Scenario");
      expect(result.title.zh).toBe("測試場景");
      expect(result.description.en).toBe("English description");
      expect(result.description.zh).toBe("中文描述");
      expect(result.taskTemplates).toHaveLength(1);
      expect(result.taskTemplates[0].title.en).toBe("Task 1");
      expect(result.taskTemplates[0].title.zh).toBe("任務 1");
    });

    it("should fallback to English if language version missing", async () => {
      const fs = require("fs/promises");
      const yaml = require("js-yaml");

      const languageFiles = new Map([["en", "/path/to/scenario_en.yaml"]]);

      const enData = {
        scenario_info: {
          id: "test-scenario",
          title: "Test Scenario",
          description: "English description",
          difficulty: "beginner",
          estimated_duration: 30,
          target_domains: [],
        },
        tasks: [],
      };

      fs.readFile.mockResolvedValue(JSON.stringify(enData));
      yaml.load.mockReturnValue(enData);

      const result = await service.buildMultilingualScenario(
        "test-dir",
        languageFiles,
      );

      expect(result.title.en).toBe("Test Scenario");
      expect(Object.keys(result.title)).toHaveLength(1);
    });

    it("should throw error if scenario_info.id is missing", async () => {
      const fs = require("fs/promises");
      const yaml = require("js-yaml");

      const languageFiles = new Map([["en", "/path/to/scenario_en.yaml"]]);

      const invalidData = {
        scenario_info: {
          title: "Test Scenario",
          // Missing id
        },
      };

      fs.readFile.mockResolvedValue(JSON.stringify(invalidData));
      yaml.load.mockReturnValue(invalidData);

      await expect(
        service.buildMultilingualScenario("test-dir", languageFiles),
      ).rejects.toThrow();
    });
  });

  describe("createOrUpdateScenario", () => {
    it("should create new scenario if not exists", async () => {
      const scenarioData: Omit<IScenario, "id"> = {
        mode: "pbl" as const,
        sourceId: "new-scenario",
        title: { en: "New Scenario" },
        description: { en: "Test" },
        status: "active",
        version: "1.0.0",
        sourceType: "yaml",
        sourcePath: "test",
        sourceMetadata: {},
        objectives: {},
        difficulty: "beginner",
        estimatedMinutes: 60,
        prerequisites: [],
        taskTemplates: [],
        xpRewards: {},
        unlockRequirements: {},
        discoveryData: {},
        assessmentData: {},
        pblData: {},
        aiModules: {},
        resources: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.create as jest.Mock).mockResolvedValue({
        id: "new-id",
        ...scenarioData,
      });

      const result = await service.createOrUpdateScenario(scenarioData, false);

      expect(mockScenarioRepo.create).toHaveBeenCalledWith(scenarioData);
      expect(result.action).toBe("created");
      expect(result.scenario?.id).toBe("new-id");
    });

    it("should skip existing scenario if force is false", async () => {
      const scenarioData: Omit<IScenario, "id"> = {
        mode: "pbl" as const,
        sourceId: "existing-scenario",
        title: { en: "Existing Scenario" },
        description: { en: "Test" },
        status: "active",
        version: "1.0.0",
        sourceType: "yaml",
        sourcePath: "test",
        sourceMetadata: {},
        objectives: {},
        difficulty: "beginner",
        estimatedMinutes: 60,
        prerequisites: [],
        taskTemplates: [],
        xpRewards: {},
        unlockRequirements: {},
        discoveryData: {},
        assessmentData: {},
        pblData: {},
        aiModules: {},
        resources: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const existingScenario = {
        id: "existing-id",
        sourceId: "existing-scenario",
      };

      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([
        existingScenario,
      ]);

      const result = await service.createOrUpdateScenario(scenarioData, false);

      expect(mockScenarioRepo.create).not.toHaveBeenCalled();
      expect(mockScenarioRepo.update).not.toHaveBeenCalled();
      expect(result.action).toBe("skipped");
    });

    it("should update existing scenario if force is true", async () => {
      const scenarioData: Omit<IScenario, "id"> = {
        mode: "pbl" as const,
        sourceId: "existing-scenario",
        title: { en: "Updated Scenario" },
        description: { en: "Test" },
        status: "active",
        version: "1.0.0",
        sourceType: "yaml",
        sourcePath: "test",
        sourceMetadata: {},
        objectives: {},
        difficulty: "beginner",
        estimatedMinutes: 60,
        prerequisites: [],
        taskTemplates: [],
        xpRewards: {},
        unlockRequirements: {},
        discoveryData: {},
        assessmentData: {},
        pblData: {},
        aiModules: {},
        resources: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const existingScenario = {
        id: "existing-id",
        sourceId: "existing-scenario",
      };

      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([
        existingScenario,
      ]);
      (mockScenarioRepo.update as jest.Mock).mockResolvedValue({
        id: "existing-id",
        ...scenarioData,
      });

      const result = await service.createOrUpdateScenario(scenarioData, true);

      expect(mockScenarioRepo.update).toHaveBeenCalledWith(
        "existing-id",
        scenarioData,
      );
      expect(result.action).toBe("updated");
    });
  });

  describe("clearPBLCaches", () => {
    it("should clear all PBL-related caches", async () => {
      const mockKeys = [
        "scenarios:by-mode:pbl",
        "pbl:scenarios:1",
        "pbl:scenarios:2",
        "scenarios:all",
        "other:cache:key",
      ];

      (distributedCacheService.getAllKeys as jest.Mock).mockResolvedValue(
        mockKeys,
      );
      (distributedCacheService.delete as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await service.clearPBLCaches();

      expect(distributedCacheService.delete).toHaveBeenCalledWith(
        "scenarios:by-mode:pbl",
      );
      expect(distributedCacheService.delete).toHaveBeenCalledWith(
        "pbl:scenarios:*",
      );

      // Should delete PBL-related keys
      expect(distributedCacheService.delete).toHaveBeenCalledWith(
        "scenarios:by-mode:pbl",
      );
      expect(distributedCacheService.delete).toHaveBeenCalledWith(
        "pbl:scenarios:1",
      );
      expect(distributedCacheService.delete).toHaveBeenCalledWith(
        "pbl:scenarios:2",
      );
      expect(distributedCacheService.delete).toHaveBeenCalledWith(
        "scenarios:all",
      );

      // Should not delete unrelated keys
      const deleteCalls = (distributedCacheService.delete as jest.Mock).mock
        .calls;
      const deletedKeys = deleteCalls.map((call) => call[0]);
      expect(deletedKeys).not.toContain("other:cache:key");

      expect(result.cleared).toBeGreaterThanOrEqual(4);
    });

    it("should handle cache clearing errors gracefully", async () => {
      (distributedCacheService.getAllKeys as jest.Mock).mockRejectedValue(
        new Error("Cache error"),
      );

      const result = await service.clearPBLCaches();

      expect(result.cleared).toBe(0);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("initializePBLScenarios", () => {
    it("should initialize scenarios from YAML files", async () => {
      const fs = require("fs/promises");
      const yaml = require("js-yaml");

      // Mock directory scanning
      fs.readdir.mockResolvedValueOnce(["scenario1"]);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.readdir.mockResolvedValueOnce(["scenario1_en.yaml"]);

      // Mock YAML content
      const yamlData = {
        scenario_info: {
          id: "scenario1",
          title: "Scenario 1",
          description: "Test scenario",
          difficulty: "beginner",
          estimated_duration: 60,
          target_domains: [],
        },
        tasks: [],
      };

      fs.readFile.mockResolvedValue(JSON.stringify(yamlData));
      yaml.load.mockReturnValue(yamlData);

      // Mock repository
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.create as jest.Mock).mockResolvedValue({
        id: "new-id",
        ...yamlData,
      });

      // Mock cache service
      (distributedCacheService.getAllKeys as jest.Mock).mockResolvedValue([]);
      (distributedCacheService.delete as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await service.initializePBLScenarios({
        force: false,
        clean: false,
      });

      expect(result.scanned).toBe(1);
      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should clean scenarios before initialization if clean flag is true", async () => {
      const fs = require("fs/promises");

      // Mock cleaning
      const mockScenarios = [{ id: "old-scenario", mode: "pbl" }];
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(
        mockScenarios,
      );
      (mockScenarioRepo.delete as jest.Mock).mockResolvedValue(undefined);

      // Mock empty directory (no new scenarios to create)
      fs.readdir.mockResolvedValueOnce([]);

      const result = await service.initializePBLScenarios({
        force: false,
        clean: true,
      });

      expect(mockScenarioRepo.delete).toHaveBeenCalledWith("old-scenario");
      expect(result.scanned).toBe(0);
    });
  });
});
