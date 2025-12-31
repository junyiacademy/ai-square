/**
 * Evaluation Strategy Pattern Tests
 * Following TDD Red → Green → Refactor
 */

import {
  IEvaluationStrategy,
  EvaluationStrategyFactory,
  PBLEvaluationStrategy,
  AssessmentEvaluationStrategy,
  DiscoveryEvaluationStrategy,
} from "../evaluation-strategies";
import {
  ITask,
  IProgram,
  IEvaluation,
  IEvaluationContext,
  IInteraction,
} from "@/types/unified-learning";
import {
  IPBLTask,
  IAssessmentTask,
  IDiscoveryTask,
} from "@/types/module-specific-types";

describe("Evaluation Strategy Pattern", () => {
  const baseContext: IEvaluationContext = {
    scenario: {
      id: "scenario-1",
      mode: "pbl",
      status: "active",
      version: "1.0.0",
      sourceType: "yaml",
      sourceMetadata: {},
      title: { en: "Test Scenario" },
      description: { en: "Test" },
      objectives: [],
      difficulty: "beginner",
      estimatedMinutes: 60,
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
    program: {
      id: "program-1",
      scenarioId: "scenario-1",
      userId: "user-123",
      mode: "pbl",
      status: "active",
      currentTaskIndex: 0,
      completedTaskCount: 0,
      totalTaskCount: 1,
      totalScore: 0,
      domainScores: {},
      xpEarned: 0,
      badgesEarned: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      timeSpentSeconds: 0,
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {},
    },
    previousEvaluations: [],
  };

  describe("EvaluationStrategyFactory", () => {
    it("should create PBL strategy for pbl source type", () => {
      const strategy = EvaluationStrategyFactory.createStrategy("pbl");
      expect(strategy).toBeInstanceOf(PBLEvaluationStrategy);
    });

    it("should create Assessment strategy for assessment source type", () => {
      const strategy = EvaluationStrategyFactory.createStrategy("assessment");
      expect(strategy).toBeInstanceOf(AssessmentEvaluationStrategy);
    });

    it("should create Discovery strategy for discovery source type", () => {
      const strategy = EvaluationStrategyFactory.createStrategy("discovery");
      expect(strategy).toBeInstanceOf(DiscoveryEvaluationStrategy);
    });

    it("should throw error for unknown source type", () => {
      expect(() => {
        EvaluationStrategyFactory.createStrategy("unknown" as any);
      }).toThrow("Unknown evaluation strategy: unknown");
    });
  });

  describe("PBLEvaluationStrategy", () => {
    let strategy: PBLEvaluationStrategy;

    beforeEach(() => {
      strategy = new PBLEvaluationStrategy();
    });

    it("should evaluate PBL task", async () => {
      const pblTask: IPBLTask = {
        id: "task-1",
        programId: "program-1",
        mode: "pbl",
        title: { en: "PBL Task" },
        type: "question",
        taskIndex: 0,
        status: "completed",
        userResponse: {},
        score: 0,
        maxScore: 100,
        interactionCount: 3,
        allowedAttempts: 3,
        attemptCount: 1,
        timeSpentSeconds: 300,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        interactions: [
          {
            timestamp: new Date().toISOString(),
            type: "user_input",
            content: "I think the solution is...",
          },
          {
            timestamp: new Date().toISOString(),
            type: "ai_response",
            content: "Good thinking! Can you elaborate?",
          },
          {
            timestamp: new Date().toISOString(),
            type: "user_input",
            content: "Yes, because...",
          },
        ],
        content: {
          instructions: { en: "Test" },
          context: {
            scenario: "Problem scenario",
            ksaCodes: ["K1", "S2", "A3"],
          },
        },
        aiConfig: {},
        pblData: {
          ksaFocus: {
            primary: ["K1"],
            secondary: ["S2", "A3"],
          },
        },
        discoveryData: {},
        assessmentData: {},
        metadata: { sourceType: "pbl" },
      };

      const evaluation = await strategy.evaluateTask(pblTask, baseContext);

      expect(evaluation.evaluationSubtype).toBe("pbl_task");
      expect(evaluation.taskId).toBe("task-1");
      expect(evaluation.score).toBeGreaterThan(0);
      expect(evaluation.domainScores).toBeDefined();
      expect(Object.keys(evaluation.domainScores).length).toBe(3); // KSA dimensions
      expect(evaluation.metadata?.interactionCount).toBe(3);
      expect(evaluation.metadata?.ksaCodes).toEqual(["K1", "S2", "A3"]);
    });

    it("should evaluate program with aggregated KSA scores", async () => {
      const taskEvaluations: IEvaluation[] = [
        {
          id: "eval-1",
          taskId: "task-1",
          programId: "program-1",
          userId: "user-123",
          mode: "pbl",
          evaluationType: "task",
          evaluationSubtype: "pbl_task",
          score: 80,
          maxScore: 100,
          domainScores: {
            knowledge: 85,
            skills: 75,
            attitudes: 80,
          },
          feedbackData: {},
          aiAnalysis: {},
          timeTakenSeconds: 0,
          pblData: {},
          discoveryData: {},
          assessmentData: {},
          createdAt: new Date().toISOString(),
          metadata: { sourceType: "pbl" },
        },
        {
          id: "eval-2",
          taskId: "task-2",
          programId: "program-1",
          userId: "user-123",
          mode: "pbl",
          evaluationType: "task",
          evaluationSubtype: "pbl_task",
          score: 90,
          maxScore: 100,
          domainScores: {
            knowledge: 90,
            skills: 90,
            attitudes: 90,
          },
          feedbackData: {},
          aiAnalysis: {},
          timeTakenSeconds: 0,
          pblData: {},
          discoveryData: {},
          assessmentData: {},
          createdAt: new Date().toISOString(),
          metadata: { sourceType: "pbl" },
        },
      ];

      const evaluation = await strategy.evaluateProgram(
        baseContext.program,
        taskEvaluations,
      );

      expect(evaluation.evaluationSubtype).toBe("pbl_completion");
      expect(evaluation.score).toBe(85); // Average of 80 and 90
      expect(evaluation.domainScores).toBeDefined();
      // domainScores should be aggregated as Record<string, number>
      expect(evaluation.domainScores).toBeDefined();
      expect(evaluation.domainScores.knowledge).toBe(88); // Average of 85 and 90, rounded
      expect(evaluation.domainScores.skills).toBe(83); // Average of 75 and 90, rounded
      expect(evaluation.domainScores.attitudes).toBe(85); // Average of 80 and 90, rounded
    });

    it("should calculate quality metrics", () => {
      const interactions: IInteraction[] = [
        {
          timestamp: new Date().toISOString(),
          type: "user_input",
          content: "Short answer",
        },
        {
          timestamp: new Date().toISOString(),
          type: "ai_response",
          content: "Can you explain more?",
        },
        {
          timestamp: new Date().toISOString(),
          type: "user_input",
          content:
            "This is a much longer and more detailed explanation about the problem...",
        },
      ];

      const metrics = strategy["calculateQualityMetrics"](interactions);

      expect(metrics.interactionDepth).toBeGreaterThan(0);
      expect(metrics.responseQuality).toBeGreaterThan(0);
      expect(metrics.engagementLevel).toBeGreaterThan(0);
    });
  });

  describe("AssessmentEvaluationStrategy", () => {
    let strategy: AssessmentEvaluationStrategy;

    beforeEach(() => {
      strategy = new AssessmentEvaluationStrategy();
    });

    it("should evaluate assessment task with correct answers", async () => {
      const assessmentTask: IAssessmentTask = {
        id: "task-1",
        programId: "program-1",
        mode: "assessment",
        title: { en: "Assessment" },
        type: "question",
        taskIndex: 0,
        status: "completed",
        userResponse: {},
        score: 0,
        maxScore: 100,
        interactionCount: 3,
        allowedAttempts: 1,
        attemptCount: 1,
        timeSpentSeconds: 300,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        interactions: [
          {
            timestamp: new Date().toISOString(),
            type: "user_input",
            content: "A",
            metadata: { questionId: "q1", isCorrect: true },
          },
          {
            timestamp: new Date().toISOString(),
            type: "user_input",
            content: "B",
            metadata: { questionId: "q2", isCorrect: false },
          },
          {
            timestamp: new Date().toISOString(),
            type: "user_input",
            content: "C",
            metadata: { questionId: "q3", isCorrect: true },
          },
        ],
        content: {
          context: {
            questions: [
              {
                id: "q1",
                type: "multiple-choice",
                question: "Q1",
                domain: "Engaging_with_AI",
              },
              {
                id: "q2",
                type: "multiple-choice",
                question: "Q2",
                domain: "Creating_with_AI",
              },
              {
                id: "q3",
                type: "multiple-choice",
                question: "Q3",
                domain: "Engaging_with_AI",
              },
            ],
          },
        },
        aiConfig: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {
          questions: [
            {
              id: "q1",
              type: "multiple-choice",
              question: "Q1",
              domain: "Engaging_with_AI",
            },
            {
              id: "q2",
              type: "multiple-choice",
              question: "Q2",
              domain: "Creating_with_AI",
            },
            {
              id: "q3",
              type: "multiple-choice",
              question: "Q3",
              domain: "Engaging_with_AI",
            },
          ] as any,
          timeLimit: 1800,
        },
        metadata: { sourceType: "assessment" },
      };

      const evaluation = await strategy.evaluateTask(assessmentTask, {
        ...baseContext,
        scenario: { ...baseContext.scenario, mode: "assessment" },
      });

      expect(evaluation.evaluationSubtype).toBe("assessment_task");
      expect(Math.round(evaluation.score * 100) / 100).toBe(66.67); // 2 out of 3 correct
      expect(evaluation.metadata?.totalQuestions).toBe(3);
      expect(evaluation.metadata?.correctAnswers).toBe(2);
      expect(evaluation.domainScores).toBeDefined();
      // Check domain scores which should be in metadata
      const domainScores = evaluation.metadata?.domainScores || {};
      expect((domainScores as any)["Engaging_with_AI"]?.correct).toBe(2);
      expect((domainScores as any)["Engaging_with_AI"]?.total).toBe(2);
      expect((domainScores as any)["Creating_with_AI"]?.correct).toBe(0);
      expect((domainScores as any)["Creating_with_AI"]?.total).toBe(1);
    });

    it("should calculate time-based bonus", () => {
      const timeSpent = 600; // 10 minutes
      const timeLimit = 1800; // 30 minutes
      const bonus = strategy["calculateTimeBonus"](timeSpent, timeLimit);

      expect(bonus).toBeGreaterThan(0);
      expect(bonus).toBeLessThanOrEqual(10); // Max 10% bonus
    });
  });

  describe("DiscoveryEvaluationStrategy", () => {
    let strategy: DiscoveryEvaluationStrategy;

    beforeEach(() => {
      strategy = new DiscoveryEvaluationStrategy();
    });

    it("should evaluate discovery task with XP rewards", async () => {
      const discoveryTask: IDiscoveryTask = {
        id: "task-1",
        programId: "program-1",
        mode: "discovery",
        title: { en: "Explore AI Tools" },
        type: "analysis",
        taskIndex: 0,
        status: "completed",
        userResponse: {},
        score: 0,
        maxScore: 100,
        interactionCount: 3,
        allowedAttempts: 999,
        attemptCount: 1,
        timeSpentSeconds: 300,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        interactions: [
          {
            timestamp: new Date().toISOString(),
            type: "user_input",
            content: "Trying prompt 1",
          },
          {
            timestamp: new Date().toISOString(),
            type: "system_event",
            content: "Tool response",
            metadata: { toolUsed: "chatgpt" },
          },
          {
            timestamp: new Date().toISOString(),
            type: "user_input",
            content: "Trying prompt 2",
          },
          {
            timestamp: new Date().toISOString(),
            type: "system_event",
            content: "Challenge completed",
            metadata: { challengeId: "c1" },
          },
        ],
        content: {
          context: {
            explorationGoals: ["Try different prompts", "Complete challenge"],
            challenges: [
              { id: "c1", description: "Create a story", xpReward: 50 },
            ],
          },
        },
        aiConfig: {},
        pblData: {},
        discoveryData: {
          explorationPrompt: "Explore AI Tools",
          toolsToExplore: ["chatgpt"],
          xpReward: 100,
        },
        assessmentData: {},
        metadata: { sourceType: "discovery" },
      };

      const evaluation = await strategy.evaluateTask(discoveryTask, {
        ...baseContext,
        scenario: { ...baseContext.scenario, mode: "discovery" },
      });

      expect(evaluation.evaluationSubtype).toBe("discovery_task");
      expect(evaluation.score).toBeGreaterThan(0);
      // Check discovery data instead of metadata
      const discoveryData = evaluation.discoveryData as any;
      expect(discoveryData?.xpEarned).toBeGreaterThan(0);
      expect(discoveryData?.toolsExplored).toContain("chatgpt");
      expect(discoveryData?.challengesCompleted).toContain("c1");
    });

    it("should calculate exploration score", () => {
      const interactions: IInteraction[] = [
        {
          timestamp: new Date().toISOString(),
          type: "user_input",
          content: "Test 1",
        },
        {
          timestamp: new Date().toISOString(),
          type: "user_input",
          content: "Test 2",
        },
        {
          timestamp: new Date().toISOString(),
          type: "system_event",
          content: "Achievement unlocked",
        },
      ];
      const goals = ["Goal 1", "Goal 2"];

      const score = strategy["calculateExplorationScore"](interactions, goals);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should award milestone XP", async () => {
      const program: IProgram = {
        ...baseContext.program,
        metadata: { sourceType: "discovery", totalXP: 450 },
      };

      const taskEvaluations: IEvaluation[] = [
        {
          id: "eval-1",
          taskId: "task-1",
          programId: "program-1",
          userId: "user-123",
          mode: "discovery",
          evaluationType: "task",
          evaluationSubtype: "discovery_task",
          score: 100,
          maxScore: 100,
          domainScores: {},
          feedbackData: {},
          aiAnalysis: {},
          timeTakenSeconds: 0,
          pblData: {},
          discoveryData: {
            xpEarned: 100,
          },
          assessmentData: {},
          createdAt: new Date().toISOString(),
          metadata: { sourceType: "discovery", xpEarned: 100 },
        },
      ];

      const evaluation = await strategy.evaluateProgram(
        program,
        taskEvaluations,
      );

      // Check discovery data for XP and milestones
      const discoveryData = evaluation.discoveryData as any;
      expect(discoveryData?.totalXP).toBe(600); // 450 + 100 + 50 bonus (500 XP milestone)
      expect(discoveryData?.milestonesAchieved).toContain("500_xp"); // Crossed 500 XP milestone
      expect(discoveryData?.bonusXP).toBeGreaterThan(0); // Milestone bonus
    });
  });
});
