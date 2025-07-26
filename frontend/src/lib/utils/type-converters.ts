/**
 * Type conversion utilities for mapping between database entities and interface types
 * Handles conversion from database models to unified learning interfaces
 */

import type {
  DBScenario as Scenario,
  DBProgram as Program,
  DBTask as Task,
  DBEvaluation as Evaluation,
  DBInteraction as Interaction
} from '@/types/database';

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
  const taskTemplates = scenario.task_templates as ITaskTemplate[];
  const xpRewards = scenario.xp_rewards as Record<string, number>;
  const unlockRequirements = scenario.unlock_requirements as Record<string, unknown>;
  const pblData = scenario.pbl_data as Record<string, unknown>;
  const discoveryData = scenario.discovery_data as Record<string, unknown>;
  const assessmentData = scenario.assessment_data as Record<string, unknown>;
  const aiModules = scenario.ai_modules as Record<string, unknown>;
  const resources = scenario.resources as Array<Record<string, unknown>>;
  const sourceMetadata = scenario.source_metadata as Record<string, unknown>;
  const metadata = scenario.metadata as Record<string, unknown>;

  return {
    id: scenario.id,
    mode: scenario.mode as LearningMode,
    status: scenario.status as ScenarioStatus,
    version: scenario.version,
    
    // Source tracking
    sourceType: scenario.source_type as SourceType,
    sourcePath: scenario.source_path || undefined,
    sourceId: scenario.source_id || undefined,
    sourceMetadata,
    
    // Basic info
    title,
    description,
    objectives,
    
    // Common attributes
    difficulty: scenario.difficulty as DifficultyLevel,
    estimatedMinutes: scenario.estimated_minutes,
    prerequisites: scenario.prerequisites,
    
    // Task templates
    taskTemplates,
    taskCount: scenario.task_count,
    
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
    createdAt: scenario.created_at,
    updatedAt: scenario.updated_at,
    publishedAt: scenario.published_at || undefined,
    
    // Extensible metadata
    metadata
  };
}

/**
 * Convert Prisma Program to IProgram interface
 */
export function convertProgramToIProgram(program: Program): IProgram {
  // Parse JSON fields with type safety
  const domainScores = program.domain_scores as Record<string, number>;
  const badgesEarned = program.badges_earned as Array<Record<string, unknown>>;
  const pblData = program.pbl_data as Record<string, unknown>;
  const discoveryData = program.discovery_data as Record<string, unknown>;
  const assessmentData = program.assessment_data as Record<string, unknown>;
  const metadata = program.metadata as Record<string, unknown>;

  return {
    id: program.id,
    userId: program.user_id,
    scenarioId: program.scenario_id,
    mode: program.mode as LearningMode,
    status: program.status as ProgramStatus,
    
    // Progress tracking
    currentTaskIndex: program.current_task_index,
    completedTaskCount: program.completed_task_count,
    totalTaskCount: program.total_task_count,
    
    // Scoring (unified)
    totalScore: program.total_score,
    domainScores,
    
    // XP and rewards
    xpEarned: program.xp_earned,
    badgesEarned,
    
    // Timestamps (unified naming)
    createdAt: program.created_at,
    startedAt: program.started_at || undefined,
    completedAt: program.completed_at || undefined,
    updatedAt: program.updated_at,
    lastActivityAt: program.last_activity_at,
    
    // Time tracking
    timeSpentSeconds: program.time_spent_seconds,
    
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
  const interactions = task.interactions as unknown as IInteraction[];
  const userResponse = task.user_response as Record<string, unknown>;
  const aiConfig = task.ai_config as Record<string, unknown>;
  const pblData = task.pbl_data as Record<string, unknown>;
  const discoveryData = task.discovery_data as Record<string, unknown>;
  const assessmentData = task.assessment_data as Record<string, unknown>;
  const metadata = task.metadata as Record<string, unknown>;

  return {
    id: task.id,
    programId: task.program_id,
    mode: task.mode as LearningMode,
    taskIndex: task.task_index,
    scenarioTaskIndex: task.scenario_task_index || undefined,
    
    // Basic info
    title: task.title || undefined,
    description: task.description || undefined,
    type: task.type as TaskType,
    status: task.status as TaskStatus,
    
    // Content
    content,
    
    // Interaction tracking
    interactions,
    interactionCount: task.interaction_count,
    
    // Response/solution
    userResponse,
    
    // Scoring
    score: task.score,
    maxScore: task.max_score,
    
    // Attempts and timing
    allowedAttempts: task.allowed_attempts,
    attemptCount: task.attempt_count,
    timeLimitSeconds: task.time_limit_seconds || undefined,
    timeSpentSeconds: task.time_spent_seconds,
    
    // AI configuration
    aiConfig,
    
    // Timestamps
    createdAt: task.created_at,
    startedAt: task.started_at || undefined,
    completedAt: task.completed_at || undefined,
    updatedAt: task.updated_at,
    
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
  const domainScores = evaluation.domain_scores as Record<string, number>;
  const feedbackData = evaluation.feedback_data as Record<string, unknown>;
  const aiAnalysis = evaluation.ai_analysis as Record<string, unknown>;
  const pblData = evaluation.pbl_data as Record<string, unknown>;
  const discoveryData = evaluation.discovery_data as Record<string, unknown>;
  const assessmentData = evaluation.assessment_data as Record<string, unknown>;
  const metadata = evaluation.metadata as Record<string, unknown>;

  return {
    id: evaluation.id,
    userId: evaluation.user_id,
    programId: evaluation.program_id || undefined,
    taskId: evaluation.task_id || undefined,
    mode: evaluation.mode as LearningMode,
    
    // Evaluation scope
    evaluationType: evaluation.evaluation_type,
    evaluationSubtype: evaluation.evaluation_subtype || undefined,
    
    // Scoring (unified 0-100 scale)
    score: evaluation.score,
    maxScore: evaluation.max_score,
    
    // Multi-dimensional scoring
    domainScores,
    
    // Feedback
    feedbackText: evaluation.feedback_text || undefined,
    feedbackData,
    
    // AI analysis
    aiProvider: evaluation.ai_provider || undefined,
    aiModel: evaluation.ai_model || undefined,
    aiAnalysis,
    
    // Time tracking
    timeTakenSeconds: evaluation.time_taken_seconds,
    
    // Timestamps
    createdAt: evaluation.created_at,
    
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
    timestamp: interaction.timestamp instanceof Date ? interaction.timestamp.toISOString() : (interaction.timestamp as string) || new Date().toISOString(),
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