import { getErrorTracker, captureError, captureApiError, captureUserError } from '../error-tracker';

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleGroup = jest.spyOn(console, 'group').mockImplementation();
const mockConsoleGroupEnd = jest.spyOn(console, 'groupEnd').mockImplementation();
const mockConsoleTable = jest.spyOn(console, 'table').mockImplementation();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch for external reporting
global.fetch = jest.fn();

describe('ErrorTracker', () => {
  let errorTracker: ReturnType<typeof getErrorTracker>;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    errorTracker = getErrorTracker();
    errorTracker.clearErrors();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleGroup.mockRestore();
    mockConsoleGroupEnd.mockRestore();
    mockConsoleTable.mockRestore();
  });

  describe('Error Capturing', () => {
    it('應該捕獲並存儲錯誤', () => {
      const testError = new Error('Test error message');
      const context = { component: 'TestComponent', action: 'test_action' };
      
      const errorId = errorTracker.captureError(testError, context, 'high');
      
      expect(errorId).toBeDefined();
      expect(errorId).toMatch(/^err_\d+_/);
      
      const metrics = errorTracker.getMetrics();
      expect(metrics.totalErrors).toBe(1);
      expect(metrics.errorsBySeverity.high).toBe(1);
      expect(metrics.errorsByType.TestComponent).toBe(1);
    });

    it('應該處理字串錯誤', () => {
      const errorMessage = 'String error message';
      
      const errorId = errorTracker.captureError(errorMessage, {}, 'medium');
      
      expect(errorId).toBeDefined();
      const metrics = errorTracker.getMetrics();
      expect(metrics.totalErrors).toBe(1);
      expect(metrics.recentErrors[0].message).toBe(errorMessage);
    });

    it('應該生成唯一的錯誤 ID', () => {
      const error1Id = errorTracker.captureError('Error 1');
      const error2Id = errorTracker.captureError('Error 2');
      
      expect(error1Id).not.toBe(error2Id);
    });

    it('應該生成錯誤指紋用於分組', () => {
      const context = { component: 'TestComponent', action: 'test_action' };
      
      errorTracker.captureError('Same error', context);
      errorTracker.captureError('Same error', context);
      
      const errors = errorTracker.getAllErrors();
      expect(errors[0].fingerprint).toBe(errors[1].fingerprint);
    });
  });

  describe('API Error Capturing', () => {
    it('應該捕獲 API 錯誤', () => {
      const url = '/api/test';
      const status = 500;
      const response = { error: 'Internal server error' };
      
      const errorId = errorTracker.captureApiError(url, status, response);
      
      expect(errorId).toBeDefined();
      
      const errors = errorTracker.getAllErrors();
      expect(errors[0].message).toContain('API Error: 500');
      expect(errors[0].context.component).toBe('API');
      expect(errors[0].context.apiUrl).toBe(url);
      expect(errors[0].context.statusCode).toBe(status);
      expect(errors[0].severity).toBe('high'); // 500 status should be high severity
    });

    it('應該根據狀態碼設置適當的嚴重程度', () => {
      errorTracker.captureApiError('/api/test', 404, 'Not found');
      errorTracker.captureApiError('/api/test', 500, 'Server error');
      
      const errors = errorTracker.getAllErrors();
      expect(errors.find(e => e.context.statusCode === 404)?.severity).toBe('medium');
      expect(errors.find(e => e.context.statusCode === 500)?.severity).toBe('high');
    });
  });

  describe('User Error Capturing', () => {
    it('應該捕獲用戶操作錯誤', () => {
      const action = 'button_click';
      const component = 'LoginForm';
      const error = 'Form validation failed';
      
      const errorId = errorTracker.captureUserError(action, component, error);
      
      expect(errorId).toBeDefined();
      
      const errors = errorTracker.getAllErrors();
      expect(errors[0].context.action).toBe(action);
      expect(errors[0].context.component).toBe(component);
      expect(errors[0].context.errorType).toBe('user_action');
      expect(errors[0].severity).toBe('low');
    });
  });

  describe('Error Storage', () => {
    it('應該限制記憶體中存儲的錯誤數量', () => {
      // Generate more than max stored errors
      for (let i = 0; i < 150; i++) {
        errorTracker.captureError(`Error ${i}`);
      }
      
      const metrics = errorTracker.getMetrics();
      expect(metrics.totalErrors).toBeLessThanOrEqual(100); // maxStoredErrors = 100
    });

    it('應該將錯誤持久化到 localStorage', () => {
      const testError = new Error('Persistent error');
      
      errorTracker.captureError(testError);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'error_tracker_reports',
        expect.any(String)
      );
    });

    it('應該處理 localStorage 存儲失敗', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });
      
      expect(() => {
        errorTracker.captureError('Test error');
      }).not.toThrow();
      
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Failed to store error in localStorage:',
        expect.any(Error)
      );
    });
  });

  describe('Error Metrics', () => {
    it('應該正確計算錯誤統計', () => {
      errorTracker.captureError('Error 1', { component: 'ComponentA' }, 'high');
      errorTracker.captureError('Error 2', { component: 'ComponentA' }, 'medium');
      errorTracker.captureError('Error 3', { component: 'ComponentB' }, 'low');
      
      const metrics = errorTracker.getMetrics();
      
      expect(metrics.totalErrors).toBe(3);
      expect(metrics.errorsByType.ComponentA).toBe(2);
      expect(metrics.errorsByType.ComponentB).toBe(1);
      expect(metrics.errorsBySeverity.high).toBe(1);
      expect(metrics.errorsBySeverity.medium).toBe(1);
      expect(metrics.errorsBySeverity.low).toBe(1);
      expect(metrics.recentErrors).toHaveLength(3);
    });

    it('應該提供最近的錯誤', () => {
      for (let i = 0; i < 15; i++) {
        errorTracker.captureError(`Error ${i}`);
      }
      
      const metrics = errorTracker.getMetrics();
      expect(metrics.recentErrors).toHaveLength(10); // Should limit to 10
      expect(metrics.recentErrors[0].message).toBe('Error 14'); // Most recent first
    });
  });

  describe('Error Management', () => {
    it('應該能夠清除所有錯誤', () => {
      errorTracker.captureError('Error 1');
      errorTracker.captureError('Error 2');
      
      errorTracker.clearErrors();
      
      const metrics = errorTracker.getMetrics();
      expect(metrics.totalErrors).toBe(0);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('error_tracker_reports');
    });

    it('應該能夠啟用和禁用錯誤追蹤', () => {
      errorTracker.setEnabled(false);
      expect(errorTracker.isTrackingEnabled()).toBe(false);
      
      const errorId = errorTracker.captureError('Test error');
      expect(errorId).toBe('');
      
      errorTracker.setEnabled(true);
      expect(errorTracker.isTrackingEnabled()).toBe(true);
      
      const errorId2 = errorTracker.captureError('Test error 2');
      expect(errorId2).toBeDefined();
      expect(errorId2).not.toBe('');
    });
  });

  describe('Convenience Functions', () => {
    it('應該提供便利的捕獲函數', () => {
      const errorId1 = captureError('Test error 1');
      const errorId2 = captureApiError('/api/test', 404, 'Not found');
      const errorId3 = captureUserError('click', 'Button', 'Click failed');
      
      expect(errorId1).toBeDefined();
      expect(errorId2).toBeDefined();
      expect(errorId3).toBeDefined();
      
      const metrics = errorTracker.getMetrics();
      expect(metrics.totalErrors).toBe(3);
    });
  });

  describe('Development vs Production', () => {
    it('應該在開發模式下記錄到控制台', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      errorTracker.captureError('Test error', { component: 'TestComponent' });
      
      expect(mockConsoleGroup).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleTable).toHaveBeenCalled();
      expect(mockConsoleGroupEnd).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});