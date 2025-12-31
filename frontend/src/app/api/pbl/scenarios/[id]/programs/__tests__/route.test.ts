import { NextRequest } from "next/server";
import { GET } from "../route";
import { getUnifiedAuth } from "@/lib/auth/unified-auth";

// Mock dependencies
jest.mock("@/lib/auth/unified-auth", () => ({
  getUnifiedAuth: jest.fn(),
  createUnauthorizedResponse: jest.fn(() => ({
    json: () =>
      Promise.resolve({ success: false, error: "Authentication required" }),
    status: 401,
  })),
}));

// Mock dependencies
jest.mock("@/lib/auth/session", () => ({
  getUnifiedAuth: jest.fn(),
}));

jest.mock("@/lib/repositories/base/repository-factory", () => ({
  repositoryFactory: {
    getUserRepository: jest.fn(),
    getProgramRepository: jest.fn(),
    getTaskRepository: jest.fn(),
    getScenarioRepository: jest.fn(),
  },
}));

jest.mock("@/lib/services/scenario-index-service", () => ({
  scenarioIndexService: {
    getUuidByYamlId: jest.fn(),
  },
}));

jest.mock("@/lib/services/scenario-index-builder", () => ({
  scenarioIndexBuilder: {
    ensureIndex: jest.fn(),
  },
}));

describe("API Route: /api/pbl/scenarios/[id]/programs", () => {
  const mockSession = {
    user: {
      email: "test@example.com",
      id: "user-123",
    },
  };

  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  };

  const mockProgram = {
    id: "program-123",
    userId: "user-123",
    scenarioId: "scenario-123",
    mode: "pbl",
    status: "active",
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 3,
    totalScore: 0,
    createdAt: "2025-08-12T00:00:00Z",
    updatedAt: "2025-08-12T00:00:00Z",
  };

  const mockTask = {
    id: "task-123",
    programId: "program-123",
    status: "active",
    completedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return user programs for a scenario", async () => {
      // Setup mocks
      (getUnifiedAuth as jest.Mock).mockResolvedValue(mockSession);

      // Use a proper UUID for this test
      const scenarioUuid = "123e4567-e89b-12d3-a456-426614174000";

      const {
        repositoryFactory,
      } = require("@/lib/repositories/base/repository-factory");
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue(mockUser),
      };
      const mockProgramRepo = {
        findByScenario: jest
          .fn()
          .mockResolvedValue([{ ...mockProgram, scenarioId: scenarioUuid }]),
      };
      const mockTaskRepo = {
        findByProgram: jest.fn().mockResolvedValue([mockTask]),
      };

      repositoryFactory.getUserRepository.mockReturnValue(mockUserRepo);
      repositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo);
      repositoryFactory.getTaskRepository.mockReturnValue(mockTaskRepo);

      // Make request with a valid UUID
      const request = new NextRequest(
        `http://localhost:3000/api/pbl/scenarios/${scenarioUuid}/programs`,
        {
          method: "GET",
        },
      );

      const response = await GET(request, {
        params: Promise.resolve({ id: scenarioUuid }),
      });
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.programs).toHaveLength(1);
      expect(data.data.programs[0].id).toBe("program-123");
      expect(mockProgramRepo.findByScenario).toHaveBeenCalledWith(scenarioUuid);
    });

    it("should handle non-UUID scenario IDs", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue(mockSession);

      const {
        scenarioIndexService,
      } = require("@/lib/services/scenario-index-service");
      scenarioIndexService.getUuidByYamlId.mockResolvedValue(
        "scenario-uuid-123",
      );

      const {
        repositoryFactory,
      } = require("@/lib/repositories/base/repository-factory");
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue(mockUser),
      };
      const mockProgramRepo = {
        findByScenario: jest.fn().mockResolvedValue([]),
      };
      const mockTaskRepo = {
        findByProgram: jest.fn().mockResolvedValue([]),
      };

      repositoryFactory.getUserRepository.mockReturnValue(mockUserRepo);
      repositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo);
      repositoryFactory.getTaskRepository.mockReturnValue(mockTaskRepo);

      const request = new NextRequest(
        "http://localhost:3000/api/pbl/scenarios/yaml-scenario-id/programs",
        {
          method: "GET",
        },
      );

      const response = await GET(request, {
        params: Promise.resolve({ id: "yaml-scenario-id" }),
      });

      expect(response.status).toBe(200);
      expect(scenarioIndexService.getUuidByYamlId).toHaveBeenCalledWith(
        "yaml-scenario-id",
      );
      expect(mockProgramRepo.findByScenario).toHaveBeenCalledWith(
        "scenario-uuid-123",
      );
    });

    it("should return 401 when not authenticated", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/pbl/scenarios/scenario-123/programs",
        {
          method: "GET",
        },
      );

      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 404 when scenario not found", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue(mockSession);

      const {
        scenarioIndexService,
      } = require("@/lib/services/scenario-index-service");
      scenarioIndexService.getUuidByYamlId.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/pbl/scenarios/invalid-id/programs",
        {
          method: "GET",
        },
      );

      const response = await GET(request, {
        params: Promise.resolve({ id: "invalid-id" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Scenario not found");
    });

    it("should auto-fix tasks with completedAt but wrong status", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue(mockSession);

      // Use a proper UUID for this test
      const scenarioUuid = "123e4567-e89b-12d3-a456-426614174000";

      const {
        repositoryFactory,
      } = require("@/lib/repositories/base/repository-factory");
      const mockUserRepo = {
        findByEmail: jest.fn().mockResolvedValue(mockUser),
      };
      const mockProgramRepo = {
        findByScenario: jest
          .fn()
          .mockResolvedValue([{ ...mockProgram, scenarioId: scenarioUuid }]),
      };

      // Task with completedAt but wrong status
      const brokenTask = {
        ...mockTask,
        completedAt: "2025-08-12T12:00:00Z",
        status: "active", // Should be 'completed'
      };

      const mockTaskRepo = {
        findByProgram: jest
          .fn()
          .mockResolvedValueOnce([brokenTask]) // First call returns broken task
          .mockResolvedValueOnce([{ ...brokenTask, status: "completed" }]), // After fix
        update: jest.fn().mockResolvedValue(true),
      };

      repositoryFactory.getUserRepository.mockReturnValue(mockUserRepo);
      repositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo);
      repositoryFactory.getTaskRepository.mockReturnValue(mockTaskRepo);

      const request = new NextRequest(
        `http://localhost:3000/api/pbl/scenarios/${scenarioUuid}/programs`,
        {
          method: "GET",
        },
      );

      const response = await GET(request, {
        params: Promise.resolve({ id: scenarioUuid }),
      });

      expect(response.status).toBe(200);
      expect(mockTaskRepo.update).toHaveBeenCalledWith("task-123", {
        status: "completed",
        completedAt: "2025-08-12T12:00:00Z",
      });
    });
  });

  // Note: POST endpoint tests removed as we use /api/pbl/scenarios/[id]/start instead
  describe("POST", () => {
    it("should use /api/pbl/scenarios/[id]/start endpoint instead", () => {
      // This is just a documentation test to indicate the correct endpoint
      expect("/api/pbl/scenarios/[id]/start").toBeDefined();
    });
  });
});
