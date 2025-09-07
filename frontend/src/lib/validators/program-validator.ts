/**
 * Program Start Validator
 * TDD Implementation - Refactored for clarity and maintainability
 * Following Kent Beck's principles:
 * - Express clear intent via naming/structure
 * - Keep functions small & single-responsibility
 * - Make dependencies explicit
 */

import type { IScenario, IUser } from '../../types/unified-learning';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Validation error messages as constants for reusability
const ValidationErrors = {
  SCENARIO_NOT_FOUND: 'Scenario not found',
  USER_NOT_AUTHENTICATED: 'User not authenticated',
  SCENARIO_NOT_AVAILABLE: 'Scenario is not available',
  NO_TASKS_DEFINED: 'Scenario has no tasks defined'
} as const;

/**
 * Validates if a program can be started for a given scenario and user
 * @param scenario - The scenario to start
 * @param user - The authenticated user
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateProgramStart(
  scenario: IScenario | null,
  user: IUser | null
): ValidationResult {
  // Check user first (authentication is prerequisite)
  const userValidation = validateUser(user);
  if (!userValidation.isValid) {
    return userValidation;
  }

  // Then check scenario
  const scenarioValidation = validateScenario(scenario);
  if (!scenarioValidation.isValid) {
    return scenarioValidation;
  }

  // All validations passed
  return { isValid: true };
}

/**
 * Validates scenario requirements
 * Single responsibility: scenario validation
 */
function validateScenario(scenario: IScenario | null): ValidationResult {
  if (!scenario) {
    return {
      isValid: false,
      error: ValidationErrors.SCENARIO_NOT_FOUND
    };
  }

  if (scenario.status !== 'active') {
    return {
      isValid: false,
      error: ValidationErrors.SCENARIO_NOT_AVAILABLE
    };
  }

  if (!scenario.taskTemplates || scenario.taskTemplates.length === 0) {
    return {
      isValid: false,
      error: ValidationErrors.NO_TASKS_DEFINED
    };
  }

  return { isValid: true };
}

/**
 * Validates user authentication
 * Single responsibility: user validation
 */
function validateUser(user: IUser | null): ValidationResult {
  if (!user) {
    return {
      isValid: false,
      error: ValidationErrors.USER_NOT_AUTHENTICATED
    };
  }

  return { isValid: true };
}