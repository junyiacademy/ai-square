import { UnifiedEvaluationSystem } from "../unified-evaluation-system";
import type {
  IEvaluationContext,
  IEvaluation,
  IProgram,
  ITask,
  IInteraction,
} from "@/types/unified-learning";
import type { LearningMode } from "@/types/database";
import { BaseAIService } from "@/lib/abstractions/base-ai-service";

class MockAIService extends BaseAIService {
  // eslint-disable-next-line @typescript-eslint/require-await
  async generateContent(_: {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{ content: string }> {
    return { content: "Generated feedback text" };
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async generateChat(
    _: Array<{ role: string; content: string }>,
  ): Promise<{ content: string }> {
    return { content: "Chat response" };
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async evaluateResponse(
    _: string,
    __: string,
    ___: string[],
  ): Promise<number> {
    return 0.9;
  }
}

function createInteraction(
  type: IInteraction["type"],
  isCorrect?: boolean,
): IInteraction {
  return {
    timestamp: new Date().toISOString(),
    type,
    content: { text: "hello" },
    metadata: typeof isCorrect === "boolean" ? { isCorrect } : undefined,
  };
}

function createTask(mode: LearningMode, extras?: Partial<ITask>): ITask {
  const base: ITask = {
    id: "task-1",
    programId: "program-1",
    mode,
    taskIndex: 0,
    type: "question",
    status: "active",
    content: { context: {} },
    interactions: [],
    interactionCount: 0,
    userResponse: {},
    score: 0,
    maxScore: 100,
    allowedAttempts: 1,
    attemptCount: 0,
    timeSpentSeconds: 0,
    aiConfig: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {},
  };
  return { ...base, ...extras };
}

function createProgram(
  mode: LearningMode,
  extras?: Partial<IProgram>,
): IProgram {
  const base: IProgram = {
    id: "program-1",
    userId: "user-1",
    scenarioId: "scenario-1",
    mode,
    status: "active",
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 1,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    timeSpentSeconds: 0,
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {},
  };
  return { ...base, ...extras };
}

function createContext(
  mode: LearningMode,
  extras?: Partial<IEvaluationContext>,
): IEvaluationContext {
  return {
    scenario: {
      id: "scenario-1",
      mode,
      status: "active",
      version: "1.0",
      sourceType: "yaml",
      sourceMetadata: {},
      title: { en: "Title" },
      description: { en: "Desc" },
      objectives: [],
      difficulty: "beginner",
      estimatedMinutes: 10,
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
    },
    program: createProgram(mode),
    ...extras,
  };
}

describe("UnifiedEvaluationSystem", () => {
  it("evaluates PBL task with KSA domain scores and interaction metadata", async () => {
    const ai = new MockAIService();
    const system = new UnifiedEvaluationSystem(ai);

    const interactions: IInteraction[] = [
      createInteraction("user_input"),
      createInteraction("ai_response"),
      createInteraction("user_input"),
      createInteraction("user_input"),
      createInteraction("user_input"),
      createInteraction("user_input"),
    ];

    const task = createTask("pbl", {
      interactions,
      content: {
        context: { ksaCodes: ["K1", "S2"] } as Record<string, unknown>,
      },
    });

    const context = createContext("pbl");

    const evalResult = await system.evaluateTask(task, context);
    expect(evalResult.mode).toBe("pbl");
    expect(evalResult.evaluationType).toBe("task");
    expect(evalResult.domainScores).toEqual(
      expect.objectContaining({
        knowledge: expect.any(Number),
        skills: expect.any(Number),
        attitudes: expect.any(Number),
      }),
    );
    expect(
      (evalResult.metadata as Record<string, unknown>).interactionCount,
    ).toBe(interactions.length);
    expect((evalResult.metadata as Record<string, unknown>).ksaCodes).toEqual([
      "K1",
      "S2",
    ]);
  });

  it("evaluates Assessment task: computes score and domain scores by question domains", async () => {
    const ai = new MockAIService();
    const system = new UnifiedEvaluationSystem(ai);

    const interactions: IInteraction[] = [
      createInteraction("user_input", true),
      createInteraction("user_input", false),
      createInteraction("user_input", true),
    ];

    const started = new Date(Date.now() - 5000).toISOString();
    const completed = new Date().toISOString();

    const task = createTask("assessment", {
      interactions,
      content: {
        context: {
          questions: [{ domain: "K" }, { domain: "S" }, { domain: "K" }],
        } as Record<string, unknown>,
      },
      startedAt: started,
      completedAt: completed,
    });

    const context = createContext("assessment");

    const evalResult = await system.evaluateTask(task, context);
    expect(evalResult.mode).toBe("assessment");
    expect(evalResult.score).toBeGreaterThan(0);
    expect(evalResult.domainScores.K).toBeGreaterThan(0);
    expect(
      (evalResult.metadata as Record<string, unknown>).totalQuestions,
    ).toBe(3);
    expect(
      (evalResult.metadata as Record<string, unknown>).correctAnswers,
    ).toBe(2);
    expect(
      (evalResult.metadata as Record<string, unknown>).timeSpent,
    ).toBeGreaterThanOrEqual(0);
  });

  it("evaluates Discovery task: computes XP and skillsImproved", async () => {
    const ai = new MockAIService();
    const system = new UnifiedEvaluationSystem(ai);

    const interactions: IInteraction[] = [
      createInteraction("user_input"),
      createInteraction("ai_response"),
      createInteraction("user_input"),
    ];

    const task = createTask("discovery", {
      interactions,
      content: {
        context: { requiredSkills: ["R1", "R2"] } as Record<string, unknown>,
      },
    });

    const context = createContext("discovery");

    const evalResult = await system.evaluateTask(task, context);
    expect(evalResult.mode).toBe("discovery");
    expect(evalResult.score).toBeGreaterThanOrEqual(0);
    const discoveryData = evalResult.discoveryData as Record<string, unknown>;
    expect(discoveryData.xpEarned).toBeDefined();
    expect(discoveryData.skillsImproved).toEqual(["R1", "R2"]);
  });

  it("falls back to Generic evaluation when mode is unknown", async () => {
    const ai = new MockAIService();
    const system = new UnifiedEvaluationSystem(ai);

    const unknownMode = "unknown" as unknown as LearningMode;
    const task = createTask(unknownMode, { interactions: [] });
    const context = createContext(unknownMode, {
      scenario: { ...createContext("pbl").scenario, mode: unknownMode },
    });

    const evalResult = await system.evaluateTask(task, context);
    expect(evalResult.evaluationSubtype).toBe("generic_task");
    expect(evalResult.score).toBe(0);
  });

  it("aggregates Program evaluation with averaged domain scores and feedback", async () => {
    const ai = new MockAIService();
    const system = new UnifiedEvaluationSystem(ai);

    const program = createProgram("pbl", {
      startedAt: new Date(Date.now() - 10_000).toISOString(),
      completedAt: new Date().toISOString(),
      timeSpentSeconds: 10,
    });

    const evals: IEvaluation[] = [
      {
        id: "e1",
        userId: "user-1",
        programId: "program-1",
        mode: "pbl",
        evaluationType: "task",
        score: 80,
        maxScore: 100,
        domainScores: { K: 80 },
        feedbackData: {},
        aiAnalysis: {},
        timeTakenSeconds: 1,
        createdAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {},
      },
      {
        id: "e2",
        userId: "user-1",
        programId: "program-1",
        mode: "pbl",
        evaluationType: "task",
        score: 90,
        maxScore: 100,
        domainScores: { K: 90, S: 70 },
        feedbackData: {},
        aiAnalysis: {},
        timeTakenSeconds: 1,
        createdAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {},
      },
    ];

    const result = await system.evaluateProgram(program, evals);
    expect(result.evaluationType).toBe("program");
    expect(result.score).toBeGreaterThan(0);
    expect(result.domainScores.K).toBeGreaterThan(0);
    expect((result.metadata as Record<string, unknown>).taskCount).toBe(2);
    expect(
      (result.metadata as Record<string, unknown>).completionTime,
    ).toBeGreaterThanOrEqual(0);
    expect(result.feedbackText).toContain("completed");
  });

  it("generateFeedback returns AI content and falls back on error", async () => {
    const ai = new MockAIService();
    const system = new UnifiedEvaluationSystem(ai);

    const evaluation: IEvaluation = {
      id: "e1",
      userId: "u1",
      mode: "pbl",
      evaluationType: "task",
      score: 50,
      maxScore: 100,
      domainScores: { K: 50 },
      feedbackText: "fallback",
      feedbackData: {},
      aiAnalysis: {},
      timeTakenSeconds: 0,
      createdAt: new Date().toISOString(),
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {},
    };

    const ok = await system.generateFeedback(evaluation, "zh-TW");
    expect(ok).toBe("Generated feedback text");

    // Make AI throw
    const throwingAI = {
      // eslint-disable-next-line @typescript-eslint/require-await
      async generateContent() {
        throw new Error("AI down");
      },
    } as unknown as BaseAIService;

    const system2 = new UnifiedEvaluationSystem(throwingAI);
    const fb = await system2.generateFeedback(evaluation, "en");
    expect(fb).toBe("fallback");
  });
});
