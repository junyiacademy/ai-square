import {
  getDifficultyBadge,
  getCategoryIcon,
  getScenarioData,
} from "../scenarioHelpers";
import { IScenario } from "@/types/unified-learning";

describe("scenarioHelpers", () => {
  describe("getDifficultyBadge", () => {
    it("should return green badge for beginner", () => {
      expect(getDifficultyBadge("beginner")).toContain("green");
    });

    it("should return yellow badge for intermediate", () => {
      expect(getDifficultyBadge("intermediate")).toContain("yellow");
    });

    it("should return red badge for advanced", () => {
      expect(getDifficultyBadge("advanced")).toContain("red");
    });

    it("should return gray badge for unknown difficulty", () => {
      expect(getDifficultyBadge("unknown")).toContain("gray");
    });
  });

  describe("getCategoryIcon", () => {
    it("should return correct icons for categories", () => {
      expect(getCategoryIcon("analysis")).toBe("📊");
      expect(getCategoryIcon("creation")).toBe("✨");
      expect(getCategoryIcon("evaluation")).toBe("🔍");
      expect(getCategoryIcon("application")).toBe("🚀");
      expect(getCategoryIcon("unknown")).toBe("📝");
    });
  });

  describe("getScenarioData", () => {
    const mockScenario = {
      id: "test-id",
      title: { en: "Test" },
      description: { en: "Test" },
      mode: "pbl",
      difficulty: "intermediate",
      metadata: {
        difficulty: "intermediate",
        estimatedDuration: 45,
        targetDomains: ["math", "science"],
        tasks: [],
      },
    } as unknown as IScenario;

    it("should get top-level property", () => {
      expect(getScenarioData(mockScenario, "difficulty")).toBe("intermediate");
    });

    it("should get metadata property", () => {
      expect(getScenarioData(mockScenario, "targetDomains")).toEqual([
        "math",
        "science",
      ]);
    });

    it("should return fallback when property not found", () => {
      expect(getScenarioData(mockScenario, "nonexistent", "fallback")).toBe(
        "fallback",
      );
    });

    it("should return null when no fallback provided", () => {
      expect(getScenarioData(mockScenario, "nonexistent")).toBeNull();
    });

    it("should prioritize top-level over metadata", () => {
      expect(getScenarioData(mockScenario, "difficulty")).toBe("intermediate");
    });
  });
});
