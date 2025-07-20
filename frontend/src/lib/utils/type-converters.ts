/**
 * Type conversion utilities for mapping between database entities and interface types
 * Handles conversion from Prisma models to unified learning interfaces
 */

import type {
  Scenario,
  Program,
  Task,
  Evaluation,
  Interaction
} from '@prisma/client';

import type {
  IScenario,
  IProgram,
  ITask,
  IEvaluation,
  IInteraction,
  ITaskTemplate
} from '@/types/unified-learning';

import type {
  LearningMode,
  ScenarioStatus,
  ProgramStatus,
  TaskStatus,
  TaskType,
  DifficultyLevel,
  SourceType
} from '@/types/database';

/**
 * Convert Prisma Scenario to IScenario interface
 */
export function convertScenarioToIScenario(scenario: Scenario): IScenario {
  // Parse JSON fields with type safety
  const title = scenario.title as Record<string, string>;
  const description = scenario.description as Record<string, string>;
  const objectives = scenario.objectives as string[];
  const taskTemplates = scenario.taskTemplates as ITaskTemplate[];
  const xpRewards = scenario.xpRewards as Record<string, number>;
  const unlockRequirements = scenario.unlockRequirements as Record<string, unknown>;
  const pblData = scenario.pblData as Record<string, unknown>;
  const discoveryData = scenario.discoveryData as Record<string, unknown>;
  const assessmentData = scenario.assessmentData as Record<string, unknown>;
  const aiModules = scenario.aiModules as Record<string, unknown>;
  const resources = scenario.resources as Array<Record<string, unknown>>;
  const sourceMetadata = scenario.sourceMetadata as Record<string, unknown>;
  const metadata = scenario.metadata as Record<string, unknown>;

  return {
    id: scenario.id,
    mode: scenario.mode as LearningMode,
    status: scenario.status as ScenarioStatus,
    version: scenario.version,
    
    // Source tracking
    sourceType: scenario.sourceType as SourceType,
    sourcePath: scenario.sourcePath || undefined,
    sourceId: scenario.sourceId || undefined,
    sourceMetadata,
    
    // Basic info
    title,
    description,
    objectives,
    
    // Common attributes
    difficulty: scenario.difficulty as DifficultyLevel,
    estimatedMinutes: scenario.estimatedMinutes,
    prerequisites: scenario.prerequisites,
    
    // Task templates
    taskTemplates,
    taskCount: scenario.taskCount,
    
    // Rewards and progression
    xpRewards,
    unlockRequirements,
    
    // Mode-specific data
    pblData,
    discoveryData,
    assessmentData,
    
    // Resources and AI
    aiModules,
    resources,
    
    // Timestamps
    createdAt: scenario.createdAt.toISOString(),
    updatedAt: scenario.updatedAt.toISOString(),
    publishedAt: scenario.publishedAt?.toISOString(),
    
    // Extensible metadata
    metadata
  };
}

/**
 * Convert Prisma Program to IProgram interface
 */
export function convertProgramToIProgram(program: Program): IProgram {
  // Parse JSON fields with type safety
  const dimensionScores = program.dimensionScores as Record<string, number>;
  const badgesEarned = program.badgesEarned as Array<Record<string, unknown>>;
  const pblData = program.pblData as Record<string, unknown>;
  const discoveryData = program.discoveryData as Record<string, unknown>;
  const assessmentData = program.assessmentData as Record<string, unknown>;
  const metadata = program.metadata as Record<string, unknown>;

  return {
    id: program.id,
    userId: program.userId,
    scenarioId: program.scenarioId,
    mode: program.mode as LearningMode,
    status: program.status as ProgramStatus,
    
    // Progress tracking
    currentTaskIndex: program.currentTaskIndex,
    completedTaskCount: program.completedTaskCount,
    totalTaskCount: program.totalTaskCount,
    
    // Scoring (unified)
    totalScore: program.totalScore,
    dimensionScores,
    
    // XP and rewards
    xpEarned: program.xpEarned,
    badgesEarned,
    
    // Timestamps (unified naming)
    createdAt: program.createdAt.toISOString(),
    startedAt: program.startedAt?.toISOString(),
    completedAt: program.completedAt?.toISOString(),
    updatedAt: program.updatedAt.toISOString(),
    lastActivityAt: program.lastActivityAt.toISOString(),
    
    // Time tracking
    timeSpentSeconds: program.timeSpentSeconds,
    
    // Mode-specific data
    pblData,
    discoveryData,
    assessmentData,
    
    // Extensible metadata
    metadata
  };
}

/**
 * Convert Prisma Task to ITask interface
 */
