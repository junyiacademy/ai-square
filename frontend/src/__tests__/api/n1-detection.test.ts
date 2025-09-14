/**
 * N+1 Query Detection Tests
 * Tests to ensure batch loading optimizations prevent N+1 queries
 * These tests verify that our API routes use efficient batch loading instead of individual queries
 */

import { NextRequest } from 'next/server';
import { GET as getPblUserPrograms } from '@/app/api/pbl/user-programs/route';
import { GET as getDiscoveryMyPrograms } from '@/app/api/discovery/my-programs/route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { createMockUser, createMockProgram, createMockTask, createMockEvaluation } from '@/test-utils/mocks/repository-helpers';

// Mock the repository factory
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getUserRepository: jest.fn(),
    getProgramRepository: jest.fn(),
    getTaskRepository: jest.fn(),
    getEvaluationRepository: jest.fn(),
    getScenarioRepository: jest.fn(),
    getContentRepository: jest.fn(),
  }
}));

jest.mock('@/lib/auth/unified-auth');
jest.mock('@/lib/api/optimization-utils');
jest.mock('@/lib/cache/cache-service');

// Mock auth to return a test user
const mockAuth = require('@/lib/auth/unified-auth');
mockAuth.getUnifiedAuth = jest.fn();
mockAuth.createUnauthorizedResponse = jest.fn();

// Mock optimization utils to disable caching for testing
const mockOptimizationUtils = require('@/lib/api/optimization-utils');
mockOptimizationUtils.cachedGET = jest.fn((req, handler) => handler());
mockOptimizationUtils.getPaginationParams = jest.fn(() => ({ page: 1, limit: 10 }));
mockOptimizationUtils.createPaginatedResponse = jest.fn((data, total, params) => ({ data, total, ...params }));

// Mock cache service to return null (no cache)
const mockCacheService = require('@/lib/cache/cache-service');
mockCacheService.cacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

