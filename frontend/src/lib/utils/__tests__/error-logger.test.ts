/**
 * Unit tests for error logger utility
 * Tests error logging and reporting functionality
 */

describe('Error Logger', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('logError', () => {
    it('should log errors with context', () => {
      const logError = (error: Error, context?: Record<string, unknown>) => {
        const errorInfo = {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          ...context
        };
        
        if (process.env.NODE_ENV === 'development') {
          console.error('[ERROR]', errorInfo);
        }
        
        // In production, would send to error tracking service
        return errorInfo;
      };

      const error = new Error('Test error');
      const context = { userId: '123', action: 'fetchData' };
      
      const result = logError(error, context);
      
      expect(result.message).toBe('Test error');
      expect('userId' in result && result.userId).toBe('123');
      expect('action' in result && result.action).toBe('fetchData');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle different error types', () => {
      const logError = (error: unknown, context?: Record<string, unknown>) => {
        let errorMessage = 'Unknown error';
        let errorStack: string | undefined;
        
        if (error instanceof Error) {
          errorMessage = error.message;
          errorStack = error.stack;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object') {
          errorMessage = JSON.stringify(error);
        }
        
        return {
          message: errorMessage,
          stack: errorStack,
          timestamp: new Date().toISOString(),
          ...context
        };
      };

      expect(logError(new Error('Standard error')).message).toBe('Standard error');
      expect(logError('String error').message).toBe('String error');
      expect(logError({ code: 'ERR_001' }).message).toBe('{"code":"ERR_001"}');
      expect(logError(null).message).toBe('Unknown error');
      expect(logError(undefined).message).toBe('Unknown error');
    });
  });

  describe('logWarning', () => {
    it('should log warnings', () => {
      const logWarning = (message: string, data?: unknown) => {
        const warningInfo = {
          level: 'warning',
          message,
          data,
          timestamp: new Date().toISOString()
        };
        
        if (process.env.NODE_ENV === 'development') {
          console.warn('[WARNING]', warningInfo);
        }
        
        return warningInfo;
      };

      const result = logWarning('Deprecation warning', { feature: 'oldAPI' });
      
      expect(result.level).toBe('warning');
      expect(result.message).toBe('Deprecation warning');
      expect(result.data).toEqual({ feature: 'oldAPI' });
    });
  });

  describe('ErrorBoundary logging', () => {
    it('should create error boundary log entry', () => {
      const logErrorBoundary = (error: Error, errorInfo: { componentStack: string }) => {
        return {
          type: 'error-boundary',
          error: {
            message: error.message,
            stack: error.stack
          },
          errorInfo,
          timestamp: new Date().toISOString(),
          url: typeof window !== 'undefined' ? window.location.href : undefined
        };
      };

      const error = new Error('Component render error');
      const errorInfo = { componentStack: 'in Component\n    in App' };
      
      const result = logErrorBoundary(error, errorInfo);
      
      expect(result.type).toBe('error-boundary');
      expect(result.error.message).toBe('Component render error');
      expect(result.errorInfo.componentStack).toContain('in Component');
    });
  });

  describe('API error logging', () => {
    it('should log API errors with request details', () => {
      const logAPIError = (
        error: unknown,
        endpoint: string,
        method: string,
        statusCode?: number
      ) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        return {
          type: 'api-error',
          endpoint,
          method,
          statusCode,
          error: errorMessage,
          timestamp: new Date().toISOString()
        };
      };

      const result = logAPIError(
        new Error('Network error'),
        '/api/users',
        'GET',
        500
      );
      
      expect(result.type).toBe('api-error');
      expect(result.endpoint).toBe('/api/users');
      expect(result.method).toBe('GET');
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Performance error logging', () => {
    it('should log performance issues', () => {
      const logPerformanceIssue = (
        metric: string,
        value: number,
        threshold: number
      ) => {
        if (value > threshold) {
          return {
            type: 'performance-warning',
            metric,
            value,
            threshold,
            exceeded: value - threshold,
            timestamp: new Date().toISOString()
          };
        }
        return null;
      };

      const result = logPerformanceIssue('pageLoadTime', 5000, 3000);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('performance-warning');
      expect(result?.metric).toBe('pageLoadTime');
      expect(result?.exceeded).toBe(2000);
      
      const noIssue = logPerformanceIssue('renderTime', 100, 200);
      expect(noIssue).toBeNull();
    });
  });

  describe('Error categorization', () => {
    it('should categorize errors', () => {
      const categorizeError = (error: Error): string => {
        const message = error.message.toLowerCase();
        
        if (message.includes('network') || message.includes('fetch')) {
          return 'network';
        }
        if (message.includes('permission') || message.includes('unauthorized')) {
          return 'auth';
        }
        if (message.includes('validation') || message.includes('invalid')) {
          return 'validation';
        }
        if (message.includes('timeout')) {
          return 'timeout';
        }
        
        return 'unknown';
      };

      expect(categorizeError(new Error('Network request failed'))).toBe('network');
      expect(categorizeError(new Error('Unauthorized access'))).toBe('auth');
      expect(categorizeError(new Error('Invalid input data'))).toBe('validation');
      expect(categorizeError(new Error('Request timeout'))).toBe('timeout');
      expect(categorizeError(new Error('Something went wrong'))).toBe('unknown');
    });
  });

  describe('Error recovery suggestions', () => {
    it('should provide recovery suggestions', () => {
      const getRecoverySuggestion = (errorType: string): string => {
        const suggestions: Record<string, string> = {
          network: 'Please check your internet connection and try again.',
          auth: 'Please log in again to continue.',
          validation: 'Please check your input and try again.',
          timeout: 'The operation took too long. Please try again.',
          unknown: 'An unexpected error occurred. Please refresh and try again.'
        };
        
        return suggestions[errorType] || suggestions.unknown;
      };

      expect(getRecoverySuggestion('network')).toContain('internet connection');
      expect(getRecoverySuggestion('auth')).toContain('log in');
      expect(getRecoverySuggestion('validation')).toContain('check your input');
      expect(getRecoverySuggestion('timeout')).toContain('took too long');
      expect(getRecoverySuggestion('unknown')).toContain('unexpected error');
    });
  });

  describe('Error sanitization', () => {
    it('should sanitize sensitive data from errors', () => {
      const sanitizeError = (error: Record<string, unknown>): Record<string, unknown> => {
        const sensitiveKeys = ['password', 'token', 'apikey', 'secret', 'authorization'];
        const sanitized = { ...error };
        
        for (const key of Object.keys(sanitized)) {
          if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
            sanitized[key] = '[REDACTED]';
          } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeError(sanitized[key] as Record<string, unknown>);
          }
        }
        
        return sanitized;
      };

      const errorWithSensitiveData = {
        message: 'Auth failed',
        password: 'secret123',
        apiKey: 'key-abc-123',
        userData: {
          name: 'John',
          token: 'jwt-token-here'
        }
      };

      const sanitized = sanitizeError(errorWithSensitiveData);
      
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      const userData = sanitized.userData as Record<string, unknown>;
      expect(userData.name).toBe('John');
      expect(userData.token).toBe('[REDACTED]');
    });
  });
});