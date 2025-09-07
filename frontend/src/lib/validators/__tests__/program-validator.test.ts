/**
 * TDD Example: Program Start Validator
 * Following Kent Beck's TDD principles:
 * 1. Red → Green → Refactor
 * 2. Write simplest failing test first
 * 3. Implement minimum code to pass
 * 4. Refactor only after tests pass
 */

import { validateProgramStart } from '../program-validator';
import type { IScenario, IUser } from '../../../types/unified-learning';

describe('validateProgramStart', () => {
  // Test 1: Write a failing test for a small behavior increment
  it('should return error when scenario is null', () => {
    const result = validateProgramStart(null, { id: 'user-123' } as IUser);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Scenario not found');
  });

  // Test 2: Another small increment
  it('should return error when user is null', () => {
    const mockScenario: IScenario = {
      id: 'scenario-123',
      mode: 'pbl',
      title: { en: 'Test Scenario' },
      description: { en: 'Test Description' },
      status: 'active',
      sourceType: 'yaml',
      taskTemplates: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = validateProgramStart(mockScenario, null);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('User not authenticated');
  });

  // Test 3: Test for inactive scenario
  it('should return error when scenario is not active', () => {
    const mockScenario: IScenario = {
      id: 'scenario-123',
      mode: 'pbl',
      title: { en: 'Test Scenario' },
      description: { en: 'Test Description' },
      status: 'archived', // Not active
      sourceType: 'yaml',
      taskTemplates: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockUser: IUser = {
      id: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
      role: 'student'
    };

    const result = validateProgramStart(mockScenario, mockUser);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Scenario is not available');
  });

  // Test 4: Happy path - all validations pass
  it('should return valid when all requirements are met', () => {
    const mockScenario: IScenario = {
      id: 'scenario-123',
      mode: 'pbl',
      title: { en: 'Test Scenario' },
      description: { en: 'Test Description' },
      status: 'active',
      sourceType: 'yaml',
      taskTemplates: [
        {
          id: 'task-1',
          title: { en: 'Task 1' },
          type: 'chat',
          content: { instructions: 'Do this' }
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockUser: IUser = {
      id: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
      role: 'student'
    };

    const result = validateProgramStart(mockScenario, mockUser);
    
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // Test 5: Edge case - scenario with no tasks
  it('should return error when scenario has no tasks', () => {
    const mockScenario: IScenario = {
      id: 'scenario-123',
      mode: 'pbl',
      title: { en: 'Test Scenario' },
      description: { en: 'Test Description' },
      status: 'active',
      sourceType: 'yaml',
      taskTemplates: [], // Empty tasks
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockUser: IUser = {
      id: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
      role: 'student'
    };

    const result = validateProgramStart(mockScenario, mockUser);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Scenario has no tasks defined');
  });
});