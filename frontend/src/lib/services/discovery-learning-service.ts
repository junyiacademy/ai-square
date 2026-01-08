/**
 * Discovery Learning Service
 *
 * 實作統一學習架構中的 Discovery 模組
 * 負責處理職涯探索學習的業務邏輯
 */

import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import type {
  IScenario,
  IProgram,
  ITask,
  IEvaluation,
  IInteraction,
} from "@/types/unified-learning";
// TaskType imported but not used - keeping for consistency
import type {
  BaseLearningService,
  LearningOptions,
  LearningProgress,
  TaskResult,
  CompletionResult,
} from "./base-learning-service";

export interface DiscoveryScenarioData {
  pathId: string;
  category: string;
  skillTree?: {
    core_skills: Array<{
      id: string;
      name: string;
      unlocks: string[];
      max_level: number;
      description: string;
    }>;
    advanced_skills?: Array<{
      id: string;
      name: string;
      requires: string[];
      max_level: number;
      description: string;
    }>;
  };
  worldSetting: {
    name: Record<string, string>;
    description: Record<string, string>;
    atmosphere?: string;
    visualTheme?: string;
    challenges?: Array<{
      id: string;
      title: Record<string, string>;
      difficulty: "beginner" | "intermediate" | "advanced";
      xpReward: number;
      skills: string[];
    }>;
  };
  careerInsights?: {
    typical_day: Record<string, string>;
  };
  difficultyRange?: string;
  startingScenario?: {
    title: Record<string, string>;
    description: Record<string, string>;
  };
  // Legacy fields for backward compatibility
  career?: {
    id: string;
    title: Record<string, string>;
    description: Record<string, string>;
    requiredSkills: string[];
    relatedDomains: string[];
  };
  progressionPath?: Array<{
    level: number;
    title: Record<string, string>;
    requiredXP: number;
    unlockables: string[];
  }>;
}

export interface DiscoveryProgress {
  totalXP: number;
  level: number;
  achievements: string[];
  unlockedSkills: string[];
  completedChallenges: string[];
}

export class DiscoveryLearningService implements BaseLearningService {
  private scenarioRepo = repositoryFactory.getScenarioRepository();
  private programRepo = repositoryFactory.getProgramRepository();
  private taskRepo = repositoryFactory.getTaskRepository();
  private evaluationRepo = repositoryFactory.getEvaluationRepository();

  async startLearning(
    userId: string,
    scenarioId: string,
    options?: LearningOptions,
  ): Promise<IProgram> {
    // 1. 載入 Scenario
    const scenario = await this.scenarioRepo.findById(scenarioId);
    if (!scenario) {
      throw new Error("Scenario not found");
    }

    // 2. 驗證是 Discovery 類型
    if (scenario.mode !== "discovery" || !scenario.discoveryData) {
      throw new Error("Scenario is not a discovery scenario");
    }

    const discoveryData =
      scenario.discoveryData as unknown as DiscoveryScenarioData;

    // 3. 創建 Program
    const program = await this.programRepo.create({
      userId,
      scenarioId,
      mode: "discovery",
      status: "active",
      currentTaskIndex: 0,
      completedTaskCount: 0,
      totalTaskCount: 0, // 動態生成，初始為0
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
      discoveryData: {
        totalXP: 0,
        level: 1,
        achievements: [],
        unlockedSkills: [],
        completedChallenges: [],
        currentCareer: discoveryData.pathId || "unknown",
        worldSetting:
          discoveryData.worldSetting?.name?.[options?.language || "en"] ||
          "Adventure World",
      },
      assessmentData: {},
      metadata: {
        language: options?.language || "en",
      },
    });

    // 4. 生成初始任務（探索階段）
    const initialTasks = await this.generateInitialTasks(
      program,
      scenario,
      options?.language || "en",
    );

    // 更新總任務數
    await this.programRepo.update?.(program.id, {
      totalTaskCount: initialTasks.length,
    });

    return program;
  }

