/**
 * Error Tracking Service
 * Provides centralized error tracking and reporting
 */

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: ErrorContext;
  fingerprint: string;
  timestamp: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: ErrorReport[];
}

class ErrorTracker {
  private errors: ErrorReport[] = [];
  private maxStoredErrors = 100;
  private isEnabled = true;

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        component: 'Global',
        action: 'uncaught_error',
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        {
          component: 'Global',
          action: 'unhandled_rejection',
          url: window.location.href,
          userAgent: navigator.userAgent
        }
      );
    });

    // Handle React error boundaries (if available)
    if ('onunhandledrejection' in window) {
      window.onunhandledrejection = (event) => {
        this.captureError(
          new Error(`React Error: ${event.reason}`),
          {
            component: 'React',
            action: 'error_boundary',
            url: window.location.href
          }
        );
      };
    }
  }

  /**
   * Capture and track an error
   */
  captureError(
    error: Error | string,
    context: ErrorContext = {},
    severity: ErrorReport['severity'] = 'medium'
  ): string {
    if (!this.isEnabled) return '';

    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const timestamp = new Date().toISOString();

    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      message: errorObj.message,
      stack: errorObj.stack,
      severity,
      context: {
        ...context,
        timestamp,
        url: context.url || (typeof window !== 'undefined' ? window.location.href : ''),
        userAgent: context.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '')
      },
      fingerprint: this.generateFingerprint(errorObj, context),
      timestamp
    };

    this.storeError(errorReport);
    this.reportError(errorReport);

    return errorReport.id;
  }

  /**
   * Capture API errors
   */
  captureApiError(
    url: string,
    status: number,
    response: unknown,
    context: ErrorContext = {}
  ): string {
    const error = new Error(`API Error: ${status} ${url}`);
    return this.captureError(error, {
      ...context,
      component: 'API',
      action: 'api_request',
      apiUrl: url,
      statusCode: status,
      response: typeof response === 'string' ? response : JSON.stringify(response)
    }, status >= 500 ? 'high' : 'medium');
  }

  /**
   * Capture user action errors
   */
  captureUserError(
    action: string,
    component: string,
    error: Error | string,
    context: ErrorContext = {}
  ): string {
    return this.captureError(error, {
      ...context,
      component,
      action,
      errorType: 'user_action'
    }, 'low');
  }

  /**
   * Store error in memory (and optionally persist)
   */
  private storeError(errorReport: ErrorReport): void {
    this.errors.unshift(errorReport);

    // Keep only recent errors
    if (this.errors.length > this.maxStoredErrors) {
      this.errors = this.errors.slice(0, this.maxStoredErrors);
    }

    // Store in localStorage for persistence
    try {
      const storedErrors = this.getStoredErrors();
      storedErrors.unshift(errorReport);
      const trimmedErrors = storedErrors.slice(0, 50); // Keep fewer in storage

      localStorage.setItem('error_tracker_reports', JSON.stringify(trimmedErrors));
    } catch (e) {
      console.warn('Failed to store error in localStorage:', e);
    }
  }

  /**
   * Report error to external service (if configured)
   */
  private reportError(errorReport: ErrorReport): void {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Tracked: ${errorReport.severity.toUpperCase()}`);
      console.error('Message:', errorReport.message);
      console.error('Stack:', errorReport.stack);
      console.table(errorReport.context);
      console.groupEnd();
    }

    // In production, send to external error reporting service
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ERROR_REPORTING_URL) {
      this.sendToExternalService(errorReport).catch(e => {
        console.warn('Failed to send error to external service:', e);
      });
    }
  }

  /**
   * Send error to external reporting service
   */
  private async sendToExternalService(errorReport: ErrorReport): Promise<void> {
    try {
      await fetch(process.env.NEXT_PUBLIC_ERROR_REPORTING_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport)
      });
    } catch {
      // Silent fail - don't create infinite error loops
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate error fingerprint for grouping similar errors
   */
  private generateFingerprint(error: Error, context: ErrorContext): string {
    const key = `${error.message}_${context.component}_${context.action}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
  }

  /**
   * Get error metrics
   */
  getMetrics(): ErrorMetrics {
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    this.errors.forEach(error => {
      const type = error.context.component || 'Unknown';
      errorsByType[type] = (errorsByType[type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: this.errors.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: this.errors.slice(0, 10)
    };
  }

  /**
   * Get stored errors from localStorage
   */
  private getStoredErrors(): ErrorReport[] {
    try {
      const stored = localStorage.getItem('error_tracker_reports');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get all errors (memory + storage)
   */
  getAllErrors(): ErrorReport[] {
    const storedErrors = this.getStoredErrors();
    const allErrors = [...this.errors, ...storedErrors];

    // Remove duplicates by ID
    const uniqueErrors = allErrors.filter((error, index, self) =>
      index === self.findIndex(e => e.id === error.id)
    );

    return uniqueErrors.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Clear all stored errors
   */
  clearErrors(): void {
    this.errors = [];
    try {
      localStorage.removeItem('error_tracker_reports');
    } catch (e) {
      console.warn('Failed to clear errors from localStorage:', e);
    }
  }

  /**
   * Enable/disable error tracking
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if error tracking is enabled
   */
  isTrackingEnabled(): boolean {
    return this.isEnabled;
  }
}

// Singleton instance
let errorTrackerInstance: ErrorTracker | null = null;

export const getErrorTracker = (): ErrorTracker => {
  if (!errorTrackerInstance) {
    errorTrackerInstance = new ErrorTracker();
  }
  return errorTrackerInstance;
};

// Export convenience methods
export const captureError = (error: Error | string, context?: ErrorContext, severity?: ErrorReport['severity']) => {
  return getErrorTracker().captureError(error, context, severity);
};

export const captureApiError = (url: string, status: number, response: unknown, context?: ErrorContext) => {
  return getErrorTracker().captureApiError(url, status, response, context);
};

export const captureUserError = (action: string, component: string, error: Error | string, context?: ErrorContext) => {
  return getErrorTracker().captureUserError(action, component, error, context);
};
