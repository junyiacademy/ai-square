import { renderHook, act } from '@testing-library/react';
import { useErrorTracking } from '../useErrorTracking';
import { getErrorTracker } from '../../lib/error-tracking/error-tracker';

// Mock the error tracker
jest.mock('../../lib/error-tracking/error-tracker');

const mockErrorTracker = {
  captureError: jest.fn(),
  captureApiError: jest.fn(),
  captureUserError: jest.fn(),
  getMetrics: jest.fn(),
  setEnabled: jest.fn(),
  isTrackingEnabled: jest.fn()
};

(getErrorTracker as jest.Mock).mockReturnValue(mockErrorTracker);

describe('useErrorTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockErrorTracker.getMetrics.mockReturnValue({
      totalErrors: 0,
      errorsByType: {},
      errorsBySeverity: {},
      recentErrors: []
    });
    mockErrorTracker.isTrackingEnabled.mockReturnValue(true);
  });

  it('應該正確初始化', () => {
    const { result } = renderHook(() => useErrorTracking('TestComponent'));

    expect(result.current.captureError).toBeDefined();
    expect(result.current.captureApiError).toBeDefined();
    expect(result.current.captureUserError).toBeDefined();
    expect(result.current.trackAsync).toBeDefined();
    expect(result.current.withErrorTracking).toBeDefined();
    expect(result.current.isEnabled).toBe(true);
    expect(result.current.errorCount).toBe(0);
  });

  it('應該使用組件名稱增強錯誤上下文', () => {
    const { result } = renderHook(() => useErrorTracking('TestComponent'));
    const testError = new Error('Test error');
    const context = { action: 'test_action' };

    act(() => {
      result.current.captureError(testError, context, 'high');
    });

    expect(mockErrorTracker.captureError).toHaveBeenCalledWith(
      testError,
      { component: 'TestComponent', action: 'test_action' },
      'high'
    );
  });

  it('應該正確捕獲 API 錯誤', () => {
    const { result } = renderHook(() => useErrorTracking('APIClient'));
    const url = '/api/test';
    const status = 500;
    const response = { error: 'Server error' };

    act(() => {
      result.current.captureApiError(url, status, response);
    });

    expect(mockErrorTracker.captureApiError).toHaveBeenCalledWith(
      url,
      status,
      response,
      { component: 'APIClient' }
    );
  });

  it('應該正確捕獲用戶錯誤', () => {
    const { result } = renderHook(() => useErrorTracking('UserForm'));
    const action = 'submit_form';
    const error = 'Validation failed';

    act(() => {
      result.current.captureUserError(action, error);
    });

    expect(mockErrorTracker.captureUserError).toHaveBeenCalledWith(
      action,
      'UserForm',
      error,
      { component: 'UserForm' }
    );
  });

  it('應該追蹤異步操作中的錯誤', async () => {
    const { result } = renderHook(() => useErrorTracking('AsyncComponent'));
    const asyncError = new Error('Async operation failed');
    const failingAsyncFn = jest.fn().mockRejectedValue(asyncError);

    await expect(
      result.current.trackAsync(failingAsyncFn, { operation: 'fetch_data' })
    ).rejects.toThrow('Async operation failed');

    expect(mockErrorTracker.captureError).toHaveBeenCalledWith(
      asyncError,
      {
        component: 'AsyncComponent',
        operation: 'fetch_data',
        errorType: 'async_operation'
      },
      'medium'
    );
  });

  it('應該在異步操作成功時不捕獲錯誤', async () => {
    const { result } = renderHook(() => useErrorTracking('AsyncComponent'));
    const successfulAsyncFn = jest.fn().mockResolvedValue('success');

    const result_value = await result.current.trackAsync(successfulAsyncFn);

    expect(result_value).toBe('success');
    expect(mockErrorTracker.captureError).not.toHaveBeenCalled();
  });

  it('應該包裝函數以進行錯誤追蹤', () => {
    const { result } = renderHook(() => useErrorTracking('FunctionComponent'));
    const error = new Error('Function error');
    const failingFn = jest.fn().mockImplementation(() => {
      throw error;
    });

    const wrappedFn = result.current.withErrorTracking(
      failingFn,
      { operation: 'calculation' }
    );

    expect(() => wrappedFn('arg1', 'arg2')).toThrow('Function error');

    expect(mockErrorTracker.captureError).toHaveBeenCalledWith(
      error,
      {
        component: 'FunctionComponent',
        operation: 'calculation',
        errorType: 'function_call',
        functionArgs: ['arg1', 'arg2']
      },
      'medium'
    );
  });

  it('應該在函數成功時不捕獲錯誤', () => {
    const { result } = renderHook(() => useErrorTracking('FunctionComponent'));
    const successfulFn = jest.fn().mockReturnValue('success');

    const wrappedFn = result.current.withErrorTracking(successfulFn);
    const result_value = wrappedFn('arg1');

    expect(result_value).toBe('success');
    expect(mockErrorTracker.captureError).not.toHaveBeenCalled();
  });

  it('應該更新錯誤計數', () => {
    mockErrorTracker.getMetrics.mockReturnValue({
      totalErrors: 5,
      errorsByType: {},
      errorsBySeverity: {},
      recentErrors: []
    });

    const { result } = renderHook(() => useErrorTracking());

    // Initial render should get the error count
    expect(result.current.errorCount).toBe(5);
  });

  it('應該能夠啟用和禁用錯誤追蹤', () => {
    const { result } = renderHook(() => useErrorTracking());

    act(() => {
      result.current.setEnabled(false);
    });

    expect(mockErrorTracker.setEnabled).toHaveBeenCalledWith(false);
  });

  it('應該處理沒有組件名稱的情況', () => {
    const { result } = renderHook(() => useErrorTracking());
    const testError = new Error('Test error');

    act(() => {
      result.current.captureError(testError);
    });

    expect(mockErrorTracker.captureError).toHaveBeenCalledWith(
      testError,
      { component: undefined },
      'medium'
    );
  });

  it('應該允許覆蓋上下文中的組件名稱', () => {
    const { result } = renderHook(() => useErrorTracking('DefaultComponent'));
    const testError = new Error('Test error');

    act(() => {
      result.current.captureError(testError, { component: 'OverrideComponent' });
    });

    expect(mockErrorTracker.captureError).toHaveBeenCalledWith(
      testError,
      { component: 'OverrideComponent' },
      'medium'
    );
  });
});