  async getProgress(programId: string): Promise<LearningProgress> {
    const program = await this.programRepo.findById(programId);
    if (!program) {
      throw new Error("Program not found");
    }

    const tasks = await this.taskRepo.findByProgram(programId);
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const currentTask = tasks.find((t) => t.status === "active");

    const discoveryProgress =
      program.discoveryData as unknown as DiscoveryProgress;
    const totalTimeSpent = tasks.reduce(
      (sum, task) => sum + task.timeSpentSeconds,
      0,
    );

    return {
      programId,
      status:
        program.status === "abandoned"
          ? "expired"
          : (program.status as "pending" | "active" | "completed" | "expired"),
      currentTaskIndex: program.currentTaskIndex,
      totalTasks: tasks.length,
      completedTasks,
      score: discoveryProgress.totalXP,
      timeSpent: totalTimeSpent,
      estimatedTimeRemaining: this.estimateRemainingTime(tasks),
      metadata: {
        currentTaskId: currentTask?.id,
        level: discoveryProgress.level,
        totalXP: discoveryProgress.totalXP,
        achievements: discoveryProgress.achievements,
        unlockedSkills: discoveryProgress.unlockedSkills,
        nextLevelXP: this.getNextLevelXP(discoveryProgress.level),
      },
    };
  }

  async submitResponse(
    programId: string,
    taskId: string,
    response: Record<string, unknown>,
  ): Promise<TaskResult> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const program = await this.programRepo.findById(programId);
    if (!program) {
      throw new Error("Program not found");
    }

    // 創建互動記錄
    const interaction: IInteraction = {
      timestamp: new Date().toISOString(),
      type: (response.type as "user_input") || "user_input",
      content: response,
    };

    // 更新互動記錄
    const updatedInteractions = [...task.interactions, interaction];
    await this.taskRepo.updateInteractions?.(taskId, updatedInteractions);

    // 評估任務完成情況
    const taskResult = await this.evaluateTaskCompletion(task, response);

    if (taskResult.completed) {
      // 更新任務狀態
      if (this.taskRepo.updateStatus) {
        await this.taskRepo.updateStatus(taskId, "completed");
      }

      // 更新程序進度
      const discoveryData =
        program.discoveryData as unknown as DiscoveryProgress;
      discoveryData.totalXP += taskResult.xpEarned;
      discoveryData.completedChallenges.push(task.id);

      // 檢查升級
      const newLevel = this.calculateLevel(discoveryData.totalXP);
      if (newLevel > discoveryData.level) {
        discoveryData.level = newLevel;
        discoveryData.achievements.push(`Reached Level ${newLevel}`);

        // 解鎖新技能
        const newSkills = await this.unlockSkillsForLevel(newLevel);
        discoveryData.unlockedSkills.push(...newSkills);
      }

      if (this.programRepo.update) {
        await this.programRepo.update(programId, {
          discoveryData: discoveryData as unknown as Record<string, unknown>,
          xpEarned: discoveryData.totalXP,
        });
      }

      // 生成新任務（如果需要）
      if (taskResult.generateNewTasks) {
        await this.generateNewTasks(program, task);
      }
    }