describe('N+1 Query Detection Tests', () => {
  const mockUser = createMockUser({
    id: 'user-1',
    email: 'test@example.com',
    preferredLanguage: 'en',
  });

  let userRepo: any;
  let programRepo: any;
  let taskRepo: any;
  let evaluationRepo: any;
  let contentRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repositories
    userRepo = {
      findByEmail: jest.fn(),
    };

    programRepo = {
      findByUser: jest.fn(),
    };

    taskRepo = {
      findByProgram: jest.fn(),
      findByProgramIds: jest.fn(), // Batch loading method
    };

    evaluationRepo = {
      findByProgram: jest.fn(),
      findByProgramIds: jest.fn(), // Batch loading method
    };

    contentRepo = {
      getScenarioContent: jest.fn(),
    };

    // Setup repository factory mocks
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(userRepo);
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(programRepo);
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(taskRepo);
    (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(evaluationRepo);
    (repositoryFactory.getContentRepository as jest.Mock).mockReturnValue(contentRepo);

    // Setup auth mock
    mockAuth.getUnifiedAuth.mockResolvedValue({ user: mockUser });
  });

  describe('PBL User Programs API - N+1 Prevention', () => {
    it('should use batch loading for tasks and evaluations to prevent N+1 queries', async () => {
      // Arrange: Create test data with multiple programs
      const mockPrograms = [
        createMockProgram({ id: 'prog-1', scenarioId: 'scenario-1' }),
        createMockProgram({ id: 'prog-2', scenarioId: 'scenario-2' }),
        createMockProgram({ id: 'prog-3', scenarioId: 'scenario-1' }), // Same scenario
      ];

      const mockTasks = [
        createMockTask({ id: 'task-1', programId: 'prog-1', status: 'completed' }),
        createMockTask({ id: 'task-2', programId: 'prog-1', status: 'pending' }),
        createMockTask({ id: 'task-3', programId: 'prog-2', status: 'completed' }),
        createMockTask({ id: 'task-4', programId: 'prog-3', status: 'completed' }),
      ];

      const mockEvaluations = [
        createMockEvaluation({ id: 'eval-1', programId: 'prog-1', score: 85 }),
        createMockEvaluation({ id: 'eval-2', programId: 'prog-2', score: 90 }),
        createMockEvaluation({ id: 'eval-3', programId: 'prog-3', score: 75 }),
      ];

      // Setup mocks
      userRepo.findByEmail.mockResolvedValue(mockUser);
      programRepo.findByUser.mockResolvedValue(mockPrograms);
      taskRepo.findByProgramIds.mockResolvedValue(mockTasks);
      evaluationRepo.findByProgramIds.mockResolvedValue(mockEvaluations);
      contentRepo.getScenarioContent.mockResolvedValue({
        title: { en: 'Test Scenario' }
      });

      // Act
      const request = new NextRequest('http://localhost:3000/api/pbl/user-programs');
      const response = await getPblUserPrograms(request);

      // Assert: Verify batch loading methods were called instead of individual queries
      expect(taskRepo.findByProgramIds).toHaveBeenCalledTimes(1);
      expect(taskRepo.findByProgramIds).toHaveBeenCalledWith(['prog-1', 'prog-2', 'prog-3']);

      expect(evaluationRepo.findByProgramIds).toHaveBeenCalledTimes(1);
      expect(evaluationRepo.findByProgramIds).toHaveBeenCalledWith(['prog-1', 'prog-2', 'prog-3']);

      // Assert: Individual query methods should NOT be called in loops
      expect(taskRepo.findByProgram).not.toHaveBeenCalled();
      expect(evaluationRepo.findByProgram).not.toHaveBeenCalled();

      // Verify response structure is maintained
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(3);
    });

    it('should handle empty programs list without making unnecessary queries', async () => {
      // Arrange: No programs for user
      userRepo.findByEmail.mockResolvedValue(mockUser);
      programRepo.findByUser.mockResolvedValue([]);

      // Act
      const request = new NextRequest('http://localhost:3000/api/pbl/user-programs');
      const response = await getPblUserPrograms(request);

      // Assert: Batch methods should not be called for empty data
      expect(taskRepo.findByProgramIds).not.toHaveBeenCalled();
      expect(evaluationRepo.findByProgramIds).not.toHaveBeenCalled();
      expect(taskRepo.findByProgram).not.toHaveBeenCalled();
      expect(evaluationRepo.findByProgram).not.toHaveBeenCalled();
    });
  });

  describe('Discovery My Programs API - N+1 Prevention', () => {
    it('should use batch loading for tasks to prevent N+1 queries in discovery scenarios', async () => {
      // Arrange: Create discovery programs with active status
      const mockDiscoveryPrograms = [
        createMockProgram({
          id: 'disc-prog-1',
          scenarioId: 'discovery-scenario-1',
          status: 'active',
          metadata: { sourceType: 'discovery', careerType: 'developer' }
        }),
        createMockProgram({
          id: 'disc-prog-2',
          scenarioId: 'discovery-scenario-2',
          status: 'active',
          metadata: { sourceType: 'discovery', careerType: 'designer' }
        }),
        createMockProgram({
          id: 'disc-prog-3',
          scenarioId: 'discovery-scenario-3',
          status: 'completed', // Not active, should not load tasks
          metadata: { sourceType: 'discovery', careerType: 'manager' }
        }),
      ];

      const mockTasks = [
        createMockTask({ id: 'disc-task-1', programId: 'disc-prog-1', status: 'completed' }),
        createMockTask({ id: 'disc-task-2', programId: 'disc-prog-1', status: 'pending' }),
        createMockTask({ id: 'disc-task-3', programId: 'disc-prog-2', status: 'completed' }),
      ];

      // Mock scenario repository with batch loading
      const scenarioRepo = {
        findByIds: jest.fn().mockResolvedValue([
          { id: 'discovery-scenario-1', title: { en: 'Developer Path' } },
          { id: 'discovery-scenario-2', title: { en: 'Designer Path' } },
          { id: 'discovery-scenario-3', title: { en: 'Manager Path' } },
        ]),
      };

      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(scenarioRepo);

      // Setup mocks
      programRepo.findByUser.mockResolvedValue(mockDiscoveryPrograms);
      taskRepo.findByProgramIds.mockResolvedValue(mockTasks);

      // Act
      const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
      const response = await getDiscoveryMyPrograms(request);

      // Assert: Verify batch loading was used for scenarios
      expect(scenarioRepo.findByIds).toHaveBeenCalledTimes(1);
      expect(scenarioRepo.findByIds).toHaveBeenCalledWith([
        'discovery-scenario-1',
        'discovery-scenario-2',
        'discovery-scenario-3'
      ]);

      // Assert: Verify batch loading was used for tasks (only active programs)
      expect(taskRepo.findByProgramIds).toHaveBeenCalledTimes(1);
      expect(taskRepo.findByProgramIds).toHaveBeenCalledWith(['disc-prog-1', 'disc-prog-2']);

      // Assert: Individual query methods should NOT be called
      expect(taskRepo.findByProgram).not.toHaveBeenCalled();

      // Verify response
      expect(response.status).toBe(200);
    });

    it('should efficiently handle scenarios without active programs', async () => {
      // Arrange: Programs but none are active
      const mockDiscoveryPrograms = [
        createMockProgram({
          id: 'disc-prog-1',
          scenarioId: 'discovery-scenario-1',
          status: 'completed',
          metadata: { sourceType: 'discovery', careerType: 'developer' }
        }),
      ];

      const scenarioRepo = {
        findByIds: jest.fn().mockResolvedValue([
          { id: 'discovery-scenario-1', title: { en: 'Developer Path' } },
        ]),
      };

      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(scenarioRepo);
      programRepo.findByUser.mockResolvedValue(mockDiscoveryPrograms);

      // Act
      const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
      const response = await getDiscoveryMyPrograms(request);

      // Assert: No task queries should be made for inactive programs
      expect(taskRepo.findByProgramIds).toHaveBeenCalledWith([]); // Empty array
      expect(taskRepo.findByProgram).not.toHaveBeenCalled();
    });
  });

  describe('Query Efficiency Validation', () => {
    it('should demonstrate the efficiency improvement with realistic data volumes', async () => {
      // Arrange: Create a realistic scenario with many programs
      const programCount = 10;
      const tasksPerProgram = 5;
      const evaluationsPerProgram = 3;

      const mockPrograms = Array.from({ length: programCount }, (_, i) =>
        createMockProgram({
          id: `prog-${i}`,
          scenarioId: `scenario-${i % 3}` // Multiple programs per scenario
        })
      );

      const mockTasks = Array.from({ length: programCount * tasksPerProgram }, (_, i) =>
        createMockTask({
          id: `task-${i}`,
          programId: `prog-${Math.floor(i / tasksPerProgram)}`,
          status: i % 2 === 0 ? 'completed' : 'pending'
        })
      );

      const mockEvaluations = Array.from({ length: programCount * evaluationsPerProgram }, (_, i) =>
        createMockEvaluation({
          id: `eval-${i}`,
          programId: `prog-${Math.floor(i / evaluationsPerProgram)}`,
          score: 70 + (i % 30)
        })
      );

      // Setup mocks
      userRepo.findByEmail.mockResolvedValue(mockUser);
      programRepo.findByUser.mockResolvedValue(mockPrograms);
      taskRepo.findByProgramIds.mockResolvedValue(mockTasks);
      evaluationRepo.findByProgramIds.mockResolvedValue(mockEvaluations);
      contentRepo.getScenarioContent.mockResolvedValue({ title: { en: 'Test' } });

      // Act
      const request = new NextRequest('http://localhost:3000/api/pbl/user-programs');
      const response = await getPblUserPrograms(request);

      // Assert: With our batch loading optimization:
      // - OLD: 1 + (N * 2) + N = 1 + 20 + 10 = 31 queries for 10 programs
      // - NEW: 1 + 2 + ~3 = ~6 queries total (83% reduction)

      expect(taskRepo.findByProgramIds).toHaveBeenCalledTimes(1); // Single batch query
      expect(evaluationRepo.findByProgramIds).toHaveBeenCalledTimes(1); // Single batch query

      // Individual queries should never be called
      expect(taskRepo.findByProgram).not.toHaveBeenCalled();
      expect(evaluationRepo.findByProgram).not.toHaveBeenCalled();

      // Response should contain all programs
      const responseData = await response.json();
      expect(responseData.data).toHaveLength(programCount);
    });
  });
});