export function convertTaskToITask(task: Task): ITask {
  // Parse JSON fields with type safety
  const content = task.content as Record<string, unknown>;
  const interactions = task.interactions as IInteraction[];
  const userResponse = task.userResponse as Record<string, unknown>;
  const aiConfig = task.aiConfig as Record<string, unknown>;
  const pblData = task.pblData as Record<string, unknown>;
  const discoveryData = task.discoveryData as Record<string, unknown>;
  const assessmentData = task.assessmentData as Record<string, unknown>;
  const metadata = task.metadata as Record<string, unknown>;

  return {
    id: task.id,
    programId: task.programId,
    mode: task.mode as LearningMode,
    taskIndex: task.taskIndex,
    scenarioTaskIndex: task.scenarioTaskIndex || undefined,
    
    // Basic info
    title: task.title || undefined,
    description: task.description || undefined,
    type: task.type as TaskType,
    status: task.status as TaskStatus,
    
    // Content
    content,
    
    // Interaction tracking
    interactions,
    interactionCount: task.interactionCount,
    
    // Response/solution
    userResponse,
    
    // Scoring
    score: task.score,
    maxScore: task.maxScore,
    
    // Attempts and timing
    allowedAttempts: task.allowedAttempts,
    attemptCount: task.attemptCount,
    timeLimitSeconds: task.timeLimitSeconds || undefined,
    timeSpentSeconds: task.timeSpentSeconds,
    
    // AI configuration
    aiConfig,
    
    // Timestamps
    createdAt: task.createdAt.toISOString(),
    startedAt: task.startedAt?.toISOString(),
    completedAt: task.completedAt?.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    
    // Mode-specific data
    pblData,
    discoveryData,
    assessmentData,
    
    // Extensible metadata
    metadata
  };
}

/**
 * Convert Prisma Evaluation to IEvaluation interface
 */
export function convertEvaluationToIEvaluation(evaluation: Evaluation): IEvaluation {
  // Parse JSON fields with type safety
  const dimensionScores = evaluation.dimensionScores as Record<string, number>;
  const feedbackData = evaluation.feedbackData as Record<string, unknown>;
  const aiAnalysis = evaluation.aiAnalysis as Record<string, unknown>;
  const pblData = evaluation.pblData as Record<string, unknown>;
  const discoveryData = evaluation.discoveryData as Record<string, unknown>;
  const assessmentData = evaluation.assessmentData as Record<string, unknown>;
  const metadata = evaluation.metadata as Record<string, unknown>;

  return {
    id: evaluation.id,
    userId: evaluation.userId,
    programId: evaluation.programId || undefined,
    taskId: evaluation.taskId || undefined,
    mode: evaluation.mode as LearningMode,
    
    // Evaluation scope
    evaluationType: evaluation.evaluationType,
    evaluationSubtype: evaluation.evaluationSubtype || undefined,
    
    // Scoring (unified 0-100 scale)
    score: evaluation.score,
    maxScore: evaluation.maxScore,
    
    // Multi-dimensional scoring
    dimensionScores,
    
    // Feedback
    feedbackText: evaluation.feedbackText || undefined,
    feedbackData,
    
    // AI analysis
    aiProvider: evaluation.aiProvider || undefined,
    aiModel: evaluation.aiModel || undefined,
    aiAnalysis,
    
    // Time tracking
    timeTakenSeconds: evaluation.timeTakenSeconds,
    
    // Timestamps
    createdAt: evaluation.createdAt.toISOString(),
    
    // Mode-specific data
    pblData,
    discoveryData,
    assessmentData,
    
    // Extensible metadata
    metadata
  };
}

/**
 * Convert Prisma Interaction to IInteraction interface
 */
export function convertInteractionToIInteraction(interaction: Interaction): IInteraction {
  const content = interaction.content as unknown;
  const metadata = interaction.metadata as Record<string, unknown> | undefined;

  return {
    timestamp: interaction.timestamp.toISOString(),
    type: interaction.type as 'user_input' | 'ai_response' | 'system_event',
    content,
    metadata
  };
}

/**
 * Batch conversion utilities
 */
export function convertScenarios(scenarios: Scenario[]): IScenario[] {
  return scenarios.map(convertScenarioToIScenario);
}

export function convertPrograms(programs: Program[]): IProgram[] {
  return programs.map(convertProgramToIProgram);
}

export function convertTasks(tasks: Task[]): ITask[] {
  return tasks.map(convertTaskToITask);
}

export function convertEvaluations(evaluations: Evaluation[]): IEvaluation[] {
  return evaluations.map(convertEvaluationToIEvaluation);
}

export function convertInteractions(interactions: Interaction[]): IInteraction[] {
  return interactions.map(convertInteractionToIInteraction);
}