    return {
      taskId,
      success: true,
      score: taskResult.xpEarned,
      feedback: taskResult.feedback,
      nextTaskAvailable: taskResult.completed,
      metadata: {
        xpEarned: taskResult.xpEarned,
        newAchievements: taskResult.achievements,
        skillsUnlocked: taskResult.skillsUnlocked,
        completed: taskResult.completed,
      },
    };
  }

  async completeLearning(programId: string): Promise<CompletionResult> {
    const program = await this.programRepo.findById(programId);
    if (!program) {
      throw new Error("Program not found");
    }

    const tasks = await this.taskRepo.findByProgram(programId);
    const discoveryData = program.discoveryData as unknown as DiscoveryProgress;

    // 創建總結評估
    const evaluation = await this.evaluationRepo.create({
      userId: program.userId,
      programId,
      taskId: "",
      mode: "discovery",
      evaluationType: "summative",
      evaluationSubtype: "career_journey_complete",
      score: discoveryData.totalXP,
      maxScore: 1000, // 假設最大 XP
      domainScores: await this.calculateSkillProgress(tasks),
      feedbackText: await this.generateJourneyFeedback(program, tasks),
      feedbackData: {
        totalXP: discoveryData.totalXP,
        finalLevel: discoveryData.level,
        achievements: discoveryData.achievements,
        completedChallenges: discoveryData.completedChallenges.length,
        totalChallenges: tasks.length,
        timeSpent: tasks.reduce((sum, t) => sum + t.timeSpentSeconds, 0),
      },
      aiAnalysis: {},
      timeTakenSeconds: tasks.reduce((sum, t) => sum + t.timeSpentSeconds, 0),
      createdAt: new Date().toISOString(),
      pblData: {},
      discoveryData: {
        careerExplored: (program.discoveryData as Record<string, unknown>)
          .currentCareer,
        skillsAcquired: discoveryData.unlockedSkills,
        finalLevel: discoveryData.level,
      },
      assessmentData: {},
      metadata: {},
    });

    // 更新 Program 狀態
    await this.programRepo.complete(programId);

    return {
      program,
      evaluation,
      passed: discoveryData.level >= 5, // 至少達到 5 級
      finalScore: discoveryData.totalXP,
      metadata: {
        achievements: discoveryData.achievements,
        skillsMastered: discoveryData.unlockedSkills,
        careerReadiness: this.calculateCareerReadiness(discoveryData),
      },
    };
  }

  async getNextTask(programId: string): Promise<ITask | null> {
    const tasks = await this.taskRepo.findByProgram(programId);
    return (
      tasks.find((t) => t.status === "active") ||
      tasks.find((t) => t.status === "pending") ||
      null
    );
  }

  async evaluateTask(taskId: string): Promise<IEvaluation> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const xpEarned =
      ((task.discoveryData as Record<string, unknown>)?.xpReward as number) ||
      50;

    const evaluation = await this.evaluationRepo.create({
      userId: "",
      programId: task.programId,
      taskId: task.id,
      mode: "discovery",
      evaluationType: "formative",
      evaluationSubtype: "challenge_complete",
      score: xpEarned,
      maxScore: 100,
      domainScores: {},
      feedbackText: `Challenge completed! You earned ${xpEarned} XP.`,
      feedbackData: {
        xpEarned,
        challengeType: task.type,
        timeSpent: task.timeSpentSeconds,
        skills: (task.discoveryData as Record<string, unknown>)?.skills || [],
      },
      aiAnalysis: {},
      timeTakenSeconds: task.timeSpentSeconds,
      createdAt: new Date().toISOString(),
      pblData: {},
      discoveryData: {
        xpEarned,
        challengeId: task.id,
      },
      assessmentData: {},
      metadata: {},
    });

    return evaluation;
  }

  async generateFeedback(
    evaluationId: string,
    language: string,
  ): Promise<string> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) {
      throw new Error("Evaluation not found");
    }

    // TODO: AI 生成的個人化回饋
    const templates = {
      en: `Great exploration! You've earned ${evaluation.score} XP on your career journey. ${evaluation.feedbackText}`,
      zh: `探索得很好！你在職涯旅程中獲得了 ${evaluation.score} XP。${evaluation.feedbackText}`,
      es: `¡Excelente exploración! Has ganado ${evaluation.score} XP en tu viaje profesional. ${evaluation.feedbackText}`,
    };

    return templates[language as keyof typeof templates] || templates.en;
  }

  // Private helper methods

  private async generateInitialTasks(
    program: IProgram,
    scenario: IScenario,
    language: string,
  ): Promise<ITask[]> {
    const discoveryData =
      scenario.discoveryData as unknown as DiscoveryScenarioData;
    const tasks: ITask[] = [];

    // 1. 歡迎任務
    const welcomeTask = await this.taskRepo.create({
      programId: program.id,
      scenarioId: scenario.id,
      mode: "discovery",
      taskIndex: 0,
      title: {
        en: "Welcome to Your Career Journey",
        zh: "歡迎來到你的職涯旅程",
        es: "Bienvenido a tu Viaje Profesional",
      },
      type: "chat",
      status: "active",
      content: {
        instructions:
          discoveryData.worldSetting.description[language] ||
          "Welcome to your career journey!",
        career:
          (scenario.title as Record<string, string>)[language] || "Career Path",
        worldSetting:
          discoveryData.worldSetting.name[language] || "Adventure World",
      },
      interactions: [],
      interactionCount: 0,
      userResponse: {},
      score: 0,
      maxScore: 50,
      allowedAttempts: 1,
      attemptCount: 0,
      timeSpentSeconds: 0,
      aiConfig: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pblData: {},
      discoveryData: {
        xpReward: 50,
        challengeType: "introduction",
        skills: [],
      },
      assessmentData: {},
      metadata: {},
    });
    tasks.push(welcomeTask);

    // 2. 生成初始技能挑戰（基於 core_skills）
    const coreSkills = discoveryData.skillTree?.core_skills || [];
    const initialSkills = coreSkills.slice(0, 3); // 前3個核心技能

    for (let i = 0; i < initialSkills.length; i++) {
      const skill = initialSkills[i];
      const task = await this.taskRepo.create({
        programId: program.id,
        scenarioId: scenario.id,
        mode: "discovery",
        taskIndex: i + 1,
        title: {
          en: `Learn ${skill.name}`,
          zh: `學習 ${skill.name}`,
          es: `Aprender ${skill.name}`,
        },
        type: "creation",
        status: "pending",
        content: {
          instructions: skill.description,
          skillId: skill.id,
          difficulty: "beginner",
          unlocks: skill.unlocks,
        },
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 3,
        attemptCount: 0,
        timeSpentSeconds: 0,
        aiConfig: {
          evaluationCriteria: [skill.id],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {
          xpReward: 100,
          challengeType: "skill_development",
          difficulty: "beginner",
          skills: [skill.id],
          skillName: skill.name,
        },
        assessmentData: {},
        metadata: {},
      });
      tasks.push(task);
    }

    return tasks;
  }

  private async evaluateTaskCompletion(
    task: ITask,
    response: Record<string, unknown>,
  ): Promise<{
    completed: boolean;
    xpEarned: number;
    feedback: string;
    achievements: string[];
    skillsUnlocked: string[];
    generateNewTasks: boolean;
  }> {
    const discoveryTaskData = task.discoveryData as Record<string, unknown>;
    const xpReward = (discoveryTaskData.xpReward as number) || 50;

    // 簡單的完成判斷
    const completed =
      response.completed === true ||
      response.solution !== undefined ||
      task.interactions.length >= 3;

    const achievements: string[] = [];
    const skillsUnlocked: string[] = [];

    if (completed) {
      // 檢查是否解鎖成就
      if (
        task.type === "creation" &&
        discoveryTaskData.difficulty === "advanced"
      ) {
        achievements.push("Advanced Challenge Master");
      }

      // 檢查是否應該解鎖新技能
      const taskSkills = (discoveryTaskData.skills as string[]) || [];
      if (taskSkills.length > 0) {
        skillsUnlocked.push(...taskSkills);
      }
    }

    return {
      completed,
      xpEarned: completed ? xpReward : 0,
      feedback: completed
        ? "Excellent work! You've successfully completed this challenge."
        : "Keep working on it! You're making progress.",
      achievements,
      skillsUnlocked,
      generateNewTasks: completed && task.taskIndex < 3, // 前3個任務完成後生成新任務
    };
  }

  private async generateNewTasks(
    program: IProgram,
    completedTask: ITask,
  ): Promise<void> {
    const scenario = await this.scenarioRepo.findById(program.scenarioId);
    if (!scenario) return;

    const discoveryData =
      scenario.discoveryData as unknown as DiscoveryScenarioData;

    // Use completedTask to determine next difficulty
    void completedTask; // Mark as intentionally unused for now
    const programDiscoveryData =
      program.discoveryData as unknown as DiscoveryProgress;

    // 根據等級選擇適當的技能挑戰
    const coreSkills = discoveryData.skillTree?.core_skills || [];
    const advancedSkills = discoveryData.skillTree?.advanced_skills || [];

    // 基於等級選擇技能
    const availableSkills =
      programDiscoveryData.level < 3
        ? coreSkills
        : programDiscoveryData.level < 6
          ? [...coreSkills, ...advancedSkills.slice(0, 2)]
          : [...coreSkills, ...advancedSkills];

    // 找到還未完成的技能
    const uncompletedSkills = availableSkills.filter(
      (skill) => !programDiscoveryData.completedChallenges.includes(skill.id),
    );

    if (uncompletedSkills.length > 0) {
      const nextSkill = uncompletedSkills[0];
      const tasks = await this.taskRepo.findByProgram(program.id);
      const isAdvancedSkill = advancedSkills.some(
        (skill) => skill.id === nextSkill.id,
      );
      const difficulty = isAdvancedSkill ? "advanced" : "intermediate";

      await this.taskRepo.create({
        programId: program.id,
        scenarioId: scenario.id,
        mode: "discovery",
        taskIndex: tasks.length,
        title: {
          en: `Master ${nextSkill.name}`,
          zh: `掌握 ${nextSkill.name}`,
          es: `Dominar ${nextSkill.name}`,
        },
        type: "creation",
        status: "pending",
        content: {
          instructions: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} skill unlocked! ${nextSkill.description}`,
          skillId: nextSkill.id,
          difficulty,
          unlocks: "unlocks" in nextSkill ? nextSkill.unlocks : [],
        },
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: difficulty === "advanced" ? 150 : 100,
        allowedAttempts: 3,
        attemptCount: 0,
        timeSpentSeconds: 0,
        aiConfig: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {
          xpReward: difficulty === "advanced" ? 150 : 100,
          challengeType: "skill_advancement",
          difficulty,
          skills: [nextSkill.id],
          skillName: nextSkill.name,
        },
        assessmentData: {},
        metadata: {},
      });
    }
  }

  private calculateLevel(totalXP: number): number {
    // 簡單的等級計算：每100 XP升一級
    return Math.floor(totalXP / 100) + 1;
  }

  private getNextLevelXP(currentLevel: number): number {
    return currentLevel * 100;
  }

  private async unlockSkillsForLevel(level: number): Promise<string[]> {
    const skillsByLevel: Record<number, string[]> = {
      2: ["Basic AI Understanding", "Problem Identification"],
      3: ["Data Analysis", "Creative Thinking"],
      4: ["AI Tool Usage", "Solution Design"],
      5: ["Advanced AI Concepts", "Implementation Skills"],
      6: ["AI Ethics", "System Design"],
      7: ["AI Leadership", "Innovation"],
    };

    return skillsByLevel[level] || [];
  }

  private estimateRemainingTime(tasks: ITask[]): number {
    const pendingTasks = tasks.filter((t) => t.status === "pending").length;
    const activeTasks = tasks.filter((t) => t.status === "active").length;

    // 估計每個任務需要 20 分鐘
    return (pendingTasks + activeTasks) * 20 * 60;
  }

  private async calculateSkillProgress(
    tasks: ITask[],
  ): Promise<Record<string, number>> {
    const skillProgress: Record<string, number> = {};

    for (const task of tasks) {
      if (task.status === "completed") {
        const skills =
          ((task.discoveryData as Record<string, unknown>)
            ?.skills as string[]) || [];
        for (const skill of skills) {
          skillProgress[skill] = (skillProgress[skill] || 0) + 1;
        }
      }
    }

    // 正規化為百分比
    const maxCount = Math.max(...Object.values(skillProgress), 1);
    for (const skill in skillProgress) {
      skillProgress[skill] = (skillProgress[skill] / maxCount) * 100;
    }

    return skillProgress;
  }

  private async generateJourneyFeedback(
    program: IProgram,
    tasks: ITask[],
  ): Promise<string> {
    const discoveryData = program.discoveryData as unknown as DiscoveryProgress;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;

    return `Congratulations on completing your career exploration journey!
    You've reached Level ${discoveryData.level} with ${discoveryData.totalXP} XP earned.
    Through ${completedTasks} challenges, you've unlocked ${discoveryData.unlockedSkills.length} skills
    and earned ${discoveryData.achievements.length} achievements.
    Your journey shows strong potential in your chosen career path!`;
  }

  private calculateCareerReadiness(discoveryData: DiscoveryProgress): number {
    // 基於等級、XP 和解鎖技能計算職涯準備度
    const levelScore = Math.min(discoveryData.level * 10, 50);
    const xpScore = Math.min(discoveryData.totalXP / 20, 30);
    const skillScore = Math.min(discoveryData.unlockedSkills.length * 2, 20);

    return levelScore + xpScore + skillScore;
  }
}
