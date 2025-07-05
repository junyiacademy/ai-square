/**
 * Unit Tests - PBL Migration Service
 * 測試 PBL 資料遷移到新架構
 */

import { PBLMigrationService } from '../pbl-migration.service'
import { getServices } from '@/lib/core/services/service-factory'

// Mock the service factory
jest.mock('@/lib/core/services/service-factory')
const mockGetServices = getServices as jest.MockedFunction<typeof getServices>

// Mock services
const mockServices = {
  trackService: {
    createTrack: jest.fn(),
    getTrack: jest.fn(),
    updateTrack: jest.fn()
  },
  programService: {
    createProgram: jest.fn(),
    getProgram: jest.fn(),
    updateProgram: jest.fn()
  },
  taskService: {
    createTask: jest.fn(),
    getTask: jest.fn(),
    updateTaskProgress: jest.fn()
  },
  logService: {
    createLog: jest.fn(),
    getLogs: jest.fn()
  }
}

// Mock legacy services
jest.mock('@/lib/storage/pbl-program-service', () => ({
  pblProgramService: {
    getProgram: jest.fn(),
    getProgramLogs: jest.fn(),
    getAllPrograms: jest.fn()
  }
}))

describe('PBLMigrationService', () => {
  let migrationService: PBLMigrationService

  beforeEach(() => {
    migrationService = new PBLMigrationService()
    jest.clearAllMocks()
    
    // Setup mock services
    mockGetServices.mockReturnValue(mockServices as any)
  })

  describe('migratePBLProgram', () => {
    const mockLegacyProgram = {
      programId: 'legacy-program-123',
      scenarioId: 'ai-job-search',
      userEmail: 'test@example.com',
      status: 'active',
      startedAt: '2024-01-01T00:00:00Z',
      lastActivityAt: '2024-01-02T00:00:00Z',
      progress: {
        currentTaskIndex: 1,
        completedTasks: ['task-1'],
        totalTasks: 3
      },
      tasks: [
        {
          taskId: 'task-1',
          title: 'Task 1',
          status: 'completed',
          completedAt: '2024-01-01T12:00:00Z',
          submissions: ['submission-1'],
          timeSpent: 1800 // 30 minutes
        },
        {
          taskId: 'task-2',
          title: 'Task 2', 
          status: 'in_progress',
          startedAt: '2024-01-02T10:00:00Z',
          submissions: [],
          timeSpent: 900 // 15 minutes
        }
      ]
    }

    it('should successfully migrate a PBL program', async () => {
      // Mock legacy service response
      const { pblProgramService } = require('@/lib/storage/pbl-program-service')
      pblProgramService.getProgram.mockResolvedValue(mockLegacyProgram)
      pblProgramService.getProgramLogs.mockResolvedValue([
        {
          timestamp: '2024-01-01T12:00:00Z',
          type: 'chat',
          data: { message: 'Hello', response: 'Hi there' }
        }
      ])

      // Mock new service responses
      mockServices.trackService.createTrack.mockResolvedValue({
        trackId: 'new-track-123',
        type: 'PBL',
        status: 'ACTIVE'
      })
      
      mockServices.programService.createProgram.mockResolvedValue({
        programId: 'new-program-456',
        trackId: 'new-track-123',
        status: 'ACTIVE'
      })

      mockServices.taskService.createTask.mockResolvedValue({
        taskId: 'new-task-789',
        programId: 'new-program-456',
        status: 'COMPLETED'
      })

      const result = await migrationService.migratePBLProgram(
        'test@example.com',
        'ai-job-search', 
        'legacy-program-123'
      )

      expect(result).toBeDefined()
      expect(result.trackId).toBe('new-track-123')
      expect(result.programId).toBe('new-program-456')
      expect(result.taskIds).toHaveLength(2)
      expect(result.migrationLog).toContain('Creating track for PBL scenario: ai-job-search')
      
      // Verify service calls
      expect(mockServices.trackService.createTrack).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          type: 'PBL',
          status: 'ACTIVE'
        })
      )
      
      expect(mockServices.programService.createProgram).toHaveBeenCalledWith(
        'test@example.com',
        'new-track-123',
        expect.objectContaining({
          type: 'PBL',
          status: 'ACTIVE'
        })
      )
    })

    it('should handle missing legacy program gracefully', async () => {
      const { pblProgramService } = require('@/lib/storage/pbl-program-service')
      pblProgramService.getProgram.mockResolvedValue(null)

      await expect(migrationService.migratePBLProgram(
        'test@example.com',
        'ai-job-search',
        'non-existent-program'
      )).rejects.toThrow('Legacy program not found')
    })

    it('should handle service errors during migration', async () => {
      const { pblProgramService } = require('@/lib/storage/pbl-program-service')
      pblProgramService.getProgram.mockResolvedValue(mockLegacyProgram)
      
      // Mock service failure
      mockServices.trackService.createTrack.mockRejectedValue(new Error('Service unavailable'))

      await expect(migrationService.migratePBLProgram(
        'test@example.com',
        'ai-job-search',
        'legacy-program-123'
      )).rejects.toThrow('Service unavailable')
    })
  })

  describe('migrateUserPBLData', () => {
    it('should migrate all programs for a user', async () => {
      const mockPrograms = [
        { programId: 'program-1', scenarioId: 'scenario-1' },
        { programId: 'program-2', scenarioId: 'scenario-2' }
      ]

      const { pblProgramService } = require('@/lib/storage/pbl-program-service')
      pblProgramService.getAllPrograms.mockResolvedValue(mockPrograms)
      
      // Mock individual program migration
      const migrateSpy = jest.spyOn(migrationService, 'migratePBLProgram')
        .mockResolvedValue({
          trackId: 'track-123',
          programId: 'program-123',
          taskIds: ['task-1'],
          migrationLog: ['Migration completed']
        })

      const result = await migrationService.migrateUserPBLData('test@example.com')

      expect(result.migratedPrograms).toBe(2)
      expect(result.failed).toBe(0)
      expect(migrateSpy).toHaveBeenCalledTimes(2)
    })

    it('should continue migration even if some programs fail', async () => {
      const mockPrograms = [
        { programId: 'program-1', scenarioId: 'scenario-1' },
        { programId: 'program-2', scenarioId: 'scenario-2' },
        { programId: 'program-3', scenarioId: 'scenario-3' }
      ]

      const { pblProgramService } = require('@/lib/storage/pbl-program-service')
      pblProgramService.getAllPrograms.mockResolvedValue(mockPrograms)
      
      // Mock some successes and failures
      const migrateSpy = jest.spyOn(migrationService, 'migratePBLProgram')
        .mockResolvedValueOnce({
          trackId: 'track-1',
          programId: 'program-1',
          taskIds: ['task-1'],
          migrationLog: ['Migration completed']
        })
        .mockRejectedValueOnce(new Error('Migration failed'))
        .mockResolvedValueOnce({
          trackId: 'track-3',
          programId: 'program-3',
          taskIds: ['task-3'],
          migrationLog: ['Migration completed']
        })

      const result = await migrationService.migrateUserPBLData('test@example.com')

      expect(result.migratedPrograms).toBe(2)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(migrateSpy).toHaveBeenCalledTimes(3)
    })
  })

  describe('validateMigration', () => {
    it('should validate successful migration', async () => {
      mockServices.trackService.getTrack.mockResolvedValue({
        trackId: 'track-123',
        type: 'PBL',
        status: 'ACTIVE'
      })
      
      mockServices.programService.getProgram.mockResolvedValue({
        programId: 'program-456',
        trackId: 'track-123',
        status: 'ACTIVE'
      })

      const isValid = await migrationService.validateMigration(
        'test@example.com',
        'track-123',
        'program-456',
        ['task-1', 'task-2']
      )

      expect(isValid).toBe(true)
    })

    it('should detect invalid migration', async () => {
      mockServices.trackService.getTrack.mockResolvedValue(null)

      const isValid = await migrationService.validateMigration(
        'test@example.com',
        'non-existent-track',
        'program-456',
        ['task-1']
      )

      expect(isValid).toBe(false)
    })
  })

  describe('getMigrationStatus', () => {
    it('should return migration status', async () => {
      const mockPrograms = [
        { programId: 'program-1', scenarioId: 'scenario-1' },
        { programId: 'program-2', scenarioId: 'scenario-2' }
      ]

      const { pblProgramService } = require('@/lib/storage/pbl-program-service')
      pblProgramService.getAllPrograms.mockResolvedValue(mockPrograms)
      
      // Mock some programs already migrated
      mockServices.trackService.getTrack
        .mockResolvedValueOnce({ trackId: 'track-1' }) // First program migrated
        .mockResolvedValueOnce(null) // Second program not migrated

      const status = await migrationService.getMigrationStatus('test@example.com')

      expect(status.totalPrograms).toBe(2)
      expect(status.migratedPrograms).toBe(1)
      expect(status.pendingPrograms).toBe(1)
      expect(status.migrationComplete).toBe(false)
    })

    it('should indicate complete migration', async () => {
      const { pblProgramService } = require('@/lib/storage/pbl-program-service')
      pblProgramService.getAllPrograms.mockResolvedValue([])

      const status = await migrationService.getMigrationStatus('test@example.com')

      expect(status.totalPrograms).toBe(0)
      expect(status.migrationComplete).toBe(true)
    })
  })

  describe('rollbackMigration', () => {
    it('should rollback migration successfully', async () => {
      const mockMigrationResult = {
        trackId: 'track-123',
        programId: 'program-456',
        taskIds: ['task-1', 'task-2'],
        migrationLog: ['Migration completed']
      }

      // Mock successful deletions
      mockServices.logService.getLogs.mockResolvedValue([])
      
      const result = await migrationService.rollbackMigration(
        'test@example.com',
        mockMigrationResult
      )

      expect(result.success).toBe(true)
      expect(result.rollbackLog).toContain('Rollback completed successfully')
    })

    it('should handle rollback errors gracefully', async () => {
      const mockMigrationResult = {
        trackId: 'track-123',
        programId: 'program-456',
        taskIds: ['task-1'],
        migrationLog: ['Migration completed']
      }

      // Mock deletion failure
      const deleteError = new Error('Failed to delete track')
      mockServices.trackService.getTrack.mockRejectedValue(deleteError)

      const result = await migrationService.rollbackMigration(
        'test@example.com',
        mockMigrationResult
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain(deleteError.message)
    })
  })

  describe('Data Transformation', () => {
    it('should transform legacy task data correctly', () => {
      const legacyTask = {
        taskId: 'legacy-task-1',
        title: 'Legacy Task',
        status: 'completed',
        completedAt: '2024-01-01T12:00:00Z',
        submissions: ['submission-1', 'submission-2'],
        timeSpent: 1800,
        score: 85
      }

      const transformedTask = migrationService['transformLegacyTask'](
        legacyTask,
        'program-123',
        0
      )

      expect(transformedTask.programId).toBe('program-123')
      expect(transformedTask.type).toBeDefined()
      expect(transformedTask.status).toBe('COMPLETED')
      expect(transformedTask.progress.timeSpent).toBe(1800)
      expect(transformedTask.progress.score).toBe(85)
      expect(transformedTask.progress.completed).toBe(true)
    })

    it('should handle incomplete legacy task data', () => {
      const legacyTask = {
        taskId: 'incomplete-task',
        title: 'Incomplete Task',
        status: 'in_progress'
        // Missing other fields
      }

      const transformedTask = migrationService['transformLegacyTask'](
        legacyTask,
        'program-123',
        1
      )

      expect(transformedTask.status).toBe('ACTIVE')
      expect(transformedTask.progress.completed).toBe(false)
      expect(transformedTask.progress.timeSpent).toBe(0)
      expect(transformedTask.progress.attempts).toBe(0)
    })
  })
})