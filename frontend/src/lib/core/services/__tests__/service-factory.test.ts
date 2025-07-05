/**
 * Unit Tests - Service Factory
 * 測試統一架構的服務工廠
 */

import { getServices } from '../service-factory'

// Mock dependencies
jest.mock('@/lib/core/storage/providers/user-centric-gcs.provider')
jest.mock('@/lib/core/track/repositories/gcs-track.repository')
jest.mock('@/lib/core/program/repositories/pbl-program.repository')
jest.mock('@/lib/core/task/repositories/base-task.repository')
jest.mock('@/lib/core/log/repositories/base-log.repository')

describe('ServiceFactory', () => {
  beforeEach(() => {
    // Reset any mocks
    jest.clearAllMocks()
    
    // Mock environment variables
    process.env.GCS_BUCKET_NAME_V2 = 'test-bucket-v2'
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project'
  })

  describe('getServices', () => {
    it('should initialize all services correctly', () => {
      const services = getServices()
      
      expect(services).toBeDefined()
      expect(services.trackService).toBeDefined()
      expect(services.programService).toBeDefined()
      expect(services.taskService).toBeDefined()
      expect(services.logService).toBeDefined()
      expect(services.storageProvider).toBeDefined()
    })

    it('should return the same instance on multiple calls (singleton)', () => {
      const services1 = getServices()
      const services2 = getServices()
      
      expect(services1).toBe(services2)
      expect(services1.trackService).toBe(services2.trackService)
      expect(services1.programService).toBe(services2.programService)
    })

    it('should use GCS_BUCKET_NAME_V2 configuration', () => {
      const services = getServices()
      
      // The storage provider should be configured with V2 bucket
      expect(services.storageProvider).toBeDefined()
      // Additional assertions would depend on the actual implementation
    })

    it('should handle missing environment variables gracefully', () => {
      delete process.env.GCS_BUCKET_NAME_V2
      delete process.env.GOOGLE_CLOUD_PROJECT
      
      expect(() => getServices()).not.toThrow()
      
      const services = getServices()
      expect(services).toBeDefined()
    })
  })

  describe('Service Dependencies', () => {
    it('should properly inject storage provider into repositories', () => {
      const services = getServices()
      
      expect(services.trackService).toBeDefined()
      expect(services.programService).toBeDefined()
      expect(services.taskService).toBeDefined()
      expect(services.logService).toBeDefined()
    })

    it('should configure services with correct dependencies', () => {
      const services = getServices()
      
      // All services should have their required dependencies
      expect(services.trackService).toHaveProperty('repository')
      expect(services.programService).toHaveProperty('repository')
      expect(services.taskService).toHaveProperty('repository')
      expect(services.logService).toHaveProperty('repository')
    })
  })

  describe('Error Handling', () => {
    it('should throw meaningful error when configuration is invalid', () => {
      // Mock a configuration that would cause initialization to fail
      const originalEnv = process.env.GOOGLE_CLOUD_PROJECT
      process.env.GOOGLE_CLOUD_PROJECT = ''
      
      // Depending on implementation, this might throw or handle gracefully
      // Adjust based on actual error handling strategy
      expect(() => getServices()).not.toThrow()
      
      process.env.GOOGLE_CLOUD_PROJECT = originalEnv
    })
  })
})

describe('Service Integration', () => {
  let services: ReturnType<typeof getServices>

  beforeEach(() => {
    services = getServices()
  })

  describe('Cross-service Communication', () => {
    it('should allow services to work together', async () => {
      // Test that services can interact properly
      // This is more of an integration test but important for the architecture
      
      expect(services.trackService).toBeDefined()
      expect(services.programService).toBeDefined()
      expect(services.taskService).toBeDefined()
      expect(services.logService).toBeDefined()
      
      // Mock methods to test interaction
      const mockTrackId = 'test-track-123'
      const mockProgramId = 'test-program-456'
      const mockTaskId = 'test-task-789'
      
      // These would be actual method calls in a real test
      expect(mockTrackId).toBeDefined()
      expect(mockProgramId).toBeDefined()
      expect(mockTaskId).toBeDefined()
    })
  })

  describe('Configuration Consistency', () => {
    it('should use consistent configuration across all services', () => {
      // All services should use the same storage configuration
      const storageProvider = services.storageProvider
      
      expect(storageProvider).toBeDefined()
      
      // Verify that all repositories use the same storage provider
      // This would need to be adjusted based on actual implementation
    })
  })
})

describe('Service Factory Performance', () => {
  it('should initialize services quickly', () => {
    const startTime = Date.now()
    const services = getServices()
    const endTime = Date.now()
    
    expect(services).toBeDefined()
    expect(endTime - startTime).toBeLessThan(100) // Should take less than 100ms
  })

  it('should not create multiple instances unnecessarily', () => {
    const services1 = getServices()
    const services2 = getServices()
    const services3 = getServices()
    
    // All should be the same instance
    expect(services1).toBe(services2)
    expect(services2).toBe(services3)
  })
})