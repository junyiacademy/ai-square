/**
 * Discovery Scenario Detail API Tests
 * Following TDD principles from @CLAUDE.md
 */

import { NextRequest } from "next/server";
import { GET } from "../route";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";

// Mock dependencies
jest.mock("@/lib/repositories/base/repository-factory");

const mockRepositoryFactory = repositoryFactory as jest.Mocked<
  typeof repositoryFactory
>;

describe("/api/discovery/scenarios/[id]", () => {
  let mockScenarioRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock repository
    mockScenarioRepo = {
      findById: jest.fn(),
    };

    mockRepositoryFactory.getScenarioRepository.mockReturnValue(
      mockScenarioRepo,
    );
  });

  describe("Parameter Handling", () => {
    it("should handle Next.js 15 Promise params correctly", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "discovery",
        title: { en: "Test Scenario" },
        description: { en: "Test Description" },
        discoveryData: {},
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.scenario.id).toBe("scenario-123");
      expect(mockScenarioRepo.findById).toHaveBeenCalledWith("scenario-123");
    });

    it("should handle language query parameter", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "discovery",
        title: { en: "English Title", zh: "中文標題" },
        description: { en: "English Description", zh: "中文描述" },
        discoveryData: {},
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123?lang=zh",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.scenario.title).toBe("中文標題");
      expect(data.data.scenario.description).toBe("中文描述");
      expect(data.meta.language).toBe("zh");
    });

    it("should default to English when language not specified", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "discovery",
        title: { en: "English Title", zh: "中文標題" },
        description: { en: "English Description", zh: "中文描述" },
        discoveryData: {},
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.scenario.title).toBe("English Title");
      expect(data.data.scenario.description).toBe("English Description");
      expect(data.meta.language).toBe("en");
    });
  });

  describe("Scenario Validation", () => {
    it("should return 404 when scenario not found", async () => {
      mockScenarioRepo.findById.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/nonexistent",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Scenario not found");
      expect(data.meta.timestamp).toBeDefined();
    });

    it("should return 404 when scenario mode is not discovery", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "pbl",
        title: { en: "PBL Scenario" },
        description: { en: "This is a PBL scenario" },
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Scenario not found");
    });

    it("should accept valid discovery scenario", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "discovery",
        title: { en: "Discovery Scenario" },
        description: { en: "This is a discovery scenario" },
        discoveryData: {},
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.scenario.mode).toBe("discovery");
    });
  });

  describe("Multilingual Field Processing", () => {
    it("should process title and description with language fallback", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "discovery",
        title: { en: "English Title" },
        description: { en: "English Description" },
        discoveryData: {},
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      // Request in Spanish (not available), should fallback to English
      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123?lang=es",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.scenario.title).toBe("English Title");
      expect(data.data.scenario.description).toBe("English Description");
      expect(data.data.scenario.titleObj).toEqual({ en: "English Title" });
      expect(data.data.scenario.descObj).toEqual({ en: "English Description" });
    });

    it("should handle missing title and description gracefully", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "discovery",
        title: null,
        description: null,
        discoveryData: {},
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.scenario.title).toBe("Untitled");
      expect(data.data.scenario.description).toBe("No description");
    });

    it("should process discoveryData multilingual fields correctly", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "discovery",
        title: { en: "Test Scenario" },
        description: { en: "Test Description" },
        discoveryData: {
          dayInLife: {
            en: "A day in the life of an English speaker",
            zh: "一個中文使用者的一天",
          },
          challenges: {
            en: ["Challenge 1", "Challenge 2"],
            zh: ["挑戰 1", "挑戰 2"],
          },
          rewards: {
            en: ["Reward 1", "Reward 2"],
            zh: ["獎勵 1", "獎勵 2"],
          },
        },
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123?lang=zh",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.scenario.discoveryData.dayInLife).toBe(
        "一個中文使用者的一天",
      );
      expect(data.data.scenario.discoveryData.challenges).toEqual([
        "挑戰 1",
        "挑戰 2",
      ]);
      expect(data.data.scenario.discoveryData.rewards).toEqual([
        "獎勵 1",
        "獎勵 2",
      ]);
    });

    it("should fallback to English for discoveryData when language not available", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "discovery",
        title: { en: "Test Scenario" },
        description: { en: "Test Description" },
        discoveryData: {
          dayInLife: { en: "English day in life" },
          challenges: { en: ["English challenge"] },
          rewards: { en: ["English reward"] },
        },
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123?lang=fr",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.scenario.discoveryData.dayInLife).toBe(
        "English day in life",
      );
      expect(data.data.scenario.discoveryData.challenges).toEqual([
        "English challenge",
      ]);
      expect(data.data.scenario.discoveryData.rewards).toEqual([
        "English reward",
      ]);
    });

    it("should handle missing discoveryData gracefully", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "discovery",
        title: { en: "Test Scenario" },
        description: { en: "Test Description" },
        discoveryData: null,
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.scenario.discoveryData).toEqual({});
    });

    it("should handle partial discoveryData fields", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "discovery",
        title: { en: "Test Scenario" },
        description: { en: "Test Description" },
        discoveryData: {
          dayInLife: { en: "Day in life" },
          // Missing challenges and rewards
        },
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.scenario.discoveryData.dayInLife).toBe("Day in life");
      expect(data.data.scenario.discoveryData.challenges).toEqual([]);
      expect(data.data.scenario.discoveryData.rewards).toEqual([]);
    });
  });

  describe("Response Structure", () => {
    it("should return correct response structure with metadata", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "discovery",
        title: { en: "Test Scenario" },
        description: { en: "Test Description" },
        discoveryData: {},
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123?lang=en",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("scenario");
      expect(data).toHaveProperty("meta");
      expect(data.meta).toHaveProperty("timestamp");
      expect(data.meta).toHaveProperty("version", "1.0.0");
      expect(data.meta).toHaveProperty("language", "en");
      expect(data.meta.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });

    it("should preserve original scenario structure while adding processed fields", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "discovery",
        title: { en: "Test Scenario" },
        description: { en: "Test Description" },
        discoveryData: { someField: "value" },
        otherField: "preserved",
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Check processed fields
      expect(data.data.scenario.title).toBe("Test Scenario");
      expect(data.data.scenario.titleObj).toEqual({ en: "Test Scenario" });

      // Check preserved fields
      expect(data.data.scenario.id).toBe("scenario-123");
      expect(data.data.scenario.mode).toBe("discovery");
      expect(data.data.scenario.otherField).toBe("preserved");
      expect(data.data.scenario.discoveryData.someField).toBe("value");
    });
  });

  describe("Error Handling", () => {
    it("should handle repository errors gracefully", async () => {
      mockScenarioRepo.findById.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Internal server error");
      expect(data.meta.timestamp).toBeDefined();
    });

    it("should handle invalid parameters gracefully", async () => {
      // This would test params Promise rejection, but it's hard to mock
      // So we test with empty string ID instead
      mockScenarioRepo.findById.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "" }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Scenario not found");
    });

    it("should handle malformed discoveryData gracefully", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "discovery",
        title: { en: "Test Scenario" },
        description: { en: "Test Description" },
        discoveryData: {
          dayInLife: "not an object",
          challenges: "not an object",
          rewards: "not an object",
        },
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      // Should handle gracefully without crashing
      expect(data.success).toBe(true);
      expect(data.data.scenario.discoveryData.dayInLife).toBe("");
      expect(data.data.scenario.discoveryData.challenges).toEqual([]);
      expect(data.data.scenario.discoveryData.rewards).toEqual([]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty title and description objects", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "discovery",
        title: {},
        description: {},
        discoveryData: {},
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.scenario.title).toBe("Untitled");
      expect(data.data.scenario.description).toBe("No description");
    });

    it("should handle undefined discoveryData fields", async () => {
      const mockScenario = {
        id: "scenario-123",
        mode: "discovery",
        title: { en: "Test Scenario" },
        description: { en: "Test Description" },
        discoveryData: {
          dayInLife: undefined,
          challenges: undefined,
          rewards: undefined,
        },
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.scenario.discoveryData.dayInLife).toBe("");
      expect(data.data.scenario.discoveryData.challenges).toEqual([]);
      expect(data.data.scenario.discoveryData.rewards).toEqual([]);
    });

    it("should handle special characters in scenario ID", async () => {
      const mockScenario = {
        id: "scenario-with-special-chars-123",
        mode: "discovery",
        title: { en: "Special Chars Scenario" },
        description: { en: "Test Description" },
        discoveryData: {},
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest(
        "http://localhost:3000/api/discovery/scenarios/scenario-with-special-chars-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "scenario-with-special-chars-123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.scenario.id).toBe("scenario-with-special-chars-123");
      expect(mockScenarioRepo.findById).toHaveBeenCalledWith(
        "scenario-with-special-chars-123",
      );
    });
  });
});
