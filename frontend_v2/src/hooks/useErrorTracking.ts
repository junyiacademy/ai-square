import { useCallback, useEffect, useState } from 'react';
import { getErrorTracker, ErrorContext, ErrorReport } from '@/lib/error-tracking/error-tracker';

interface UseErrorTrackingReturn {
  captureError: (error: Error | string, context?: ErrorContext, severity?: ErrorReport['severity']) => string;
  captureApiError: (url: string, status: number, response: unknown, context?: ErrorContext) => string;
  captureUserError: (action: string, error: Error | string, context?: ErrorContext) => string;
  trackAsync: <T>(
    asyncFn: () => Promise<T>,
    context?: ErrorContext,
    severity?: ErrorReport['severity']
  ) => Promise<T>;
  withErrorTracking: <T extends unknown[], R>(
    fn: (...args: T) => R,
    context?: ErrorContext,
    severity?: ErrorReport['severity']
  ) => (...args: T) => R;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  errorCount: number;
}

export const useErrorTracking = (componentName?: string): UseErrorTrackingReturn => {
  const [isEnabled, setIsEnabledState] = useState(true);
  const [errorCount, setErrorCount] = useState(0);
  const errorTracker = getErrorTracker();

  // Update error count periodically
  useEffect(() => {
    const updateErrorCount = () => {
      const metrics = errorTracker.getMetrics();
      setErrorCount(metrics.totalErrors);
    };

    updateErrorCount();
    const interval = setInterval(updateErrorCount, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [errorTracker]);

  const captureError = useCallback((
    error: Error | string,
    context: ErrorContext = {},
    severity: ErrorReport['severity'] = 'medium'
  ) => {
    const enhancedContext = {
      component: componentName,
      ...context
    };
    return errorTracker.captureError(error, enhancedContext, severity);
  }, [errorTracker, componentName]);

  const captureApiError = useCallback((
    url: string,
    status: number,
    response: unknown,
    context: ErrorContext = {}
  ) => {
    const enhancedContext = {
      component: componentName,
      ...context
    };
    return errorTracker.captureApiError(url, status, response, enhancedContext);
  }, [errorTracker, componentName]);

  const captureUserError = useCallback((
    action: string,
    error: Error | string,
    context: ErrorContext = {}
  ) => {
    const enhancedContext = {
      component: componentName,
      ...context
    };
    return errorTracker.captureUserError(action, componentName || 'Unknown', error, enhancedContext);
  }, [errorTracker, componentName]);

  const trackAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context: ErrorContext = {},
    severity: ErrorReport['severity'] = 'medium'
  ): Promise<T> => {
    try {
      return await asyncFn();
    } catch (error) {
      captureError(error as Error, {
        ...context,
        errorType: 'async_operation'
      }, severity);
      throw error; // Re-throw to maintain original behavior
    }
  }, [captureError]);

  const withErrorTracking = useCallback(<T extends unknown[], R>(
    fn: (...args: T) => R,
    context: ErrorContext = {},
    severity: ErrorReport['severity'] = 'medium'
  ) => {
    return (...args: T): R => {
      try {
        return fn(...args);
      } catch (error) {
        captureError(error as Error, {
          ...context,
          errorType: 'function_call',
          functionArgs: args
        }, severity);
        throw error; // Re-throw to maintain original behavior
      }
    };
  }, [captureError]);

  const setEnabled = useCallback((enabled: boolean) => {
    errorTracker.setEnabled(enabled);
    setIsEnabledState(enabled);
  }, [errorTracker]);

  return {
    captureError,
    captureApiError,
    captureUserError,
    trackAsync,
    withErrorTracking,
    isEnabled,
    setEnabled,
    errorCount
  };
};

export default useErrorTracking;