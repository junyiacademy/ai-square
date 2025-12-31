/**
 * Discovery Programs API Tests
 * Following TDD principles from @CLAUDE.md
 */

import { NextRequest } from "next/server";
import { POST, GET } from "../route";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import { getUnifiedAuth } from "@/lib/auth/unified-auth";

// Mock dependencies
jest.mock("@/lib/repositories/base/repository-factory");
jest.mock("@/lib/auth/unified-auth", () => ({
  getUnifiedAuth: jest.fn(),
  createUnauthorizedResponse: jest.fn(
    () =>
      new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
  ),
}));

const mockRepositoryFactory = repositoryFactory as jest.Mocked<
  typeof repositoryFactory
>;
const mockGetUnifiedAuth = getUnifiedAuth as jest.MockedFunction<
  typeof getUnifiedAuth
>;

describe("/api/discovery/programs", () => {
  let mockUserRepo: any;
  let mockScenarioRepo: any;
  let mockProgramRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock repositories
    mockUserRepo = {
      findByEmail: jest.fn(),
    };

    mockScenarioRepo = {
      findById: jest.fn(),
    };

    mockProgramRepo = {
      create: jest.fn(),
    };

    mockRepositoryFactory.getUserRepository.mockReturnValue(mockUserRepo);
    mockRepositoryFactory.getScenarioRepository.mockReturnValue(
      mockScenarioRepo,
    );
    mockRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo);
  });

  describe("POST /api/discovery/programs", () => {
    const validRequestBody = {
      scenarioId: "discovery-scenario-123",
    };

    it("should return 401 when not authenticated", async () => {
      mockGetUnifiedAuth.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
        {
          method: "POST",
          body: JSON.stringify(validRequestBody),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 400 when scenarioId is missing", async () => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: "test@example.com", id: "user-123", role: "student" },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Scenario ID is required");
    });

    it("should return 404 when user not found", async () => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: "test@example.com", id: "user-123", role: "student" },
      });
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
        {
          method: "POST",
          body: JSON.stringify(validRequestBody),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe("User not found");
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith("test@example.com");
    });

    it("should return 404 when scenario not found", async () => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: "test@example.com", id: "user-123", role: "student" },
      });
      mockUserRepo.findByEmail.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
      });
      mockScenarioRepo.findById.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
        {
          method: "POST",
          body: JSON.stringify(validRequestBody),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Scenario not found");
      expect(mockScenarioRepo.findById).toHaveBeenCalledWith(
        "discovery-scenario-123",
      );
    });

    it("should return 400 when scenario mode is not discovery", async () => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: "test@example.com", id: "user-123", role: "student" },
      });
      mockUserRepo.findByEmail.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
      });
      mockScenarioRepo.findById.mockResolvedValue({
        id: "discovery-scenario-123",
        mode: "pbl", // Wrong mode
        title: { en: "Test Scenario" },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
        {
          method: "POST",
          body: JSON.stringify(validRequestBody),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid scenario type");
    });

    it("should successfully create discovery program", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const mockScenario = {
        id: "discovery-scenario-123",
        mode: "discovery",
        title: { en: "Career Discovery Scenario" },
        discoveryData: {
          requiredSkills: ["communication", "problem-solving", "leadership"],
          careerPath: "product_manager",
          careerLevel: "junior",
        },
      };
      const mockProgram = {
        id: "program-123",
        userId: "user-123",
        scenarioId: "discovery-scenario-123",
        mode: "discovery",
        status: "active",
      };

      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: "test@example.com", id: "user-123", role: "student" },
      });
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.create.mockResolvedValue(mockProgram);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
        {
          method: "POST",
          body: JSON.stringify(validRequestBody),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.program).toEqual(mockProgram);
      expect(data.meta.timestamp).toBeDefined();

      // Verify program creation call
      expect(mockProgramRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          scenarioId: "discovery-scenario-123",
          mode: "discovery",
          status: "active",
          currentTaskIndex: 0,
          completedTaskCount: 0,
          totalTaskCount: 0,
          discoveryData: expect.objectContaining({
            skillGapAnalysis: expect.arrayContaining([
              expect.objectContaining({
                skill: "communication",
                currentLevel: expect.any(Number),
                requiredLevel: expect.any(Number),
                importance: expect.any(String),
              }),
            ]),
            explorationPath: ["product_manager"],
            personalityMatch: 85,
            careerReadiness: 65,
          }),
          metadata: expect.objectContaining({
            careerLevel: "junior",
          }),
        }),
      );
    });

    it("should handle scenarios with minimal discoveryData", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const mockScenario = {
        id: "discovery-scenario-123",
        mode: "discovery",
        title: { en: "Minimal Discovery Scenario" },
        discoveryData: {}, // Minimal data
      };
      const mockProgram = { id: "program-123", userId: "user-123" };

      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: "test@example.com", id: "user-123", role: "student" },
      });
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.create.mockResolvedValue(mockProgram);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
        {
          method: "POST",
          body: JSON.stringify(validRequestBody),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);

      // Should still create program with default values
      expect(mockProgramRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          discoveryData: expect.objectContaining({
            skillGapAnalysis: [],
            explorationPath: [""],
            personalityMatch: 85,
            careerReadiness: 65,
          }),
        }),
      );
    });

    it("should calculate skill gaps correctly from required skills", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const mockScenario = {
        id: "discovery-scenario-123",
        mode: "discovery",
        title: { en: "Skills Discovery Scenario" },
        discoveryData: {
          requiredSkills: ["technical-writing", "data-analysis", "teamwork"],
          careerPath: "data_analyst",
          careerLevel: "senior",
        },
      };
      const mockProgram = { id: "program-123" };

      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: "test@example.com", id: "user-123", role: "student" },
      });
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.create.mockResolvedValue(mockProgram);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
        {
          method: "POST",
          body: JSON.stringify(validRequestBody),
        },
      );

      const response = await POST(request);

      expect(mockProgramRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          discoveryData: expect.objectContaining({
            skillGapAnalysis: [
              expect.objectContaining({
                skill: "technical-writing",
                currentLevel: expect.any(Number),
                requiredLevel: expect.any(Number),
                importance: expect.any(String),
              }),
              expect.objectContaining({
                skill: "data-analysis",
                currentLevel: expect.any(Number),
                requiredLevel: expect.any(Number),
                importance: expect.any(String),
              }),
              expect.objectContaining({
                skill: "teamwork",
                currentLevel: expect.any(Number),
                requiredLevel: expect.any(Number),
                importance: expect.any(String),
              }),
            ],
            explorationPath: ["data_analyst"],
          }),
          metadata: expect.objectContaining({
            careerLevel: "senior",
          }),
        }),
      );
    });

    it("should handle repository errors gracefully", async () => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: "test@example.com", id: "user-123", role: "student" },
      });
      mockUserRepo.findByEmail.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
        {
          method: "POST",
          body: JSON.stringify(validRequestBody),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 500 when programRepo.create throws", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const mockScenario = {
        id: "discovery-scenario-123",
        mode: "discovery",
        title: { en: "Career Discovery Scenario" },
        discoveryData: { requiredSkills: ["x"] },
      };
      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: "test@example.com", id: "user-123", role: "student" },
      });
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.create.mockRejectedValue(new Error("insert failed"));

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
        {
          method: "POST",
          body: JSON.stringify(validRequestBody),
        },
      );

      const res = await POST(request);
      const data = await res.json();
      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Internal server error");
    });

    it("should create program when requiredSkills is empty or missing", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const mockScenario = {
        id: "discovery-scenario-123",
        mode: "discovery",
        title: { en: "No Skills Scenario" },
        discoveryData: { requiredSkills: [] },
      };
      const mockProgram = { id: "program-999" };
      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: "test@example.com", id: "user-123", role: "student" },
      });
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.create.mockResolvedValue(mockProgram);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
        {
          method: "POST",
          body: JSON.stringify({ scenarioId: "discovery-scenario-123" }),
        },
      );
      const res = await POST(request);
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(mockProgramRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          discoveryData: expect.objectContaining({
            skillGapAnalysis: [],
            explorationPath: [""],
          }),
        }),
      );

      // Missing discoveryData entirely
      mockScenarioRepo.findById.mockResolvedValue({
        id: "discovery-scenario-124",
        mode: "discovery",
        title: { en: "No Data" },
      });
      const res2 = await POST(
        new NextRequest("http://localhost:3000/api/discovery/programs", {
          method: "POST",
          body: JSON.stringify({ scenarioId: "discovery-scenario-124" }),
        }),
      );
      expect(res2.status).toBe(201);
    });
  });

  describe("GET /api/discovery/programs", () => {
    let mockUserRepo: any;
    let mockProgramRepo: any;

    beforeEach(() => {
      mockUserRepo = { findByEmail: jest.fn() };
      mockProgramRepo = { findByUser: jest.fn() };
      (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(
        mockUserRepo,
      );
      (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(
        mockProgramRepo,
      );
    });

    it("should return 401 when not authenticated", async () => {
      mockGetUnifiedAuth.mockResolvedValue(null);
      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
      );
      const res = await GET(request);
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 404 when user not found", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { email: "u@e.com" },
      });
      mockUserRepo.findByEmail.mockResolvedValue(null);
      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
      );
      const { GET } = require("../route");
      const res = await GET(request);
      const data = await res.json();
      expect(res.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return user programs with progress and default sorting (desc by lastActivityAt)", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { email: "u@e.com" },
      });
      mockUserRepo.findByEmail.mockResolvedValue({
        id: "u1",
        email: "u@e.com",
      });
      const programs = [
        {
          id: "p1",
          userId: "u1",
          mode: "discovery",
          status: "active",
          completedTaskCount: 2,
          totalTaskCount: 4,
          lastActivityAt: "2024-01-02T00:00:00Z",
          discoveryData: { careerReadiness: 70, skillGapAnalysis: [{}, {}] },
        },
        {
          id: "p2",
          userId: "u1",
          mode: "discovery",
          status: "completed",
          completedTaskCount: 4,
          totalTaskCount: 4,
          lastActivityAt: "2024-01-03T00:00:00Z",
          discoveryData: { careerReadiness: 80, skillGapAnalysis: [{}] },
        },
        // Non-discovery should be filtered out
        {
          id: "p3",
          userId: "u1",
          mode: "pbl",
          status: "active",
          completedTaskCount: 1,
          totalTaskCount: 5,
          lastActivityAt: "2024-01-04T00:00:00Z",
          discoveryData: {},
        },
      ];
      mockProgramRepo.findByUser.mockResolvedValue(programs);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
      );
      const { GET } = require("../route");
      const res = await GET(request);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.total).toBe(2);
      // Sorted desc by lastActivityAt: p2 then p1
      expect(data.data.programs[0].id).toBe("p2");
      expect(data.data.programs[1].id).toBe("p1");
      // Progress fields
      expect(data.data.programs[0].progress).toEqual(
        expect.objectContaining({
          completionRate: 100,
          tasksCompleted: 4,
          totalTasks: 4,
          careerReadiness: 80,
          skillGaps: 1,
        }),
      );
      expect(data.meta.filters.status).toBe("all");
    });

    it("should filter by status query param", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { email: "u@e.com" },
      });
      mockUserRepo.findByEmail.mockResolvedValue({
        id: "u1",
        email: "u@e.com",
      });
      mockProgramRepo.findByUser.mockResolvedValue([
        {
          id: "a",
          userId: "u1",
          mode: "discovery",
          status: "active",
          completedTaskCount: 0,
          totalTaskCount: 2,
          lastActivityAt: "2024-01-01T00:00:00Z",
          discoveryData: {},
        },
        {
          id: "b",
          userId: "u1",
          mode: "discovery",
          status: "completed",
          completedTaskCount: 2,
          totalTaskCount: 2,
          lastActivityAt: "2024-01-02T00:00:00Z",
          discoveryData: {},
        },
      ]);
      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs?status=completed",
      );
      const { GET } = require("../route");
      const res = await GET(request);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.data.total).toBe(1);
      expect(data.data.programs[0].status).toBe("completed");
      expect(data.meta.filters.status).toBe("completed");
    });

    it("should handle repository errors with 500", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { email: "u@e.com" },
      });
      mockUserRepo.findByEmail.mockResolvedValue({
        id: "u1",
        email: "u@e.com",
      });
      mockProgramRepo.findByUser.mockRejectedValue(new Error("db down"));
      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
      );
      const { GET } = require("../route");
      const res = await GET(request);
      const data = await res.json();
      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Internal server error");
    });

    it("should keep stable order when lastActivityAt ties (by input order)", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { email: "u@e.com" },
      });
      mockUserRepo.findByEmail.mockResolvedValue({
        id: "u1",
        email: "u@e.com",
      });
      const sameTime = "2024-01-05T00:00:00Z";
      mockProgramRepo.findByUser.mockResolvedValue([
        {
          id: "p1",
          userId: "u1",
          mode: "discovery",
          status: "active",
          completedTaskCount: 1,
          totalTaskCount: 2,
          lastActivityAt: sameTime,
          discoveryData: {},
        },
        {
          id: "p2",
          userId: "u1",
          mode: "discovery",
          status: "active",
          completedTaskCount: 1,
          totalTaskCount: 2,
          lastActivityAt: sameTime,
          discoveryData: {},
        },
      ]);
      const request = new NextRequest(
        "http://localhost:3000/api/discovery/programs",
      );
      const { GET } = require("../route");
      const res = await GET(request);
      const data = await res.json();
      expect(res.status).toBe(200);
      // sort comparator returns 0 on tie; expect stable order p1 then p2
      expect(data.data.programs[0].id).toBe("p1");
      expect(data.data.programs[1].id).toBe("p2");
    });
  });
});
