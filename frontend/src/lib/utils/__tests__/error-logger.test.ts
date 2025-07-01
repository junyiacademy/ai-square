import { errorLogger } from '../error-logger';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock window and navigator
const mockWindow = {
  location: {
    href: 'https://example.com/test'
  }
};

const mockNavigator = {
  userAgent: 'Mozilla/5.0 Test Browser'
};

// Mock console.error
const originalConsoleError = console.error;
const mockConsoleError = jest.fn();

describe('ErrorLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    errorLogger.clear();
    console.error = originalConsoleError;
    
    // Setup global mocks
    (global as any).localStorage = mockLocalStorage;
    (global as any).window = mockWindow;
    (global as any).navigator = mockNavigator;
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('log', () => {
    it('logs an error with all required fields', () => {
      const error = new Error('Test error message');
      error.stack = 'Error: Test error message\n    at test.js:10:5';
      
      errorLogger.log(error);
      
      const logs = errorLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        message: 'Test error message',
        stack: error.stack,
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        url: 'https://example.com/test',
        userAgent: 'Mozilla/5.0 Test Browser'
      });
    });

    it('logs an error with context', () => {
      const error = new Error('API error');
      const context = {
        endpoint: '/api/users',
        method: 'GET',
        status: 404
      };
      
      errorLogger.log(error, context);
      
      const logs = errorLogger.getLogs();
      expect(logs[0].context).toEqual(context);
    });

    it('outputs to console in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      console.error = mockConsoleError;
      
      const error = new Error('Dev error');
      const context = { debug: true };
      
      errorLogger.log(error, context);
      
      expect(mockConsoleError).toHaveBeenCalledWith('🚨 Error:', error);
      expect(mockConsoleError).toHaveBeenCalledWith('📋 Context:', context);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('does not output to console in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      console.error = mockConsoleError;
      
      const error = new Error('Prod error');
      
      errorLogger.log(error);
      
      expect(mockConsoleError).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('stores logs in localStorage', () => {
      const error = new Error('Storage test');
      
      errorLogger.log(error);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'error_logs',
        expect.stringContaining('Storage test')
      );
    });

    it('handles localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      const error = new Error('Test error');
      
      // Should not throw
      expect(() => errorLogger.log(error)).not.toThrow();
      
      const logs = errorLogger.getLogs();
      expect(logs).toHaveLength(1);
    });

    it('limits the number of stored logs', () => {
      // Log more than maxLogs (50)
      for (let i = 0; i < 55; i++) {
        errorLogger.log(new Error(`Error ${i}`));
      }
      
      const logs = errorLogger.getLogs();
      expect(logs).toHaveLength(50);
      // Should keep the most recent logs
      expect(logs[0].message).toBe('Error 54');
      expect(logs[49].message).toBe('Error 5');
    });

    it('handles server-side rendering (no window)', () => {
      const originalWindow = global.window;
      const originalNavigator = global.navigator;
      (global as any).window = undefined;
      (global as any).navigator = undefined;
      
      const error = new Error('SSR error');
      
      errorLogger.log(error);
      
      const logs = errorLogger.getLogs();
      expect(logs[0].url).toBe('');
      expect(logs[0].userAgent).toBe('');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      
      global.window = originalWindow;
      global.navigator = originalNavigator;
    });
  });

  describe('getLogs', () => {
    it('returns all logged errors', () => {
      errorLogger.log(new Error('Error 1'));
      errorLogger.log(new Error('Error 2'));
      errorLogger.log(new Error('Error 3'));
      
      const logs = errorLogger.getLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('Error 3'); // Most recent first
      expect(logs[1].message).toBe('Error 2');
      expect(logs[2].message).toBe('Error 1');
    });

    it('returns empty array when no errors logged', () => {
      const logs = errorLogger.getLogs();
      expect(logs).toEqual([]);
    });
  });

  describe('clear', () => {
    it('clears all error logs', () => {
      errorLogger.log(new Error('Error 1'));
      errorLogger.log(new Error('Error 2'));
      
      expect(errorLogger.getLogs()).toHaveLength(2);
      
      errorLogger.clear();
      
      expect(errorLogger.getLogs()).toHaveLength(0);
    });

    it('removes logs from localStorage', () => {
      errorLogger.log(new Error('Error'));
      errorLogger.clear();
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('error_logs');
    });

    it('handles clearing on server side', () => {
      const originalWindow = global.window;
      (global as any).window = undefined;
      
      errorLogger.log(new Error('SSR error'));
      errorLogger.clear();
      
      expect(errorLogger.getLogs()).toHaveLength(0);
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
      
      global.window = originalWindow;
    });
  });

  describe('loadFromStorage', () => {
    it('loads error logs from localStorage', () => {
      const storedLogs = [
        {
          message: 'Stored error 1',
          timestamp: '2023-01-01T00:00:00.000Z',
          url: 'https://example.com',
          userAgent: 'Test Browser'
        },
        {
          message: 'Stored error 2',
          timestamp: '2023-01-02T00:00:00.000Z',
          url: 'https://example.com',
          userAgent: 'Test Browser'
        }
      ];
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedLogs));
      
      errorLogger.loadFromStorage();
      
      const logs = errorLogger.getLogs();
      expect(logs).toEqual(storedLogs);
    });

    it('handles invalid JSON in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');
      
      // Should not throw
      expect(() => errorLogger.loadFromStorage()).not.toThrow();
      
      // Should keep existing logs
      const logs = errorLogger.getLogs();
      expect(logs).toEqual([]);
    });

    it('handles empty localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      errorLogger.loadFromStorage();
      
      const logs = errorLogger.getLogs();
      expect(logs).toEqual([]);
    });

    it('does nothing on server side', () => {
      const originalWindow = global.window;
      (global as any).window = undefined;
      
      errorLogger.loadFromStorage();
      
      expect(mockLocalStorage.getItem).not.toHaveBeenCalled();
      
      global.window = originalWindow;
    });
  });

  describe('generateReport', () => {
    it('generates a summary report of errors', () => {
      errorLogger.log(new Error('API Error'), { endpoint: '/api/users' });
      errorLogger.log(new Error('API Error'), { endpoint: '/api/posts' });
      errorLogger.log(new Error('Network Error'));
      errorLogger.log(new Error('Validation Error'));
      
      const report = errorLogger.generateReport();
      
      expect(report).toHaveLength(3);
      expect(report[0]).toMatchObject({
        error: 'API Error',
        count: 2,
        lastOccurred: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
      });
      expect(report[1]).toMatchObject({
        error: 'Network Error',
        count: 1
      });
      expect(report[2]).toMatchObject({
        error: 'Validation Error',
        count: 1
      });
    });

    it('returns empty array when no errors', () => {
      const report = errorLogger.generateReport();
      expect(report).toEqual([]);
    });
  });

  describe('getRecentErrors', () => {
    it('returns errors from the last N minutes', () => {
      const now = Date.now();
      
      // Mock Date.now to control timestamps
      const originalDateNow = Date.now;
      Date.now = jest.fn()
        .mockReturnValueOnce(now - 10 * 60 * 1000) // 10 minutes ago
        .mockReturnValueOnce(now - 5 * 60 * 1000)  // 5 minutes ago
        .mockReturnValueOnce(now - 1 * 60 * 1000)  // 1 minute ago
        .mockReturnValueOnce(now);                  // Now (for getRecentErrors)
      
      errorLogger.log(new Error('Old error'));
      errorLogger.log(new Error('Recent error 1'));
      errorLogger.log(new Error('Recent error 2'));
      
      Date.now = originalDateNow;
      
      const recentErrors = errorLogger.getRecentErrors(3); // Last 3 minutes
      
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0].message).toBe('Recent error 2');
    });

    it('defaults to last 5 minutes', () => {
      errorLogger.log(new Error('Test error'));
      
      const recentErrors = errorLogger.getRecentErrors();
      expect(recentErrors).toHaveLength(1);
    });
  });
});