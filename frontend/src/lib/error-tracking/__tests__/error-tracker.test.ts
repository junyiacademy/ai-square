import { getErrorTracker, captureError, captureApiError, captureUserError } from '../error-tracker'

// Mock console methods
const consoleGroupSpy = jest.spyOn(console, 'group').mockImplementation()
const consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation()
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation()
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: jest.fn((key: string) => localStorageMock.store[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    localStorageMock.store[key] = value
  }),
  removeItem: jest.fn((key: string) => {
    delete localStorageMock.store[key]
  }),
  clear: jest.fn(() => {
    localStorageMock.store = {}
  })
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Mock fetch
global.fetch = jest.fn()

// Mock btoa (base64 encoding) for fingerprint generation
global.btoa = jest.fn((str: string) => Buffer.from(str).toString('base64'))

// Mock window and navigator
delete (window as any).location
;(window as any).location = {
  href: 'https://example.com/test'
}

Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 Test Browser'
  },
  writable: true
})

describe('ErrorTracker', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.store = {}
    originalEnv = process.env.NODE_ENV
    // Override NODE_ENV using Object.defineProperty
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
      configurable: true
    })
    
    // Clear errors before each test
    const errorTracker = getErrorTracker()
    errorTracker.clearErrors()
    errorTracker.setEnabled(true)
  })

  afterEach(() => {
    // Restore NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
      configurable: true
    })
    consoleGroupSpy.mockClear()
    consoleGroupEndSpy.mockClear()
    consoleErrorSpy.mockClear()
    consoleTableSpy.mockClear()
    consoleWarnSpy.mockClear()
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getErrorTracker()
      const instance2 = getErrorTracker()
      
      expect(instance1).toBe(instance2)
    })
  })

  describe('captureError', () => {
    it('should capture error with string message', () => {
      const errorTracker = getErrorTracker()
      const errorId = errorTracker.captureError('Test error message')
      
      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/)
      
      const metrics = errorTracker.getMetrics()
      expect(metrics.totalErrors).toBe(1)
      expect(metrics.recentErrors[0].message).toBe('Test error message')
    })

    it('should capture error with Error object', () => {
      const errorTracker = getErrorTracker()
      const error = new Error('Test error object')
      const errorId = errorTracker.captureError(error, {
        component: 'TestComponent',
        action: 'test_action'
      }, 'high')
      
      expect(errorId).toBeTruthy()
      
      const metrics = errorTracker.getMetrics()
      expect(metrics.totalErrors).toBe(1)
      expect(metrics.recentErrors[0].message).toBe('Test error object')
      expect(metrics.recentErrors[0].severity).toBe('high')
      expect(metrics.recentErrors[0].context.component).toBe('TestComponent')
      expect(metrics.recentErrors[0].context.action).toBe('test_action')
    })

    it('should include context and auto-populate fields', () => {
      const errorTracker = getErrorTracker()
      const error = new Error('Context test')
      errorTracker.captureError(error, { userId: 'user123', url: 'https://example.com/test' })
      
      const metrics = errorTracker.getMetrics()
      const capturedError = metrics.recentErrors[0]
      
      expect(capturedError.context.userId).toBe('user123')
      expect(capturedError.context.url).toBe('https://example.com/test')
      expect(capturedError.context.userAgent).toBe('Mozilla/5.0 Test Browser')
      expect(capturedError.context.timestamp).toBeTruthy()
    })

    it('should not capture errors when disabled', () => {
      const errorTracker = getErrorTracker()
      errorTracker.setEnabled(false)
      const errorId = errorTracker.captureError('Disabled error')
      
      expect(errorId).toBe('')
      expect(errorTracker.getMetrics().totalErrors).toBe(0)
    })

    it('should generate unique error IDs', () => {
      const errorTracker = getErrorTracker()
      const id1 = errorTracker.captureError('Error 1')
      const id2 = errorTracker.captureError('Error 2')
      
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^err_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^err_\d+_[a-z0-9]+$/)
    })
  })

  describe('captureApiError', () => {
    it('should capture API error with correct context', () => {
      const errorTracker = getErrorTracker()
      const errorId = errorTracker.captureApiError(
        '/api/test',
        404,
        { error: 'Not found' },
        { userId: 'user123' }
      )
      
      expect(errorId).toBeTruthy()
      
      const metrics = errorTracker.getMetrics()
      const apiError = metrics.recentErrors[0]
      
      expect(apiError.message).toBe('API Error: 404 /api/test')
      expect(apiError.severity).toBe('medium')
      expect(apiError.context.component).toBe('API')
      expect(apiError.context.action).toBe('api_request')
      expect(apiError.context.apiUrl).toBe('/api/test')
      expect(apiError.context.statusCode).toBe(404)
      expect(apiError.context.userId).toBe('user123')
    })

    it('should set high severity for 5xx errors', () => {
      const errorTracker = getErrorTracker()
      errorTracker.captureApiError('/api/error', 500, 'Internal Server Error')
      
      const metrics = errorTracker.getMetrics()
      expect(metrics.recentErrors[0].severity).toBe('high')
    })

    it('should handle non-string response', () => {
      const errorTracker = getErrorTracker()
      const response = { error: 'Complex error', code: 400 }
      errorTracker.captureApiError('/api/complex', 400, response)
      
      const metrics = errorTracker.getMetrics()
      expect(metrics.recentErrors[0].context.response).toBe(JSON.stringify(response))
    })
  })

  describe('captureUserError', () => {
    it('should capture user action error with low severity', () => {
      const errorTracker = getErrorTracker()
      const errorId = errorTracker.captureUserError(
        'button_click',
        'LoginForm',
        'Validation failed',
        { formData: { email: 'test@example.com' } }
      )
      
      expect(errorId).toBeTruthy()
      
      const metrics = errorTracker.getMetrics()
      const userError = metrics.recentErrors[0]
      
      expect(userError.message).toBe('Validation failed')
      expect(userError.severity).toBe('low')
      expect(userError.context.component).toBe('LoginForm')
      expect(userError.context.action).toBe('button_click')
      expect(userError.context.errorType).toBe('user_action')
    })
  })

  describe('error storage', () => {
    it('should store errors in localStorage', () => {
      const errorTracker = getErrorTracker()
      errorTracker.captureError('Storage test')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'error_tracker_reports',
        expect.stringContaining('Storage test')
      )
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded')
      })
      
      const errorTracker = getErrorTracker()
      errorTracker.captureError('Storage error test')
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to store error in localStorage:',
        expect.any(Error)
      )
    })

    it('should limit stored errors to 50 in localStorage', () => {
      const errorTracker = getErrorTracker()
      // Add 60 errors
      for (let i = 0; i < 60; i++) {
        errorTracker.captureError(`Error ${i}`)
      }
      
      const lastCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1]
      const storedErrors = JSON.parse(lastCall[1])
      
      expect(storedErrors).toHaveLength(50)
    })

    it('should limit memory errors to 100', () => {
      const errorTracker = getErrorTracker()
      // Add 150 errors
      for (let i = 0; i < 150; i++) {
        errorTracker.captureError(`Memory Error ${i}`)
      }
      
      const metrics = errorTracker.getMetrics()
      expect(metrics.totalErrors).toBe(100)
    })
  })

  describe('getMetrics', () => {
    it('should provide error metrics by type and severity', () => {
      const errorTracker = getErrorTracker()
      errorTracker.captureError('Error 1', { component: 'ComponentA' }, 'high')
      errorTracker.captureError('Error 2', { component: 'ComponentA' }, 'medium')
      errorTracker.captureError('Error 3', { component: 'ComponentB' }, 'low')
      
      const metrics = errorTracker.getMetrics()
      
      expect(metrics.totalErrors).toBe(3)
      expect(metrics.errorsByType).toEqual({
        ComponentA: 2,
        ComponentB: 1
      })
      expect(metrics.errorsBySeverity).toEqual({
        high: 1,
        medium: 1,
        low: 1
      })
      expect(metrics.recentErrors).toHaveLength(3)
    })

    it('should handle errors without component', () => {
      const errorTracker = getErrorTracker()
      errorTracker.captureError('No component error')
      
      const metrics = errorTracker.getMetrics()
      expect(metrics.errorsByType.Unknown).toBe(1)
    })
  })

  describe('getAllErrors', () => {
    it('should combine memory and localStorage errors', () => {
      // Add error to localStorage directly
      const storedError = {
        id: 'stored_error',
        message: 'Stored error',
        timestamp: new Date().toISOString(),
        severity: 'medium' as const,
        context: {},
        fingerprint: 'test'
      }
      localStorageMock.store['error_tracker_reports'] = JSON.stringify([storedError])
      
      // Add error to memory
      const errorTracker = getErrorTracker()
      errorTracker.captureError('Memory error')
      
      const allErrors = errorTracker.getAllErrors()
      expect(allErrors.length).toBeGreaterThan(1)
      
      const messages = allErrors.map(e => e.message)
      expect(messages).toContain('Stored error')
      expect(messages).toContain('Memory error')
    })

    it('should remove duplicate errors', () => {
      const sameId = 'duplicate_id'
      const duplicateError = {
        id: sameId,
        message: 'Duplicate',
        timestamp: new Date().toISOString(),
        severity: 'medium' as const,
        context: {},
        fingerprint: 'test'
      }
      
      localStorageMock.store['error_tracker_reports'] = JSON.stringify([duplicateError, duplicateError])
      
      const errorTracker = getErrorTracker()
      const allErrors = errorTracker.getAllErrors()
      const duplicateIds = allErrors.filter(e => e.id === sameId)
      expect(duplicateIds).toHaveLength(1)
    })
  })

  describe('clearErrors', () => {
    it('should clear memory and localStorage errors', () => {
      const errorTracker = getErrorTracker()
      errorTracker.captureError('Test error')
      expect(errorTracker.getMetrics().totalErrors).toBe(1)
      
      errorTracker.clearErrors()
      
      expect(errorTracker.getMetrics().totalErrors).toBe(0)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('error_tracker_reports')
    })

    it('should handle localStorage clear errors gracefully', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Clear failed')
      })
      
      const errorTracker = getErrorTracker()
      errorTracker.clearErrors()
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to clear errors from localStorage:',
        expect.any(Error)
      )
    })
  })

  describe('error reporting', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true, configurable: true })
    })

    it('should log errors in development mode', () => {
      const errorTracker = getErrorTracker()
      errorTracker.captureError('Development error', { component: 'TestComp' })
      
      expect(consoleGroupSpy).toHaveBeenCalledWith('🚨 Error Tracked: MEDIUM')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Message:', 'Development error')
      expect(consoleTableSpy).toHaveBeenCalled()
      expect(consoleGroupEndSpy).toHaveBeenCalled()
    })

    it('should send to external service in production', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true, configurable: true })
      process.env.NEXT_PUBLIC_ERROR_REPORTING_URL = 'https://errors.example.com/api'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      })
      
      const errorTracker = getErrorTracker()
      errorTracker.captureError('Production error')
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://errors.example.com/api',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Production error')
        })
      )
    })

    it('should not send to external service in development', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true, configurable: true })
      delete process.env.NEXT_PUBLIC_ERROR_REPORTING_URL
      
      const errorTracker = getErrorTracker()
      errorTracker.captureError('Development error')
      
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('fingerprint generation', () => {
    it('should generate consistent fingerprints for similar errors', () => {
      const errorTracker = getErrorTracker()
      const error1 = new Error('Same message')
      const error2 = new Error('Same message')
      const context = { component: 'SameComponent', action: 'same_action' }
      
      errorTracker.captureError(error1, context)
      errorTracker.captureError(error2, context)
      
      const errors = errorTracker.getMetrics().recentErrors
      expect(errors[0].fingerprint).toBe(errors[1].fingerprint)
    })

    it('should generate different fingerprints for different errors', () => {
      const errorTracker = getErrorTracker()
      errorTracker.captureError('Message 1', { component: 'Comp1' })
      errorTracker.captureError('Message 2', { component: 'Comp2' })
      
      const errors = errorTracker.getMetrics().recentErrors
      expect(errors[0].fingerprint).not.toBe(errors[1].fingerprint)
    })
  })

  describe('enable/disable functionality', () => {
    it('should track enabled state', () => {
      const errorTracker = getErrorTracker()
      
      expect(errorTracker.isTrackingEnabled()).toBe(true)
      
      errorTracker.setEnabled(false)
      expect(errorTracker.isTrackingEnabled()).toBe(false)
      
      errorTracker.setEnabled(true)
      expect(errorTracker.isTrackingEnabled()).toBe(true)
    })
  })

  describe('convenience functions', () => {
    it('should provide captureError convenience function', () => {
      const errorId = captureError('Convenience error', { test: true }, 'critical')
      expect(errorId).toBeTruthy()
    })

    it('should provide captureApiError convenience function', () => {
      const errorId = captureApiError('/api/convenience', 500, 'Server Error')
      expect(errorId).toBeTruthy()
    })

    it('should provide captureUserError convenience function', () => {
      const errorId = captureUserError('click', 'Button', 'Click failed')
      expect(errorId).toBeTruthy()
    })
  })
})