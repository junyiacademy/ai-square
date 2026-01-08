/**
 * Unit tests for scenario generation prompts
 */

import {
  getPromptByMode,
  getSystemPrompt,
  FEW_SHOT_EXAMPLES,
} from "../scenario-generator";
import type { CourseGenerationInput } from "@/types/prompt-to-course";

describe("scenario-generator", () => {
  const mockInput: CourseGenerationInput = {
    scenarioId: "test-scenario",
    title: "Test Scenario",
    description: "A test description for scenario generation",
    mode: "pbl",
    difficulty: "beginner",
    estimatedMinutes: 60,
    taskCount: 5,
    targetDomains: ["ai_literacy"],
    language: "en",
    prerequisites: [],
  };

  describe("getSystemPrompt", () => {
    it("should return system prompt string", () => {
      const prompt = getSystemPrompt();

      expect(prompt).toBeTruthy();
      expect(prompt).toContain("educational content designer");
      expect(prompt).toContain("YAML");
    });

    it("should include critical rules", () => {
      const prompt = getSystemPrompt();

      expect(prompt).toContain("CRITICAL RULES");
      expect(prompt).toContain("valid YAML");
      expect(prompt).toContain("MULTILINGUAL");
    });
  });

  describe("getPromptByMode", () => {
    it("should generate PBL prompt", () => {
      const prompt = getPromptByMode({ ...mockInput, mode: "pbl" });

      expect(prompt).toContain("Problem-Based Learning");
      expect(prompt).toContain("pblData");
      expect(prompt).toContain("stages");
      expect(prompt).toContain(mockInput.scenarioId);
      expect(prompt).toContain(mockInput.title);
      expect(prompt).toContain(mockInput.description);
    });

    it("should generate Discovery prompt", () => {
      const prompt = getPromptByMode({ ...mockInput, mode: "discovery" });

      expect(prompt).toContain("Discovery");
      expect(prompt).toContain("Career Exploration");
      expect(prompt).toContain("discoveryData");
      expect(prompt).toContain("careerPath");
      expect(prompt).toContain(mockInput.title);
    });

    it("should generate Assessment prompt", () => {
      const prompt = getPromptByMode({ ...mockInput, mode: "assessment" });

      expect(prompt).toContain("Assessment");
      expect(prompt).toContain("assessmentData");
      expect(prompt).toContain("questionTypes");
      expect(prompt).toContain("passingScore");
    });

    it("should throw error for unknown mode", () => {
      expect(() => {
        getPromptByMode({ ...mockInput, mode: "unknown" as "pbl" });
      }).toThrow("Unknown mode");
    });

    it("should include input parameters in prompt", () => {
      const prompt = getPromptByMode(mockInput);

      expect(prompt).toContain(mockInput.scenarioId);
      expect(prompt).toContain(mockInput.title);
      expect(prompt).toContain(mockInput.description);
      expect(prompt).toContain(mockInput.difficulty);
      expect(prompt).toContain(String(mockInput.estimatedMinutes));
      expect(prompt).toContain(String(mockInput.taskCount));
    });

    it("should handle prerequisites", () => {
      const inputWithPrereqs = {
        ...mockInput,
        prerequisites: ["basic-ai-knowledge", "programming-101"],
      };

      const prompt = getPromptByMode(inputWithPrereqs);

      expect(prompt).toContain("basic-ai-knowledge");
      expect(prompt).toContain("programming-101");
    });

    it("should handle target domains", () => {
      const inputWithDomains = {
        ...mockInput,
        targetDomains: ["ai_literacy", "ethics", "data_science"],
      };

      const prompt = getPromptByMode(inputWithDomains);

      expect(prompt).toContain("ai_literacy");
      expect(prompt).toContain("ethics");
      expect(prompt).toContain("data_science");
    });
  });

  describe("FEW_SHOT_EXAMPLES", () => {
    it("should have examples for all modes", () => {
      expect(FEW_SHOT_EXAMPLES).toHaveProperty("pbl");
      expect(FEW_SHOT_EXAMPLES).toHaveProperty("discovery");
      expect(FEW_SHOT_EXAMPLES).toHaveProperty("assessment");
    });

    it("should have meaningful content", () => {
      expect(FEW_SHOT_EXAMPLES.pbl).toContain("PBL");
      expect(FEW_SHOT_EXAMPLES.discovery).toContain("Discovery");
      expect(FEW_SHOT_EXAMPLES.assessment).toContain("Assessment");
    });
  });

  describe("Prompt structure validation", () => {
    it("should include required YAML structure for PBL", () => {
      const prompt = getPromptByMode({ ...mockInput, mode: "pbl" });

      // Check for required YAML fields
      expect(prompt).toContain("id:");
      expect(prompt).toContain("mode: pbl");
      expect(prompt).toContain("title:");
      expect(prompt).toContain("description:");
      expect(prompt).toContain("taskTemplates:");
      expect(prompt).toContain("pblData:");
    });

    it("should include multilingual format instructions", () => {
      const prompt = getPromptByMode(mockInput);

      expect(prompt).toContain("en:");
      expect(prompt).toContain("zhTW:");
      expect(prompt).toContain("traditional-chinese");
    });

    it("should specify correct difficulty mapping for Discovery", () => {
      const beginnerPrompt = getPromptByMode({
        ...mockInput,
        mode: "discovery",
        difficulty: "beginner",
      });
      expect(beginnerPrompt).toContain("entry");

      const advancedPrompt = getPromptByMode({
        ...mockInput,
        mode: "discovery",
        difficulty: "advanced",
      });
      expect(advancedPrompt).toContain("senior");
    });
  });
});
