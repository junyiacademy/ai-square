/**
 * Discovery Scenario Start API Tests
 * Following TDD principles from @CLAUDE.md
 */

import { NextRequest } from "next/server";
import { POST } from "../route";
import { getUnifiedAuth } from "@/lib/auth/unified-auth";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import { learningServiceFactory } from "@/lib/services/learning-service-factory";

// Mock dependencies
jest.mock("@/lib/auth/unified-auth");
jest.mock("@/lib/repositories/base/repository-factory");
jest.mock("@/lib/services/learning-service-factory");

const mockGetUnifiedAuth = getUnifiedAuth as jest.MockedFunction<
  typeof getUnifiedAuth
>;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<
  typeof repositoryFactory
>;
const mockLearningServiceFactory = learningServiceFactory as jest.Mocked<
  typeof learningServiceFactory
>;

describe("/api/discovery/scenarios/[id]/start", () => {
  let mockUserRepo: any;
  let mockScenarioRepo: any;
  let mockTaskRepo: any;
  let mockDiscoveryService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock repositories
    mockUserRepo = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    mockScenarioRepo = {
      findById: jest.fn(),
    };

    mockTaskRepo = {
      findByProgram: jest.fn(),
    };

    mockDiscoveryService = {
      startLearning: jest.fn(),
    };

    mockRepositoryFactory.getUserRepository.mockReturnValue(mockUserRepo);
    mockRepositoryFactory.getScenarioRepository.mockReturnValue(
      mockScenarioRepo,
    );
    mockRepositoryFactory.getTaskRepository.mockReturnValue(mockTaskRepo);
    mockLearningServiceFactory.getService.mockReturnValue(mockDiscoveryService);
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetUnifiedAuth.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/test-id/start",
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: "test-id" }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("User authentication required");
    });

    it("should return 401 when user has no email", async () => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: "user-123", email: "", role: "student" },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/test-id/start",
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: "test-id" }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("User authentication required");
    });

    it("should work with authenticated user", async () => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com", role: "student" },
      });

      // Setup valid scenario
      mockScenarioRepo.findById.mockResolvedValue({
        id: "test-uuid",
        mode: "discovery",
        title: { en: "Test Scenario" },
      });

      // Setup existing user
      mockUserRepo.findByEmail.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
      });

      // Setup service response
      mockDiscoveryService.startLearning.mockResolvedValue({
        id: "program-123",
        scenarioId: "test-uuid",
        status: "active",
      });

      mockTaskRepo.findByProgram.mockResolvedValue([]);

      const validUuid = "123e4567-e89b-12d3-a456-426614174000";
      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe("Parameter Validation", () => {
    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com", role: "student" },
      });
    });

    it("should return 400 for invalid UUID format", async () => {
      const invalidId = "invalid-uuid";
      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${invalidId}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: invalidId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid scenario ID format. UUID required.");
    });

    it("should accept valid UUID format", async () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";

      mockScenarioRepo.findById.mockResolvedValue({
        id: validUuid,
        mode: "discovery",
        title: { en: "Test Scenario" },
      });

      mockUserRepo.findByEmail.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
      });

      mockDiscoveryService.startLearning.mockResolvedValue({
        id: "program-123",
        scenarioId: validUuid,
        status: "active",
      });

      mockTaskRepo.findByProgram.mockResolvedValue([]);

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(200);
    });

    it("should handle missing request body gracefully", async () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";

      mockScenarioRepo.findById.mockResolvedValue({
        id: validUuid,
        mode: "discovery",
        title: { en: "Test Scenario" },
      });

      mockUserRepo.findByEmail.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
      });

      mockDiscoveryService.startLearning.mockResolvedValue({
        id: "program-123",
        scenarioId: validUuid,
        status: "active",
      });

      mockTaskRepo.findByProgram.mockResolvedValue([]);

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(200);
      expect(mockDiscoveryService.startLearning).toHaveBeenCalledWith(
        "user-123",
        validUuid,
        { language: "en" }, // Should default to 'en'
      );
    });

    it("should use language from request body", async () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";

      mockScenarioRepo.findById.mockResolvedValue({
        id: validUuid,
        mode: "discovery",
        title: { en: "Test Scenario" },
      });

      mockUserRepo.findByEmail.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
      });

      mockDiscoveryService.startLearning.mockResolvedValue({
        id: "program-123",
        scenarioId: validUuid,
        status: "active",
      });

      mockTaskRepo.findByProgram.mockResolvedValue([]);

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "zh" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(200);
      expect(mockDiscoveryService.startLearning).toHaveBeenCalledWith(
        "user-123",
        validUuid,
        { language: "zh" },
      );
    });
  });

  describe("Scenario Validation", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com", role: "student" },
      });
    });

    it("should return 404 for non-existent scenario", async () => {
      mockScenarioRepo.findById.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Scenario not found");
    });

    it("should return 400 for non-discovery scenario", async () => {
      mockScenarioRepo.findById.mockResolvedValue({
        id: validUuid,
        mode: "pbl",
        title: { en: "PBL Scenario" },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Scenario is not a Discovery scenario");
    });

    it("should accept valid discovery scenario", async () => {
      mockScenarioRepo.findById.mockResolvedValue({
        id: validUuid,
        mode: "discovery",
        title: { en: "Discovery Scenario" },
      });

      mockUserRepo.findByEmail.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
      });

      mockDiscoveryService.startLearning.mockResolvedValue({
        id: "program-123",
        scenarioId: validUuid,
        status: "active",
      });

      mockTaskRepo.findByProgram.mockResolvedValue([]);

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(200);
      expect(mockScenarioRepo.findById).toHaveBeenCalledWith(validUuid);
    });
  });

  describe("User Management", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com", role: "student" },
      });

      mockScenarioRepo.findById.mockResolvedValue({
        id: validUuid,
        mode: "discovery",
        title: { en: "Test Scenario" },
      });

      mockDiscoveryService.startLearning.mockResolvedValue({
        id: "program-123",
        scenarioId: validUuid,
        status: "active",
      });

      mockTaskRepo.findByProgram.mockResolvedValue([]);
    });

    it("should use existing user when found", async () => {
      const existingUser = {
        id: "user-456",
        email: "test@example.com",
        name: "Test User",
      };

      mockUserRepo.findByEmail.mockResolvedValue(existingUser);

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(200);
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith("test@example.com");
      expect(mockUserRepo.create).not.toHaveBeenCalled();
      expect(mockDiscoveryService.startLearning).toHaveBeenCalledWith(
        "user-456",
        validUuid,
        { language: "en" },
      );
    });

    it("should create new user when not found", async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const newUser = {
        id: "user-new",
        email: "test@example.com",
        name: "test",
        preferredLanguage: "zh",
      };

      mockUserRepo.create.mockResolvedValue(newUser);

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "zh" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(200);
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith("test@example.com");
      expect(mockUserRepo.create).toHaveBeenCalledWith({
        email: "test@example.com",
        name: "test",
        preferredLanguage: "zh",
      });
      expect(mockDiscoveryService.startLearning).toHaveBeenCalledWith(
        "user-new",
        validUuid,
        { language: "zh" },
      );
    });

    it("should handle complex email for username generation", async () => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: {
          id: "user-123",
          email: "complex.email+tag@company.com",
          role: "student",
        },
      });

      mockUserRepo.findByEmail.mockResolvedValue(null);

      const newUser = {
        id: "user-new",
        email: "complex.email+tag@company.com",
        name: "complex.email+tag",
        preferredLanguage: "en",
      };

      mockUserRepo.create.mockResolvedValue(newUser);

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(200);
      expect(mockUserRepo.create).toHaveBeenCalledWith({
        email: "complex.email+tag@company.com",
        name: "complex.email+tag",
        preferredLanguage: "en",
      });
    });
  });

  describe("Program Creation", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com", role: "student" },
      });

      mockScenarioRepo.findById.mockResolvedValue({
        id: validUuid,
        mode: "discovery",
        title: { en: "Test Scenario" },
      });

      mockUserRepo.findByEmail.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
      });
    });

    it("should create program and return complete response", async () => {
      const mockProgram = {
        id: "program-456",
        scenarioId: validUuid,
        status: "active",
        userId: "user-123",
      };

      const mockTasks = [
        {
          id: "task-1",
          title: { en: "Task 1" },
          description: { en: "First task" },
          status: "pending",
          type: "question",
          discoveryData: { xpReward: 100 },
        },
        {
          id: "task-2",
          title: { en: "Task 2" },
          description: { en: "Second task" },
          status: "pending",
          type: "exploration",
          discoveryData: { xpReward: 150 },
        },
      ];

      mockDiscoveryService.startLearning.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.id).toBe("program-456");
      expect(data.scenarioId).toBe(validUuid);
      expect(data.status).toBe("active");
      expect(data.currentTaskId).toBe("task-1");
      expect(data.totalTasks).toBe(2);
      expect(data.completedTasks).toBe(0);
      expect(data.totalXP).toBe(0);
      expect(data.language).toBe("en");

      expect(data.tasks).toHaveLength(2);
      expect(data.tasks[0]).toEqual({
        id: "task-1",
        title: { en: "Task 1" },
        description: { en: "First task" },
        status: "pending",
        type: "question",
        xp: 100,
      });
      expect(data.tasks[1]).toEqual({
        id: "task-2",
        title: { en: "Task 2" },
        description: { en: "Second task" },
        status: "pending",
        type: "exploration",
        xp: 150,
      });

      expect(mockLearningServiceFactory.getService).toHaveBeenCalledWith(
        "discovery",
      );
      expect(mockDiscoveryService.startLearning).toHaveBeenCalledWith(
        "user-123",
        validUuid,
        { language: "en" },
      );
      expect(mockTaskRepo.findByProgram).toHaveBeenCalledWith("program-456");
    });

    it("should handle empty tasks list", async () => {
      const mockProgram = {
        id: "program-456",
        scenarioId: validUuid,
        status: "active",
      };

      mockDiscoveryService.startLearning.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue([]);

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.currentTaskId).toBeUndefined();
      expect(data.tasks).toHaveLength(0);
      expect(data.totalTasks).toBe(0);
    });

    it("should handle tasks without xpReward", async () => {
      const mockProgram = {
        id: "program-456",
        scenarioId: validUuid,
        status: "active",
      };

      const mockTasks = [
        {
          id: "task-1",
          title: { en: "Task 1" },
          description: { en: "First task" },
          status: "pending",
          type: "question",
          discoveryData: {}, // No xpReward
        },
        {
          id: "task-2",
          title: { en: "Task 2" },
          description: { en: "Second task" },
          status: "pending",
          type: "exploration",
          discoveryData: null, // Null discoveryData
        },
      ];

      mockDiscoveryService.startLearning.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.tasks[0].xp).toBe(50); // Default value
      expect(data.tasks[1].xp).toBe(50); // Default value
    });
  });

  describe("Error Handling", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com", role: "student" },
      });
    });

    it("should handle session service errors", async () => {
      mockGetUnifiedAuth.mockRejectedValue(new Error("Session service error"));

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Session service error");
    });

    it("should handle scenario repository errors", async () => {
      mockScenarioRepo.findById.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Database connection failed");
    });

    it("should handle user repository errors", async () => {
      mockScenarioRepo.findById.mockResolvedValue({
        id: validUuid,
        mode: "discovery",
        title: { en: "Test Scenario" },
      });

      mockUserRepo.findByEmail.mockRejectedValue(
        new Error("User query failed"),
      );

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("User query failed");
    });

    it("should handle learning service errors", async () => {
      mockScenarioRepo.findById.mockResolvedValue({
        id: validUuid,
        mode: "discovery",
        title: { en: "Test Scenario" },
      });

      mockUserRepo.findByEmail.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
      });

      mockDiscoveryService.startLearning.mockRejectedValue(
        new Error("Service unavailable"),
      );

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Service unavailable");
    });

    it("should handle task repository errors", async () => {
      mockScenarioRepo.findById.mockResolvedValue({
        id: validUuid,
        mode: "discovery",
        title: { en: "Test Scenario" },
      });

      mockUserRepo.findByEmail.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
      });

      mockDiscoveryService.startLearning.mockResolvedValue({
        id: "program-456",
        scenarioId: validUuid,
        status: "active",
      });

      mockTaskRepo.findByProgram.mockRejectedValue(
        new Error("Task query failed"),
      );

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Task query failed");
    });

    it("should handle user creation errors", async () => {
      mockScenarioRepo.findById.mockResolvedValue({
        id: validUuid,
        mode: "discovery",
        title: { en: "Test Scenario" },
      });

      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockRejectedValue(new Error("User creation failed"));

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("User creation failed");
    });

    it("should handle JSON parsing errors", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: "invalid json",
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it("should handle non-Error exceptions", async () => {
      mockGetUnifiedAuth.mockImplementation(() => {
        throw "String exception";
      });

      const request = new NextRequest(
        `http://localhost:3000/api/discovery/scenarios/${validUuid}/start`,
        {
          method: "POST",
          body: JSON.stringify({ language: "en" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: validUuid }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to start program");
    });
  });
});
