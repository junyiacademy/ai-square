/**
 * TDD Example: Program Start Validator
 * Following Kent Beck's TDD principles:
 * 1. Red → Green → Refactor
 * 2. Write simplest failing test first
 * 3. Implement minimum code to pass
 * 4. Refactor only after tests pass
 */

import { validateProgramStart } from "../program-validator";
import type { IScenario } from "../../../types/unified-learning";
import type { DBUser } from "../../../types/database";

// Helper function to create complete mock scenario
const createMockScenario = (overrides: Partial<IScenario> = {}): IScenario => ({
  id: "scenario-123",
  mode: "pbl" as const,
  status: "active" as const,
  version: "1.0.0",
  sourceType: "yaml" as const,
  sourcePath: "test/scenario.yaml",
  sourceMetadata: {},
  title: { en: "Test Scenario" },
  description: { en: "Test Description" },
  objectives: ["Learn something"],
  difficulty: "beginner" as const,
  estimatedMinutes: 30,
  prerequisites: [],
  taskTemplates: [],
  xpRewards: { completion: 100 },
  unlockRequirements: {},
  pblData: {},
  discoveryData: {},
  assessmentData: {},
  aiModules: {},
  resources: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  publishedAt: new Date().toISOString(),
  metadata: {},
  ...overrides,
});

describe("validateProgramStart", () => {
  // Test 1: Write a failing test for a small behavior increment
  it("should return error when scenario is null", () => {
    const result = validateProgramStart(null, {
      id: "user-123",
      email: "user@example.com",
      name: "Test User",
      preferred_language: "en",
      level: 1,
      total_xp: 0,
      learning_preferences: {},
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      metadata: {},
    } as DBUser);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Scenario not found");
  });

  // Test 2: Another small increment
  it("should return error when user is null", () => {
    const mockScenario = createMockScenario();

    const result = validateProgramStart(mockScenario, null);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("User not authenticated");
  });

  // Test 3: Test for inactive scenario
  it("should return error when scenario is not active", () => {
    const mockScenario = createMockScenario({
      status: "archived", // Not active
    });

    const mockUser: DBUser = {
      id: "user-123",
      email: "user@example.com",
      name: "Test User",
      preferred_language: "en",
      level: 1,
      total_xp: 0,
      learning_preferences: {},
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      metadata: {},
    };

    const result = validateProgramStart(mockScenario, mockUser);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Scenario is not available");
  });

  // Test 4: Happy path - all validations pass
  it("should return valid when all requirements are met", () => {
    const mockScenario = createMockScenario({
      taskTemplates: [
        {
          id: "task-1",
          title: { en: "Task 1" },
          type: "chat",
          content: { instructions: "Do this" },
        },
      ],
    });

    const mockUser: DBUser = {
      id: "user-123",
      email: "user@example.com",
      name: "Test User",
      preferred_language: "en",
      level: 1,
      total_xp: 0,
      learning_preferences: {},
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      metadata: {},
    };

    const result = validateProgramStart(mockScenario, mockUser);

    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // Test 5: Edge case - scenario with no tasks
  it("should return error when scenario has no tasks", () => {
    const mockScenario = createMockScenario({
      taskTemplates: [], // Empty tasks
    });

    const mockUser: DBUser = {
      id: "user-123",
      email: "user@example.com",
      name: "Test User",
      preferred_language: "en",
      level: 1,
      total_xp: 0,
      learning_preferences: {},
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      metadata: {},
    };

    const result = validateProgramStart(mockScenario, mockUser);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Scenario has no tasks defined");
  });
});
