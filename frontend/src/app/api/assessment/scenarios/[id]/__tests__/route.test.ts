import { mockRepositoryFactory } from "@/test-utils/mocks/repositories";
/**
 * Assessment Scenario API Route Tests
 * 提升覆蓋率從 0% 到 80%+
 */

import { GET } from "../route";
import { NextRequest } from "next/server";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import type { IScenario, ITaskTemplate } from "@/types/unified-learning";

// Mock repository factory
jest.mock("@/lib/repositories/base/repository-factory");

// Mock console methods
const consoleSpy = {
  error: jest.spyOn(console, "error").mockImplementation(),
};

describe("Assessment Scenario API Route", () => {
  const mockScenarioRepo = {
    findById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(
      mockScenarioRepo,
    );
  });

  afterEach(() => {
    consoleSpy.error.mockClear();
  });

  describe("GET /api/assessment/scenarios/[id]", () => {
    it("should return scenario with calculated config", async () => {
      const mockTaskTemplates: ITaskTemplate[] = [
        {
          id: "task-1",
          title: { en: "Task 1" },
          type: "question",
          status: "active",
          content: {
            questions: [
              { id: "q1", text: "Question 1" },
              { id: "q2", text: "Question 2" },
              { id: "q3", text: "Question 3" },
            ],
          },
          context: {
            timeLimit: 300, // 5 minutes
          },
        } as ITaskTemplate,
        {
          id: "task-2",
          title: { en: "Task 2" },
          type: "question",
          status: "active",
          content: {
            questions: [
              { id: "q4", text: "Question 4" },
              { id: "q5", text: "Question 5" },
            ],
          },
          context: {
            timeLimit: 240, // 4 minutes
          },
        } as ITaskTemplate,
      ];

      const mockScenario: IScenario = {
        id: "test-scenario-id",
        mode: "assessment",
        status: "active",
        version: "1.0",
        sourceType: "yaml",
        sourceMetadata: {},
        title: { en: "Test Assessment", zh: "測試評估" },
        description: { en: "Test Description", zh: "測試說明" },
        objectives: [],
        difficulty: "beginner",
        estimatedMinutes: 30,
        prerequisites: [],
        taskTemplates: mockTaskTemplates,
        taskCount: 2,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {},
      };

      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/scenarios/test-scenario-id?lang=en",
      );
      const params = Promise.resolve({ id: "test-scenario-id" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(mockScenarioRepo.findById).toHaveBeenCalledWith(
        "test-scenario-id",
      );
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: "test-scenario-id",
        title: "Test Assessment",
        description: "Test Description",
        config: {
          totalQuestions: 5, // 3 + 2
          timeLimit: 9, // 5 + 4 minutes
          passingScore: 60,
          domains: ["task-1", "task-2"],
        },
      });
    });

    it("should use language-specific title and description", async () => {
      const mockScenario: IScenario = {
        id: "test-scenario-id",
        mode: "assessment",
        status: "active",
        version: "1.0",
        sourceType: "yaml",
        sourceMetadata: {},
        title: { en: "English Title", zh: "中文標題" },
        description: { en: "English Description", zh: "中文說明" },
        objectives: [],
        difficulty: "beginner",
        estimatedMinutes: 30,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 0,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {},
      };

      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/scenarios/test-scenario-id?lang=zh",
      );
      const params = Promise.resolve({ id: "test-scenario-id" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("中文標題");
      expect(data.description).toBe("中文說明");
    });

    it("should handle string title and description", async () => {
      const mockScenario: IScenario = {
        id: "test-scenario-id",
        mode: "assessment",
        status: "active",
        version: "1.0",
        sourceType: "yaml",
        sourceMetadata: {},
        title: "String Title" as any, // Simulating legacy data
        description: "String Description" as any,
        objectives: [],
        difficulty: "beginner",
        estimatedMinutes: 30,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 0,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {},
      };

      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/scenarios/test-scenario-id",
      );
      const params = Promise.resolve({ id: "test-scenario-id" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("String Title");
      expect(data.description).toBe("String Description");
    });

    it("should return 404 when scenario not found", async () => {
      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/scenarios/non-existent",
      );
      const params = Promise.resolve({ id: "non-existent" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Scenario not found" });
    });

    it("should use default config when no taskTemplates", async () => {
      const mockScenario: IScenario = {
        id: "test-scenario-id",
        mode: "assessment",
        status: "active",
        version: "1.0",
        sourceType: "yaml",
        sourceMetadata: {},
        title: { en: "Test Assessment" },
        description: { en: "Test Description" },
        objectives: [],
        difficulty: "beginner",
        estimatedMinutes: 30,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 0,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {},
        // No taskTemplates
      };

      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/scenarios/test-scenario-id",
      );
      const params = Promise.resolve({ id: "test-scenario-id" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.config).toEqual({
        totalQuestions: 12,
        timeLimit: 15,
        passingScore: 60,
        domains: [], // Empty array because taskTemplates is empty array, not undefined
      });
    });

    it("should handle tasks without questions or timeLimit", async () => {
      const mockTaskTemplates: ITaskTemplate[] = [
        {
          id: "task-1",
          title: { en: "Task 1" },
          type: "question",
          status: "active",
          content: {}, // No questions
          context: {}, // No timeLimit
        } as ITaskTemplate,
        {
          id: "task-2",
          title: { en: "Task 2" },
          type: "question",
          status: "active",
          content: {
            questions: null as any, // Null questions
          },
          context: {
            timeLimit: undefined, // Undefined timeLimit
          },
        } as ITaskTemplate,
      ];

      const mockScenario: IScenario = {
        id: "test-scenario-id",
        mode: "assessment",
        status: "active",
        version: "1.0",
        sourceType: "yaml",
        sourceMetadata: {},
        title: { en: "Test Assessment" },
        description: { en: "Test Description" },
        objectives: [],
        difficulty: "beginner",
        estimatedMinutes: 30,
        prerequisites: [],
        taskTemplates: mockTaskTemplates,
        taskCount: 2,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {},
      };

      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/scenarios/test-scenario-id",
      );
      const params = Promise.resolve({ id: "test-scenario-id" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.config).toEqual({
        totalQuestions: 12, // Falls back to default because totalQuestions || 12
        timeLimit: 8, // 240/60 + 240/60 = 4 + 4
        passingScore: 60,
        domains: ["task-1", "task-2"],
      });
    });

    it("should fallback to English for missing language", async () => {
      const mockScenario: IScenario = {
        id: "test-scenario-id",
        mode: "assessment",
        status: "active",
        version: "1.0",
        sourceType: "yaml",
        sourceMetadata: {},
        title: { en: "English Title", zh: "中文標題" },
        description: { en: "English Description", zh: "中文說明" },
        objectives: [],
        difficulty: "beginner",
        estimatedMinutes: 30,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 0,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {},
      };

      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/scenarios/test-scenario-id?lang=fr",
      );
      const params = Promise.resolve({ id: "test-scenario-id" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("English Title"); // Falls back to English
      expect(data.description).toBe("English Description");
    });

    it("should handle missing title and description", async () => {
      const mockScenario: IScenario = {
        id: "test-scenario-id",
        mode: "assessment",
        status: "active",
        version: "1.0",
        sourceType: "yaml",
        sourceMetadata: {},
        title: undefined as any, // Missing title
        description: undefined as any, // Missing description
        objectives: [],
        difficulty: "beginner",
        estimatedMinutes: 30,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 0,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {},
      };

      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/scenarios/test-scenario-id",
      );
      const params = Promise.resolve({ id: "test-scenario-id" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Assessment"); // Default title
      expect(data.description).toBe(""); // Default empty description
    });

    it("should handle repository errors", async () => {
      (mockScenarioRepo.findById as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/scenarios/test-scenario-id",
      );
      const params = Promise.resolve({ id: "test-scenario-id" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
      // Console error is logged (visible in test output) but spy is overridden by setup-test-env.ts
    });

    it("should default to English when no lang parameter", async () => {
      const mockScenario: IScenario = {
        id: "test-scenario-id",
        mode: "assessment",
        status: "active",
        version: "1.0",
        sourceType: "yaml",
        sourceMetadata: {},
        title: { en: "English Title", zh: "中文標題" },
        description: { en: "English Description", zh: "中文說明" },
        objectives: [],
        difficulty: "beginner",
        estimatedMinutes: 30,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 0,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {},
      };

      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/scenarios/test-scenario-id",
      );
      const params = Promise.resolve({ id: "test-scenario-id" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("English Title");
      expect(data.description).toBe("English Description");
    });
  });
});
