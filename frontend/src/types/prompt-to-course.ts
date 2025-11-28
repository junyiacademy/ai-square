/**
 * Prompt-to-Course Feature Types
 * Types for AI-powered course generation from natural language prompts
 */

import type { LearningMode, DifficultyLevel } from './database';

/**
 * Input form data for course generation
 */
export interface CourseGenerationInput {
  // Basic info
  scenarioId: string;
  title: string;
  description: string;

  // Course settings
  mode: LearningMode;
  difficulty: DifficultyLevel;
  estimatedMinutes: number;
  taskCount: number;

  // Target domains (for KSA mapping)
  targetDomains: string[];

  // Language
  language: string;

  // Optional fields
  prerequisites?: string[];
  objectives?: string[];
}

/**
 * AI generation request
 */
export interface GenerateScenarioRequest {
  input: CourseGenerationInput;
  prompt?: string;
}

/**
 * AI generation response
 */
export interface GenerateScenarioResponse {
  yaml: string;
  processingTime: number;
  tokensUsed?: number;
  warnings?: string[];
}

/**
 * Validation request
 */
export interface ValidateScenarioRequest {
  yaml: string;
  mode: LearningMode;
}

/**
 * Validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Validation response
 */
export interface ValidateScenarioResponse {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
}

/**
 * Preview mode for the PreviewTabs component
 */
export type PreviewMode = 'visual' | 'markdown' | 'code';

/**
 * Parsed scenario data for preview
 */
export interface ParsedScenarioData {
  id?: string;
  mode?: LearningMode;
  status?: string;
  version?: string;
  sourceType?: string;
  title?: Record<string, string>;
  description?: Record<string, string>;
  difficulty?: DifficultyLevel;
  estimatedMinutes?: number;
  taskTemplates?: Array<{
    id: string;
    title: Record<string, string>;
    type: string;
    description?: Record<string, string>;
  }>;
  pblData?: Record<string, unknown>;
  discoveryData?: Record<string, unknown>;
  assessmentData?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Download options
 */
export interface DownloadOptions {
  filename: string;
  format: 'yaml' | 'json';
}

/**
 * Publish to GitHub request
 */
export interface PublishScenarioRequest {
  scenarioId: string;
  yaml: string;
  mode: LearningMode;
}

/**
 * Publish to GitHub response
 */
export interface PublishScenarioResponse {
  success: boolean;
  prUrl: string;
  branch: string;
  commitSha: string;
  message: string;
}
