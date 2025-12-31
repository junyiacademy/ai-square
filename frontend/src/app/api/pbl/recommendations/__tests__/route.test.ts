/**
 * PBL Recommendations API Route Tests
 * 測試 PBL 推薦系統 API
 */

import { POST } from "../route";
import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";
import { mockConsoleError as createMockConsoleError } from "@/test-utils/helpers/console";

// Mock dependencies
jest.mock("fs", () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn(),
  },
}));

jest.mock("js-yaml", () => ({
  load: jest.fn(),
  dump: jest.fn((obj) => JSON.stringify(obj)),
}));

jest.mock("@/lib/utils/language", () => ({
  getLanguageFromHeader: jest.fn(() => "en"),
}));

// Mock console
const mockConsoleError = createMockConsoleError();

describe("/api/pbl/recommendations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe("POST - Generate Recommendations", () => {
    const mockScenarios = [
      {
        id: "jobsearch",
        title: "AI Job Search Assistant",
        description: "Learn to use AI tools for job searching",
        difficulty: "beginner",
        targetDomain: ["engaging_with_ai", "creating_with_ai"],
        estimatedDuration: 30,
        ksa_mapping: {
          knowledge: ["K1", "K2", "K3"],
          skills: ["S1", "S2"],
          attitudes: ["A1"],
        },
      },
      {
        id: "resume_builder",
        title: "AI Resume Builder",
        description: "Create professional resumes with AI",
        difficulty: "intermediate",
        targetDomain: ["creating_with_ai"],
        estimatedDuration: 45,
        ksa_mapping: {
          knowledge: ["K4", "K5"],
          skills: ["S3", "S4", "S5"],
          attitudes: ["A2", "A3"],
        },
      },
      {
        id: "ai_ethics",
        title: "AI Ethics Workshop",
        description: "Explore ethical considerations in AI",
        difficulty: "advanced",
        targetDomain: ["managing_ai", "designing_ai"],
        estimatedDuration: 60,
        ksa_mapping: {
          knowledge: ["K6", "K7", "K8", "K9"],
          skills: ["S6", "S7"],
          attitudes: ["A4", "A5", "A6"],
        },
      },
    ];

    it("should generate recommendations based on domain scores", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        "jobsearch",
        "resume_builder",
        "ai_ethics",
      ]);
      (fs.access as jest.Mock).mockRejectedValue(new Error("File not found")); // Force English fallback
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(yaml.dump(mockScenarios[0]))
        .mockResolvedValueOnce(yaml.dump(mockScenarios[1]))
        .mockResolvedValueOnce(yaml.dump(mockScenarios[2]));
      (yaml.load as jest.Mock)
        .mockReturnValueOnce(mockScenarios[0])
        .mockReturnValueOnce(mockScenarios[1])
        .mockReturnValueOnce(mockScenarios[2]);

      const requestData = {
        userId: "user-123",
        domainScores: {
          engaging_with_ai: 45, // Weak
          creating_with_ai: 65, // Average
          managing_with_ai: 85, // Strong
          designing_with_ai: 40, // Weak
        },
        completedScenarios: [],
        learningGoals: ["job search", "resume"],
        preferredDifficulty: "intermediate",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/pbl/recommendations",
        {
          method: "POST",
          body: JSON.stringify(requestData),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recommendations).toBeDefined();
      expect(Array.isArray(data.recommendations)).toBe(true);
      expect(data.totalAvailable).toBe(3);

      // Check recommendation structure
      const firstRec = data.recommendations[0];
      expect(firstRec).toHaveProperty("scenarioId");
      expect(firstRec).toHaveProperty("title");
      expect(firstRec).toHaveProperty("relevanceScore");
      expect(firstRec).toHaveProperty("reasons");
      expect(firstRec).toHaveProperty("estimatedImprovement");
      expect(firstRec.estimatedImprovement).toHaveProperty("domain");
      expect(firstRec.estimatedImprovement).toHaveProperty("expectedGain");
    });

    it("should filter out completed scenarios", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        "jobsearch",
        "resume_builder",
        "ai_ethics",
      ]);
      (fs.access as jest.Mock).mockRejectedValue(new Error("File not found"));
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(yaml.dump(mockScenarios[0]))
        .mockResolvedValueOnce(yaml.dump(mockScenarios[1]))
        .mockResolvedValueOnce(yaml.dump(mockScenarios[2]));
      (yaml.load as jest.Mock)
        .mockReturnValueOnce(mockScenarios[0])
        .mockReturnValueOnce(mockScenarios[1])
        .mockReturnValueOnce(mockScenarios[2]);

      const requestData = {
        domainScores: {
          engaging_with_ai: 50,
          creating_with_ai: 50,
          managing_with_ai: 50,
          designing_with_ai: 50,
        },
        completedScenarios: ["jobsearch", "resume_builder"], // Already completed 2
      };

      const request = new NextRequest(
        "http://localhost:3000/api/pbl/recommendations",
        {
          method: "POST",
          body: JSON.stringify(requestData),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalAvailable).toBe(1); // Only 1 remaining
      expect(
        data.recommendations.every(
          (r: any) => !requestData.completedScenarios.includes(r.scenarioId),
        ),
      ).toBe(true);
    });

    it("should prioritize weak domains", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(["jobsearch", "ai_ethics"]);
      (fs.access as jest.Mock).mockRejectedValue(new Error("File not found"));
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(yaml.dump(mockScenarios[0]))
        .mockResolvedValueOnce(yaml.dump(mockScenarios[2]));
      (yaml.load as jest.Mock)
        .mockReturnValueOnce(mockScenarios[0])
        .mockReturnValueOnce(mockScenarios[2]);

      const requestData = {
        domainScores: {
          engaging_with_ai: 30, // Very weak - jobsearch targets this
          creating_with_ai: 30, // Very weak - jobsearch targets this
          managing_with_ai: 90, // Strong - ai_ethics targets this
          designing_with_ai: 90, // Strong - ai_ethics targets this
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/pbl/recommendations",
        {
          method: "POST",
          body: JSON.stringify(requestData),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Jobsearch should be recommended first due to weak domains
      expect(data.recommendations[0].scenarioId).toBe("jobsearch");
      expect(
        data.recommendations[0].reasons.some((r: string) =>
          r.includes("Targets weak domain"),
        ),
      ).toBe(true);
    });

    it("should match difficulty to user level", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        "jobsearch",
        "resume_builder",
        "ai_ethics",
      ]);
      (fs.access as jest.Mock).mockRejectedValue(new Error("File not found"));
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(yaml.dump(mockScenarios[0]))
        .mockResolvedValueOnce(yaml.dump(mockScenarios[1]))
        .mockResolvedValueOnce(yaml.dump(mockScenarios[2]));
      (yaml.load as jest.Mock)
        .mockReturnValueOnce(mockScenarios[0])
        .mockReturnValueOnce(mockScenarios[1])
        .mockReturnValueOnce(mockScenarios[2]);

      const requestData = {
        domainScores: {
          engaging_with_ai: 60,
          creating_with_ai: 65,
          managing_with_ai: 62,
          designing_with_ai: 58,
        }, // Average scores ~60 -> intermediate level
      };

      const request = new NextRequest(
        "http://localhost:3000/api/pbl/recommendations",
        {
          method: "POST",
          body: JSON.stringify(requestData),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const intermediateRec = data.recommendations.find(
        (r: any) => r.difficulty === "intermediate",
      );
      expect(
        intermediateRec.reasons.some((r: string) =>
          r.includes("Appropriate intermediate challenge"),
        ),
      ).toBe(true);
    });

    it("should align with learning goals", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        "jobsearch",
        "resume_builder",
      ]);
      (fs.access as jest.Mock).mockRejectedValue(new Error("File not found"));
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(yaml.dump(mockScenarios[0]))
        .mockResolvedValueOnce(yaml.dump(mockScenarios[1]));
      (yaml.load as jest.Mock)
        .mockReturnValueOnce(mockScenarios[0])
        .mockReturnValueOnce(mockScenarios[1]);

      const requestData = {
        domainScores: {
          engaging_with_ai: 50,
          creating_with_ai: 50,
          managing_with_ai: 50,
          designing_with_ai: 50,
        },
        learningGoals: ["resume", "professional"],
      };

      const request = new NextRequest(
        "http://localhost:3000/api/pbl/recommendations",
        {
          method: "POST",
          body: JSON.stringify(requestData),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const resumeRec = data.recommendations.find(
        (r: any) => r.scenarioId === "resume_builder",
      );
      expect(
        resumeRec.reasons.some((r: string) =>
          r.includes("Aligns with learning goal: resume"),
        ),
      ).toBe(true);
    });

    it("should handle empty scenarios directory", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const requestData = {
        domainScores: {
          engaging_with_ai: 50,
          creating_with_ai: 50,
          managing_with_ai: 50,
          designing_with_ai: 50,
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/pbl/recommendations",
        {
          method: "POST",
          body: JSON.stringify(requestData),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recommendations).toEqual([]);
      expect(data.totalAvailable).toBe(0);
    });

    it("should skip template folders starting with underscore", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(["_template", "jobsearch"]);
      (fs.access as jest.Mock).mockRejectedValue(new Error("File not found"));
      (fs.readFile as jest.Mock).mockResolvedValueOnce(
        yaml.dump(mockScenarios[0]),
      );
      (yaml.load as jest.Mock).mockReturnValueOnce(mockScenarios[0]);

      const requestData = {
        domainScores: {
          engaging_with_ai: 50,
          creating_with_ai: 50,
          managing_with_ai: 50,
          designing_with_ai: 50,
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/pbl/recommendations",
        {
          method: "POST",
          body: JSON.stringify(requestData),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalAvailable).toBe(1);
      expect(fs.readFile).toHaveBeenCalledTimes(1); // Only jobsearch, not _template
    });

    it("should handle scenario loading errors gracefully", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        "jobsearch",
        "broken_scenario",
      ]);
      (fs.access as jest.Mock).mockRejectedValue(new Error("File not found"));
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(yaml.dump(mockScenarios[0]))
        .mockRejectedValueOnce(new Error("File read error"));
      (yaml.load as jest.Mock).mockReturnValueOnce(mockScenarios[0]);

      const requestData = {
        domainScores: {
          engaging_with_ai: 50,
          creating_with_ai: 50,
          managing_with_ai: 50,
          designing_with_ai: 50,
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/pbl/recommendations",
        {
          method: "POST",
          body: JSON.stringify(requestData),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalAvailable).toBe(1); // Only successfully loaded scenario
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining(
          "Error loading scenario from folder broken_scenario:",
        ),
        expect.any(Error),
      );
    });

    it("should handle request errors", async () => {
      const error = new Error("Directory read failed");
      (fs.readdir as jest.Mock).mockRejectedValue(error);

      const requestData = {
        domainScores: {
          engaging_with_ai: 50,
          creating_with_ai: 50,
          managing_with_ai: 50,
          designing_with_ai: 50,
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/pbl/recommendations",
        {
          method: "POST",
          body: JSON.stringify(requestData),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to generate recommendations");
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Error generating recommendations:",
        error,
      );
    });
  });
});

/**
 * PBL Recommendations API Considerations:
 *
 * 1. Recommendation Algorithm:
 *    - Prioritizes weak domains (<60%)
 *    - Matches difficulty to user level
 *    - Aligns with learning goals
 *    - Considers KSA coverage
 *
 * 2. Scoring System:
 *    - Domain weakness: +30 points
 *    - Domain average: +20 points
 *    - Advanced challenge: +25 points
 *    - Goal alignment: +10 points
 *    - Difficulty match: +15 points
 *
 * 3. Improvement Estimation:
 *    - Beginner: 5-15% gain
 *    - Intermediate: 6-12% gain
 *    - Advanced: 5-10% gain
 *    - Capped at 100% total
 *
 * 4. Language Support:
 *    - Tries language-specific files first
 *    - Falls back to English
 *    - Respects request headers
 *
 * 5. Performance:
 *    - Loads all scenarios on each request
 *    - Consider caching scenario data
 *    - Top 10 recommendations returned
 */
