/**
 * Unit Tests - PBL Scenario Service
 * 測試 PBL scenario 資料載入和處理
 */

import { PBLScenarioService, pblScenarioService } from '../pbl-scenario.service'
import { TaskType } from '@/lib/core/task/types'
import { promises as fs } from 'fs'
import path from 'path'

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    readdir: jest.fn(),
    access: jest.fn()
  }
}))

const mockFs = fs as jest.Mocked<typeof fs>

describe('PBLScenarioService', () => {
  let service: PBLScenarioService

  beforeEach(() => {
    service = new PBLScenarioService()
    jest.clearAllMocks()
    
    // Clear cache before each test
    service.clearCache()
  })

  describe('loadScenario', () => {
    const mockScenarioData = {
      id: 'test-scenario',
      title: 'Test Scenario',
      description: 'Test Description',
      domain: 'test-domain',
      difficulty: 'beginner',
      estimatedTime: 60,
      tasks: [
        {
          id: 'task-1',
          title: 'Task 1',
          description: 'Task 1 Description',
          instructions: ['Step 1', 'Step 2'],
          expectedOutcome: 'Expected result',
          aiModule: {
            role: 'tutor',
            model: 'gemini-2.5-flash',
            persona: 'AI Assistant',
            initialPrompt: 'You are a helpful assistant'
          }
        }
      ]
    }

    it('should load scenario successfully', async () => {
      mockFs.access.mockResolvedValue(undefined)
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockScenarioData))
      
      const result = await service.loadScenario('test-scenario', 'en')
      
      expect(result).toBeDefined()
      expect(result.id).toBe('test-scenario')
      expect(result.title).toBe('Test Scenario')
      expect(result.tasks).toHaveLength(1)
      expect(result.tasks[0].type).toBe(TaskType.ANALYSIS) // Default mapping
    })

    it('should fallback to English when language-specific file not found', async () => {
      mockFs.access
        .mockRejectedValueOnce(new Error('File not found')) // First call fails
        .mockResolvedValueOnce(undefined) // Second call succeeds
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockScenarioData))
      
      const result = await service.loadScenario('test-scenario', 'zh')
      
      expect(result.language).toBe('en')
      expect(mockFs.access).toHaveBeenCalledTimes(2)
    })

    it('should handle snake_case ai_module format', async () => {
      const mockDataWithSnakeCase = {
        ...mockScenarioData,
        tasks: [
          {
            id: 'task-1',
            title: 'Task 1',
            ai_module: {
              role: 'tutor',
              model: 'gemini-2.5-flash',
              persona: 'AI Assistant',
              initial_prompt: 'You are a helpful assistant'
            }
          }
        ]
      }

      mockFs.access.mockResolvedValue(undefined)
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDataWithSnakeCase))
      
      const result = await service.loadScenario('test-scenario', 'en')
      
      expect(result.tasks[0].aiModule.initialPrompt).toBe('You are a helpful assistant')
    })

    it('should use cache on subsequent calls', async () => {
      mockFs.access.mockResolvedValue(undefined)
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockScenarioData))
      
      // First call
      await service.loadScenario('test-scenario', 'en')
      
      // Second call should use cache
      await service.loadScenario('test-scenario', 'en')
      
      expect(mockFs.readFile).toHaveBeenCalledTimes(1)
    })

    it('should expire cache after timeout', async () => {
      // Create a service with very short cache timeout for testing
      const shortCacheService = new PBLScenarioService()
      shortCacheService['cacheTimeout'] = 1 // 1ms
      
      mockFs.access.mockResolvedValue(undefined)
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockScenarioData))
      
      // First call
      await shortCacheService.loadScenario('test-scenario', 'en')
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 2))
      
      // Second call should reload
      await shortCacheService.loadScenario('test-scenario', 'en')
      
      expect(mockFs.readFile).toHaveBeenCalledTimes(2)
    })

    it('should throw error when scenario file not found', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'))
      
      await expect(service.loadScenario('non-existent', 'en'))
        .rejects.toThrow('Failed to load scenario: non-existent')
    })
  })

  describe('getAvailableScenarios', () => {
    it('should return list of available scenarios', async () => {
      const mockFolders = [
        { name: 'test_scenario_1', isDirectory: () => true },
        { name: 'test_scenario_2', isDirectory: () => true },
        { name: 'not_a_folder.txt', isDirectory: () => false }
      ]

      mockFs.readdir.mockResolvedValue(mockFolders as any)
      mockFs.access.mockResolvedValue(undefined)
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        id: 'test-scenario-1',
        title: 'Test Scenario 1',
        description: 'Description 1',
        domain: 'test-domain',
        difficulty: 'beginner',
        estimatedTime: 60
      }))
      
      const result = await service.getAvailableScenarios('en')
      
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('test-scenario-1')
    })

    it('should handle errors gracefully and continue with other scenarios', async () => {
      const mockFolders = [
        { name: 'valid_scenario', isDirectory: () => true },
        { name: 'invalid_scenario', isDirectory: () => true }
      ]

      mockFs.readdir.mockResolvedValue(mockFolders as any)
      mockFs.access
        .mockResolvedValueOnce(undefined) // First scenario loads fine
        .mockRejectedValueOnce(new Error('File not found')) // Second scenario fails
      
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({
        id: 'valid-scenario',
        title: 'Valid Scenario',
        description: 'Valid Description',
        domain: 'test-domain',
        difficulty: 'beginner',
        estimatedTime: 60
      }))
      
      const result = await service.getAvailableScenarios('en')
      
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('valid-scenario')
    })
  })

  describe('getTaskConfig', () => {
    it('should return task configuration by ID', async () => {
      const mockScenarioData = {
        id: 'test-scenario',
        title: 'Test Scenario',
        tasks: [
          {
            id: 'task-1',
            title: 'Task 1',
            aiModule: {
              role: 'tutor',
              model: 'gemini-2.5-flash'
            }
          },
          {
            id: 'task-2', 
            title: 'Task 2',
            aiModule: {
              role: 'mentor',
              model: 'gemini-2.5-flash'
            }
          }
        ]
      }

      mockFs.access.mockResolvedValue(undefined)
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockScenarioData))
      
      const result = await service.getTaskConfig('test-scenario', 'task-2', 'en')
      
      expect(result).toBeDefined()
      expect(result?.id).toBe('task-2')
      expect(result?.title).toBe('Task 2')
    })

    it('should return null when task not found', async () => {
      const mockScenarioData = {
        id: 'test-scenario',
        title: 'Test Scenario',
        tasks: []
      }

      mockFs.access.mockResolvedValue(undefined)
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockScenarioData))
      
      const result = await service.getTaskConfig('test-scenario', 'non-existent', 'en')
      
      expect(result).toBeNull()
    })
  })

  describe('scenarioExists', () => {
    it('should return true when scenario exists', async () => {
      mockFs.access.mockResolvedValue(undefined)
      mockFs.readFile.mockResolvedValue(JSON.stringify({ id: 'test' }))
      
      const result = await service.scenarioExists('test-scenario', 'en')
      
      expect(result).toBe(true)
    })

    it('should return false when scenario does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'))
      
      const result = await service.scenarioExists('non-existent', 'en')
      
      expect(result).toBe(false)
    })
  })

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', async () => {
      const mockFiles = [
        'test_scenario_en.yaml',
        'test_scenario_zh.yaml',
        'test_scenario_ja.yaml',
        'other_file.txt'
      ]

      mockFs.readdir.mockResolvedValue(mockFiles as any)
      
      const result = await service.getSupportedLanguages('test-scenario')
      
      expect(result).toEqual(['en', 'zh', 'ja'])
    })

    it('should return default language on error', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Directory not found'))
      
      const result = await service.getSupportedLanguages('non-existent')
      
      expect(result).toEqual(['en'])
    })
  })

  describe('Cache Management', () => {
    it('should clear specific scenario cache', async () => {
      mockFs.access.mockResolvedValue(undefined)
      mockFs.readFile.mockResolvedValue(JSON.stringify({ id: 'test' }))
      
      // Load scenario to cache it
      await service.loadScenario('test-scenario', 'en')
      
      // Clear specific cache
      service.clearCache('test-scenario', 'en')
      
      // Load again should call fs.readFile again
      await service.loadScenario('test-scenario', 'en')
      
      expect(mockFs.readFile).toHaveBeenCalledTimes(2)
    })

    it('should clear all cache for a scenario', async () => {
      mockFs.access.mockResolvedValue(undefined)
      mockFs.readFile.mockResolvedValue(JSON.stringify({ id: 'test' }))
      
      // Load scenario in multiple languages
      await service.loadScenario('test-scenario', 'en')
      await service.loadScenario('test-scenario', 'zh')
      
      // Clear all cache for this scenario
      service.clearCache('test-scenario')
      
      // Load again should call fs.readFile again
      await service.loadScenario('test-scenario', 'en')
      await service.loadScenario('test-scenario', 'zh')
      
      expect(mockFs.readFile).toHaveBeenCalledTimes(4)
    })
  })

  describe('Task Type Mapping', () => {
    it('should map task types correctly', () => {
      const testCases = [
        { taskId: 'analysis-task', expected: TaskType.ANALYSIS },
        { taskId: 'design-task', expected: TaskType.DESIGN },
        { taskId: 'implement-feature', expected: TaskType.IMPLEMENTATION },
        { taskId: 'evaluate-results', expected: TaskType.EVALUATION },
        { taskId: 'unknown-task', expected: TaskType.ANALYSIS } // default
      ]

      testCases.forEach(({ taskId, expected }) => {
        const result = service['mapTaskType'](taskId)
        expect(result).toBe(expected)
      })
    })

    it('should prioritize explicit task type over ID-based mapping', () => {
      const result = service['mapTaskType']('analysis-task', 'design')
      expect(result).toBe(TaskType.DESIGN)
    })
  })

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(pblScenarioService).toBeInstanceOf(PBLScenarioService)
      
      // Multiple imports should return the same instance
      const { pblScenarioService: service2 } = require('../pbl-scenario.service')
      expect(pblScenarioService).toBe(service2)
    })
  })

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      mockFs.access.mockResolvedValue(undefined)
      mockFs.readFile.mockResolvedValue(JSON.stringify({ id: 'test' }))
      
      // Load some scenarios to populate cache
      await service.loadScenario('scenario1', 'en')
      await service.loadScenario('scenario2', 'zh')
      
      const stats = service.getCacheStats()
      
      expect(stats.totalCached).toBe(2)
      expect(stats.cacheKeys).toContain('scenario1:en')
      expect(stats.cacheKeys).toContain('scenario2:zh')
      expect(stats.memoryUsage).toBeDefined()
    })
  })
})