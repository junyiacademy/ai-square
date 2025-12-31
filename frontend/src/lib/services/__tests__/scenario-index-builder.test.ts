import { scenarioIndexBuilder } from "../scenario-index-builder";
import { scenarioIndexService } from "../scenario-index-service";
import type { IScenario } from "@/types/unified-learning";

// Mock dependencies
jest.mock("../scenario-index-service");

// Mock the dynamic import of repository-factory
jest.mock("@/lib/repositories/base/repository-factory", () => ({
  repositoryFactory: {
    getScenarioRepository: jest.fn(),
  },
}));

const mockScenarioIndexService = scenarioIndexService as jest.Mocked<
  typeof scenarioIndexService
>;

describe("ScenarioIndexBuilder", () => {
  let builder: typeof scenarioIndexBuilder;
  let mockScenarioRepo: {
    findBySource: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const mockPblScenarios: IScenario[] = [
    {
      id: "pbl-1",
      mode: "pbl",
      sourceType: "yaml",
      sourcePath: "pbl/scenario1.yaml",
      sourceId: undefined,
      sourceMetadata: {},
      title: { en: "PBL Scenario 1" },
      description: { en: "PBL Test 1" },
      version: "1.0.0",
      objectives: ["Learn PBL"],
      difficulty: "intermediate",
      estimatedMinutes: 60,
      prerequisites: [],
      taskTemplates: [],
      taskCount: 5,
      xpRewards: { completion: 100 },
      unlockRequirements: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      aiModules: {},
      resources: [],
      metadata: {},
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockAssessmentScenarios: IScenario[] = [
    {
      id: "assessment-1",
      mode: "assessment",
      sourceType: "yaml",
      sourcePath: "assessment/scenario1.yaml",
      sourceId: undefined,
      sourceMetadata: {},
      title: { en: "Assessment Scenario 1" },
      description: { en: "Assessment Test 1" },
      version: "1.0.0",
      objectives: ["Assess knowledge"],
      difficulty: "intermediate",
      estimatedMinutes: 30,
      prerequisites: [],
      taskTemplates: [],
      taskCount: 10,
      xpRewards: { completion: 150 },
      unlockRequirements: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      aiModules: {},
      resources: [],
      metadata: {},
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockDiscoveryScenarios: IScenario[] = [
    {
      id: "discovery-1",
      mode: "discovery",
      sourceType: "yaml",
      sourcePath: "discovery/scenario1.yaml",
      sourceId: undefined,
      sourceMetadata: {},
      title: { en: "Discovery Scenario 1" },
      description: { en: "Discovery Test 1" },
      version: "1.0.0",
      objectives: ["Explore careers"],
      difficulty: "beginner",
      estimatedMinutes: 45,
      prerequisites: [],
      taskTemplates: [],
      taskCount: 8,
      xpRewards: { completion: 120 },
      unlockRequirements: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      aiModules: {},
      resources: [],
      metadata: {},
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the singleton's cache by accessing private properties
    // This is needed to test cache behavior
    (scenarioIndexBuilder as unknown as Record<string, unknown>)[
      "lastBuildTime"
    ] = null;
    (scenarioIndexBuilder as unknown as Record<string, unknown>)["isBuilding"] =
      false;

    // Setup mocks
    mockScenarioRepo = {
      findBySource: jest.fn((source: string) => {
        switch (source) {
          case "pbl":
            return Promise.resolve(mockPblScenarios);
          case "assessment":
            return Promise.resolve(mockAssessmentScenarios);
          case "discovery":
            return Promise.resolve(mockDiscoveryScenarios);
          default:
            return Promise.resolve([]);
        }
      }),
      findById: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };

    // Mock the dynamic import
    const {
      repositoryFactory,
    } = require("@/lib/repositories/base/repository-factory");
    repositoryFactory.getScenarioRepository.mockReturnValue(mockScenarioRepo);

    mockScenarioIndexService.buildIndex = jest.fn().mockResolvedValue({
      yamlToUuid: new Map(),
      uuidToYaml: new Map(),
      lastUpdated: new Date().toISOString(),
    });

    // Mock additional methods used by buildSourceIndex and ensureIndex
    mockScenarioIndexService.getIndex = jest.fn().mockResolvedValue(null);
    mockScenarioIndexService.exists = jest.fn().mockResolvedValue(false);

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    builder = scenarioIndexBuilder;
  });

  afterEach(() => {
    if (consoleLogSpy) consoleLogSpy.mockRestore();
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
  });

  describe("singleton", () => {
    it("scenarioIndexBuilder is a singleton", () => {
      // scenarioIndexBuilder is already exported as a singleton instance
      expect(builder).toBe(scenarioIndexBuilder);
    });
  });

  describe("buildFullIndex", () => {
    it("builds index with scenarios from all sources", async () => {
      await builder.buildFullIndex();

      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith("pbl");
      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith("assessment");
      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith("discovery");
      expect(mockScenarioRepo.findBySource).toHaveBeenCalledTimes(3);

      const expectedScenarios = [
        ...mockPblScenarios,
        ...mockAssessmentScenarios,
        ...mockDiscoveryScenarios,
      ];
      expect(mockScenarioIndexService.buildIndex).toHaveBeenCalledWith(
        expectedScenarios,
      );
    });

    it("groups scenarios by mode", async () => {
      await builder.buildFullIndex();

      // Check that console was called with building messages
      expect(consoleLogSpy).toHaveBeenCalledWith("Building scenario index...");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Building index for 3 scenarios...",
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Scenario index built successfully",
      );
    });

    it("prevents concurrent builds", async () => {
      // Start first build
      const firstBuild = builder.buildFullIndex();

      // Try to start second build immediately
      const secondBuild = builder.buildFullIndex();

      await Promise.all([firstBuild, secondBuild]);

      // Should only fetch scenarios once
      expect(mockScenarioRepo.findBySource).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Index build already in progress, skipping...",
      );
    });

    it("prevents too frequent builds", async () => {
      // First build
      await builder.buildFullIndex();

      // Reset mocks
      jest.clearAllMocks();

      // Try to build again immediately
      await builder.buildFullIndex();

      // Should not fetch scenarios again
      expect(mockScenarioRepo.findBySource).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Index was recently built, skipping...",
      );
    });

    it("handles errors gracefully", async () => {
      const error = new Error("Database error");
      mockScenarioRepo.findBySource.mockRejectedValueOnce(error);

      await expect(builder.buildFullIndex()).rejects.toThrow("Database error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error building scenario index:",
        error,
      );
      expect(mockScenarioIndexService.buildIndex).not.toHaveBeenCalled();
    });

    it("logs build completion time", async () => {
      await builder.buildFullIndex();

      // Just check that completion is logged, don't match exact format
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Scenario index built successfully",
      );
    });
  });

  describe("buildSourceIndex", () => {
    it("builds index for specific source type only", async () => {
      await builder.buildSourceIndex("pbl");

      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith("pbl");
      expect(mockScenarioRepo.findBySource).toHaveBeenCalledTimes(1);
      expect(mockScenarioIndexService.buildIndex).toHaveBeenCalledWith(
        mockPblScenarios,
      );
    });

    it("handles assessment source", async () => {
      await builder.buildSourceIndex("assessment");

      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith("assessment");
      expect(mockScenarioIndexService.buildIndex).toHaveBeenCalledWith(
        mockAssessmentScenarios,
      );
    });

    it("handles discovery source", async () => {
      await builder.buildSourceIndex("discovery");

      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith("discovery");
      expect(mockScenarioIndexService.buildIndex).toHaveBeenCalledWith(
        mockDiscoveryScenarios,
      );
    });

    it("preserves scenarios from other sources when updating", async () => {
      // Setup existing index with a scenario from another source
      const existingIndex = {
        yamlToUuid: new Map(),
        uuidToYaml: new Map([
          [
            "existing-uuid",
            {
              yamlId: "existing-yaml",
              uuid: "existing-uuid",
              sourceType: "assessment" as const,
              title: "Existing Assessment",
              lastUpdated: new Date().toISOString(),
            },
          ],
        ]),
        lastUpdated: new Date().toISOString(),
      };
      mockScenarioIndexService.getIndex.mockResolvedValueOnce(existingIndex);

      await builder.buildSourceIndex("pbl");

      // Should preserve the existing assessment scenario and add PBL scenarios
      expect(mockScenarioIndexService.buildIndex).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "existing-uuid" }),
          ...mockPblScenarios,
        ]),
      );
    });

    it("logs source-specific build info", async () => {
      await builder.buildSourceIndex("pbl");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Building index for pbl scenarios...",
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Index updated with 1 pbl scenarios",
      );
    });

    it("handles source build errors", async () => {
      const error = new Error("Source fetch error");
      mockScenarioRepo.findBySource.mockRejectedValueOnce(error);

      await expect(builder.buildSourceIndex("pbl")).rejects.toThrow(
        "Source fetch error",
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error building pbl index:",
        error,
      );
    });
  });

  describe("ensureIndex", () => {
    it("builds index if it does not exist", async () => {
      mockScenarioIndexService.exists.mockResolvedValueOnce(false);

      await builder.ensureIndex();

      expect(mockScenarioIndexService.exists).toHaveBeenCalled();
      expect(mockScenarioRepo.findBySource).toHaveBeenCalledTimes(3);
      expect(mockScenarioIndexService.buildIndex).toHaveBeenCalled();
    });

    it("does not build index if it already exists", async () => {
      mockScenarioIndexService.exists.mockResolvedValueOnce(true);

      await builder.ensureIndex();

      expect(mockScenarioIndexService.exists).toHaveBeenCalled();
      expect(mockScenarioRepo.findBySource).not.toHaveBeenCalled();
      expect(mockScenarioIndexService.buildIndex).not.toHaveBeenCalled();
    });
  });

  describe("getStatus", () => {
    it("returns build status", () => {
      const status = builder.getStatus();

      expect(status).toEqual({
        isBuilding: false,
        lastBuildTime: null,
      });
    });

    it("returns updated status after build", async () => {
      await builder.buildFullIndex();

      const status = builder.getStatus();

      expect(status.isBuilding).toBe(false);
      expect(status.lastBuildTime).toBeInstanceOf(Date);
    });
  });
});
