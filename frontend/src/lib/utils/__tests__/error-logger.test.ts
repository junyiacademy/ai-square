import { errorLogger, logError, logComponentError } from '../error-logger'

// Define LocalStorageMock interface
interface LocalStorageMock {
  store: Record<string, string>
  getItem: jest.Mock<string | null, [string]>
  setItem: jest.Mock<void, [string, string]>
  removeItem: jest.Mock<void, [string]>
}

// Mock localStorage
const localStorageMock: LocalStorageMock = {
  store: {} as Record<string, string>,
  getItem: jest.fn((key: string) => localStorageMock.store[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    localStorageMock.store[key] = value
  }),
  removeItem: jest.fn((key: string) => {
    delete localStorageMock.store[key]
  })
}

// Mock console
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

// Store original NODE_ENV value
const originalNodeEnv = process.env.NODE_ENV

describe('ErrorLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.store = {}
    errorLogger.clear()
    
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    })
    
    // Mock window.location
    delete (window as any).location
    ;(window as any).location = { href: 'http://localhost:3000/test' }
    
    // Mock navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Test Browser',
      writable: true,
      configurable: true
    })
    
    // Make NODE_ENV writable for tests
    Object.defineProperty(process.env, 'NODE_ENV', {
      writable: true,
      value: process.env.NODE_ENV
    })
  })

  afterEach(() => {
    consoleErrorSpy.mockClear()
    
    // Restore original NODE_ENV value and make it read-only again
    Object.defineProperty(process.env, 'NODE_ENV', {
      writable: false,
      value: originalNodeEnv
    })
  })

  describe('log', () => {
    it('should log error with all properties', () => {
      const error = new Error('Test error')
      error.stack = 'Error: Test error\n    at test.js:10:5'
      const context = { userId: 123 }
      
      errorLogger.log(error, context)
      
      const logs = errorLogger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        message: 'Test error',
        stack: error.stack,
        url: 'http://localhost:3000/test',
        userAgent: 'Mozilla/5.0 Test Browser',
        context: { userId: 123 }
      })
      expect(logs[0].timestamp).toBeDefined()
    })

    it('should log to console in development mode', () => {
      process.env.NODE_ENV = 'development'
      
      const error = new Error('Dev error')
      const context = { debug: true }
      
      errorLogger.log(error, context)
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('🚨 Error:', error)
      expect(consoleErrorSpy).toHaveBeenCalledWith('📋 Context:', context)
    })

    it('should not log to console in production mode', () => {
      process.env.NODE_ENV = 'production'
      
      const error = new Error('Prod error')
      errorLogger.log(error)
      
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should maintain max logs limit', () => {
      // Add 55 errors (exceeds maxLogs of 50)
      for (let i = 0; i < 55; i++) {
        errorLogger.log(new Error(`Error ${i}`))
      }
      
      const logs = errorLogger.getLogs()
      expect(logs).toHaveLength(50)
      expect(logs[0].message).toBe('Error 54') // Most recent
      expect(logs[49].message).toBe('Error 5') // Oldest kept
    })

    it('should save to localStorage', () => {
      const error = new Error('Storage test')
      errorLogger.log(error)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'error_logs',
        expect.stringContaining('Storage test')
      )
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full')
      })
      
      // Should not throw
      expect(() => {
        errorLogger.log(new Error('Test'))
      }).not.toThrow()
    })

    it('should work in SSR environment', () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window
      
      const error = new Error('SSR error')
      errorLogger.log(error)
      
      const logs = errorLogger.getLogs()
      expect(logs[0]).toMatchObject({
        message: 'SSR error',
        url: '',
        userAgent: ''
      })
      
      global.window = originalWindow
    })
  })

  describe('getLogs', () => {
    it('should return all logs', () => {
      errorLogger.log(new Error('Error 1'))
      errorLogger.log(new Error('Error 2'))
      errorLogger.log(new Error('Error 3'))
      
      const logs = errorLogger.getLogs()
      expect(logs).toHaveLength(3)
      expect(logs[0].message).toBe('Error 3') // Most recent first
      expect(logs[2].message).toBe('Error 1')
    })

    it('should return empty array when no logs', () => {
      expect(errorLogger.getLogs()).toEqual([])
    })
  })

  describe('clear', () => {
    it('should clear all logs and localStorage', () => {
      errorLogger.log(new Error('To be cleared'))
      expect(errorLogger.getLogs()).toHaveLength(1)
      
      errorLogger.clear()
      
      expect(errorLogger.getLogs()).toEqual([])
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('error_logs')
    })

    it('should work in SSR environment', () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window
      
      errorLogger.log(new Error('SSR error'))
      errorLogger.clear()
      
      expect(errorLogger.getLogs()).toEqual([])
      
      global.window = originalWindow
    })
  })

  describe('loadFromStorage', () => {
    it('should load logs from localStorage', () => {
      const storedLogs = [
        {
          message: 'Stored error 1',
          timestamp: '2024-01-01T00:00:00.000Z',
          url: 'http://example.com',
          userAgent: 'Test',
          stack: 'stack1'
        },
        {
          message: 'Stored error 2',
          timestamp: '2024-01-02T00:00:00.000Z',
          url: 'http://example.com',
          userAgent: 'Test',
          stack: 'stack2'
        }
      ]
      
      localStorageMock.store['error_logs'] = JSON.stringify(storedLogs)
      
      errorLogger.loadFromStorage()
      
      const logs = errorLogger.getLogs()
      expect(logs).toEqual(storedLogs)
    })

    it('should handle missing localStorage data', () => {
      localStorageMock.store['error_logs'] = null as any
      
      errorLogger.loadFromStorage()
      
      expect(errorLogger.getLogs()).toEqual([])
    })

    it('should handle invalid JSON in localStorage', () => {
      localStorageMock.store['error_logs'] = 'invalid-json'
      
      // Should not throw
      expect(() => {
        errorLogger.loadFromStorage()
      }).not.toThrow()
      
      expect(errorLogger.getLogs()).toEqual([])
    })

    it('should work in SSR environment', () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window
      
      // Should not throw
      expect(() => {
        errorLogger.loadFromStorage()
      }).not.toThrow()
      
      global.window = originalWindow
    })
  })

  describe('logError helper', () => {
    it('should log Error instances', () => {
      const error = new Error('Helper error')
      const context = { helper: true }
      
      logError(error, context)
      
      const logs = errorLogger.getLogs()
      expect(logs[0]).toMatchObject({
        message: 'Helper error',
        context: { helper: true }
      })
    })

    it('should convert strings to Error instances', () => {
      logError('String error', { converted: true })
      
      const logs = errorLogger.getLogs()
      expect(logs[0]).toMatchObject({
        message: 'String error',
        context: { converted: true }
      })
    })
  })

  describe('logComponentError helper', () => {
    it('should log React component errors with componentStack', () => {
      const error = new Error('Component error')
      const errorInfo = {
        componentStack: '\n    in ErrorComponent\n    in App'
      }
      
      logComponentError(error, errorInfo)
      
      const logs = errorLogger.getLogs()
      expect(logs[0]).toMatchObject({
        message: 'Component error',
        context: {
          componentStack: errorInfo.componentStack,
          type: 'React Component Error'
        }
      })
    })
  })

  describe('global error handlers', () => {
    let errorHandler: EventListener
    let unhandledRejectionHandler: EventListener

    beforeEach(() => {
      // Clear any existing logs and reload
      errorLogger.clear()
      
      // Capture the event handlers
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
      
      // Re-evaluate the module to register handlers
      jest.isolateModules(() => {
        require('../error-logger')
      })
      
      // Find the handlers
      const calls = addEventListenerSpy.mock.calls
      const errorCall = calls.find(call => call[0] === 'error')
      const rejectionCall = calls.find(call => call[0] === 'unhandledrejection')
      
      errorHandler = errorCall?.[1] as EventListener
      unhandledRejectionHandler = rejectionCall?.[1] as EventListener
      
      addEventListenerSpy.mockRestore()
    })

    it('should handle window error events', () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'Script error',
        filename: 'app.js',
        lineno: 42,
        colno: 10
      })
      
      if (errorHandler) {
        errorHandler(errorEvent)
      }
      
      const logs = errorLogger.getLogs()
      expect(logs[0]).toMatchObject({
        message: 'Script error',
        context: {
          filename: 'app.js',
          lineno: 42,
          colno: 10,
          type: 'Unhandled Error'
        }
      })
    })

    it('should handle unhandled promise rejections', () => {
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject('Test rejection'),
        reason: 'Test rejection reason'
      })
      
      if (unhandledRejectionHandler) {
        unhandledRejectionHandler(rejectionEvent)
      }
      
      const logs = errorLogger.getLogs()
      expect(logs[0]).toMatchObject({
        message: 'Unhandled Promise: Test rejection reason',
        context: {
          type: 'Unhandled Promise Rejection',
          reason: 'Test rejection reason'
        }
      })
    })

    it('should load from storage on initialization', () => {
      const storedLogs = [{
        message: 'Previous error',
        timestamp: '2024-01-01T00:00:00.000Z',
        url: 'http://example.com',
        userAgent: 'Test'
      }]
      
      localStorageMock.store['error_logs'] = JSON.stringify(storedLogs)
      
      // Clear current instance and re-import to trigger initialization
      errorLogger.clear()
      jest.resetModules()
      
      const { errorLogger: newLogger } = require('../error-logger')
      
      const logs = newLogger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].message).toBe('Previous error')
    })
  })

  describe('edge cases', () => {
    it('should handle errors without stack trace', () => {
      const error = new Error('No stack')
      delete error.stack
      
      errorLogger.log(error)
      
      const logs = errorLogger.getLogs()
      expect(logs[0].stack).toBeUndefined()
    })

    it('should handle navigator not being defined', () => {
      const originalNavigator = global.navigator
      // @ts-ignore
      delete global.navigator
      
      errorLogger.log(new Error('No navigator'))
      
      const logs = errorLogger.getLogs()
      expect(logs[0].userAgent).toBe('')
      
      global.navigator = originalNavigator
    })

    it('should maintain logs order with concurrent additions', () => {
      const errors = Array.from({ length: 10 }, (_, i) => new Error(`Error ${i}`))
      
      errors.forEach(error => errorLogger.log(error))
      
      const logs = errorLogger.getLogs()
      expect(logs[0].message).toBe('Error 9') // Most recent
      expect(logs[9].message).toBe('Error 0') // Oldest
    })

    it('should log to console in development without context', () => {
      process.env.NODE_ENV = 'development'
      
      const error = new Error('Dev error no context')
      errorLogger.log(error)
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('🚨 Error:', error)
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1) // Only error, no context
    })
  })
})