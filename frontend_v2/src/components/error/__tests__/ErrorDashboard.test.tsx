import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ErrorDashboard from '../ErrorDashboard';
import { getErrorTracker, ErrorReport, ErrorMetrics } from '@/lib/error-tracking/error-tracker';

// Mock the error tracker
const mockErrorTracker = {
  getMetrics: jest.fn(),
  getAllErrors: jest.fn(),
  clearErrors: jest.fn()
};

jest.mock('@/lib/error-tracking/error-tracker', () => ({
  getErrorTracker: jest.fn(() => mockErrorTracker)
}));

// Mock data
const mockMetrics: ErrorMetrics = {
  totalErrors: 10,
  errorsBySeverity: {
    critical: 2,
    high: 3,
    medium: 4,
    low: 1
  },
  errorsByType: {
    'ErrorBoundary': 3,
    'API': 4,
    'Performance': 2,
    'Validation': 1
  }
};

const mockErrors: ErrorReport[] = [
  {
    id: 'error-1',
    message: 'Critical API failure',
    severity: 'critical',
    timestamp: '2024-01-01T10:00:00.000Z',
    fingerprint: 'api-failure-123',
    context: {
      component: 'API',
      action: 'fetch_data',
      url: '/api/test'
    },
    stack: 'Error: API failure\n    at fetch (/api/test)\n    at component.tsx:10'
  },
  {
    id: 'error-2',
    message: 'Form validation error',
    severity: 'medium',
    timestamp: '2024-01-01T09:30:00.000Z',
    fingerprint: 'validation-456',
    context: {
      component: 'FormComponent',
      action: 'validate_input'
    }
  },
  {
    id: 'error-3',
    message: 'Performance issue detected',
    severity: 'low',
    timestamp: '2024-01-01T09:00:00.000Z',
    fingerprint: 'performance-789',
    context: {
      component: 'PerformanceMonitor',
      action: 'measure_performance'
    },
    stack: 'Warning: Slow render detected'
  }
];

describe('ErrorDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockErrorTracker.getMetrics.mockReturnValue(mockMetrics);
    mockErrorTracker.getAllErrors.mockReturnValue(mockErrors);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('in development environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('renders the dashboard directly in development mode', () => {
      render(<ErrorDashboard />);

      expect(screen.getByText('錯誤監控儀表板')).toBeInTheDocument();
      expect(screen.getByText('統計資訊')).toBeInTheDocument();
      expect(screen.getByText('錯誤列表')).toBeInTheDocument();
    });

    it('displays metrics correctly', () => {
      render(<ErrorDashboard />);

      expect(screen.getByText('10')).toBeInTheDocument(); // Total errors
      expect(screen.getByText('總錯誤數')).toBeInTheDocument();
      expect(screen.getAllByText('2')).toHaveLength(3); // Critical errors appears in metrics and types
      expect(screen.getByText('嚴重錯誤')).toBeInTheDocument();
    });

    it('displays errors by severity', () => {
      render(<ErrorDashboard />);

      expect(screen.getAllByText('critical')).toHaveLength(2); // In both metrics and error list
      expect(screen.getAllByText('medium')).toHaveLength(2);
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getAllByText('low')).toHaveLength(2); // In both metrics and error list
    });

    it('displays errors by type', () => {
      render(<ErrorDashboard />);

      expect(screen.getByText('ErrorBoundary')).toBeInTheDocument();
      expect(screen.getByText('API')).toBeInTheDocument();
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Validation')).toBeInTheDocument();
    });

    it('displays error list with correct information', () => {
      render(<ErrorDashboard />);

      expect(screen.getByText('Critical API failure')).toBeInTheDocument();
      expect(screen.getByText('Form validation error')).toBeInTheDocument();
      expect(screen.getByText('Performance issue detected')).toBeInTheDocument();
    });

    it('shows no errors message when error list is empty', () => {
      mockErrorTracker.getAllErrors.mockReturnValue([]);
      render(<ErrorDashboard />);

      expect(screen.getByText('沒有錯誤記錄')).toBeInTheDocument();
    });

    it('selects and displays error details when clicking on an error', () => {
      render(<ErrorDashboard />);

      // Initially no error selected
      expect(screen.getByText('選擇一個錯誤以查看詳細信息')).toBeInTheDocument();

      // Click on first error
      const errorElement = screen.getByText('Critical API failure').closest('div[class*="cursor-pointer"]');
      fireEvent.click(errorElement!);

      // Should show error details
      expect(screen.getByText('錯誤詳細信息')).toBeInTheDocument();
      expect(screen.getByText('api-failure-123')).toBeInTheDocument();
      expect(screen.getByText(/Error: API failure/)).toBeInTheDocument();
    });

    it('highlights selected error in the list', () => {
      render(<ErrorDashboard />);

      const errorItem = screen.getByText('Critical API failure').closest('div[class*="cursor-pointer"]');
      fireEvent.click(errorItem!);

      expect(errorItem).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('clears all errors when clear button is clicked', () => {
      render(<ErrorDashboard />);

      const clearButton = screen.getByText('清除所有錯誤');
      fireEvent.click(clearButton);

      expect(mockErrorTracker.clearErrors).toHaveBeenCalledTimes(1);
      expect(mockErrorTracker.getMetrics).toHaveBeenCalled();
      expect(mockErrorTracker.getAllErrors).toHaveBeenCalled();
    });

    it('closes dashboard when close button is clicked', () => {
      // Set to production mode so the close button actually hides the dashboard
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      render(<ErrorDashboard />);
      
      // First, show the dashboard
      const toggleButton = screen.getByTitle('顯示錯誤監控');
      fireEvent.click(toggleButton);
      expect(screen.getByText('錯誤監控儀表板')).toBeInTheDocument();
      
      // Then close it
      const closeButton = screen.getByRole('button', { name: '' }); // SVG close button
      fireEvent.click(closeButton);

      expect(screen.queryByText('錯誤監控儀表板')).not.toBeInTheDocument();
      
      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });

    it('applies correct severity colors', () => {
      render(<ErrorDashboard />);

      // Check severity badges in metrics section
      const criticalBadge = screen.getAllByText('critical')[0];
      expect(criticalBadge).toHaveClass('text-red-800', 'bg-red-100');

      const mediumBadge = screen.getAllByText('medium')[0];
      expect(mediumBadge).toHaveClass('text-yellow-700', 'bg-yellow-50');
    });

    it('formats timestamps correctly', () => {
      render(<ErrorDashboard />);

      // Should display formatted date (check for date presence)
      // The exact format depends on locale, so just check that timestamps are rendered
      expect(screen.getAllByText(/AM|PM|\d{2}:\d{2}/)).toHaveLength(3);
    });

    it('updates data automatically every 5 seconds', async () => {
      render(<ErrorDashboard />);

      // Initial calls
      expect(mockErrorTracker.getMetrics).toHaveBeenCalledTimes(1);
      expect(mockErrorTracker.getAllErrors).toHaveBeenCalledTimes(1);

      // Fast forward 5 seconds with act
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Should be called again
      expect(mockErrorTracker.getMetrics).toHaveBeenCalledTimes(2);
      expect(mockErrorTracker.getAllErrors).toHaveBeenCalledTimes(2);
    });

    it('displays stack trace when available', () => {
      render(<ErrorDashboard />);

      // Click on first error which has stack trace
      fireEvent.click(screen.getByText('Critical API failure'));

      expect(screen.getByText('堆疊追蹤')).toBeInTheDocument();
      expect(screen.getByText(/Error: API failure/)).toBeInTheDocument();
    });

    it('handles errors without stack trace', () => {
      render(<ErrorDashboard />);

      // Click on second error which has no stack trace
      fireEvent.click(screen.getByText('Form validation error'));

      expect(screen.getByText('錯誤詳細信息')).toBeInTheDocument();
      expect(screen.queryByText('堆疊追蹤')).not.toBeInTheDocument();
    });

    it('displays context information correctly', () => {
      render(<ErrorDashboard />);

      fireEvent.click(screen.getByText('Critical API failure'));

      expect(screen.getByText('上下文')).toBeInTheDocument();
      expect(screen.getByText(/"component": "API"/)).toBeInTheDocument();
      expect(screen.getByText(/"action": "fetch_data"/)).toBeInTheDocument();
    });
  });

  describe('in production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('shows only toggle button in production mode by default', () => {
      render(<ErrorDashboard />);

      expect(screen.queryByText('錯誤監控儀表板')).not.toBeInTheDocument();
      expect(screen.getByTitle('顯示錯誤監控')).toBeInTheDocument();
    });

    it('shows dashboard when toggle button is clicked in production', () => {
      render(<ErrorDashboard />);

      const toggleButton = screen.getByTitle('顯示錯誤監控');
      fireEvent.click(toggleButton);

      expect(screen.getByText('錯誤監控儀表板')).toBeInTheDocument();
    });

    it('can hide dashboard again after showing it', () => {
      render(<ErrorDashboard />);

      // Show dashboard
      const toggleButton = screen.getByTitle('顯示錯誤監控');
      fireEvent.click(toggleButton);

      expect(screen.getByText('錯誤監控儀表板')).toBeInTheDocument();

      // Hide dashboard
      const closeButton = screen.getByRole('button', { name: '' });
      fireEvent.click(closeButton);

      expect(screen.queryByText('錯誤監控儀表板')).not.toBeInTheDocument();
      expect(screen.getByTitle('顯示錯誤監控')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'; // Ensure development mode for edge cases
    });

    it('handles null metrics gracefully', () => {
      mockErrorTracker.getMetrics.mockReturnValue(null);
      render(<ErrorDashboard />);

      // Should still show error list even without metrics
      expect(screen.getByText('錯誤列表')).toBeInTheDocument();
      expect(screen.queryByText('總錯誤數')).not.toBeInTheDocument();
    });

    it('handles empty severity and type objects', () => {
      const emptyMetrics: ErrorMetrics = {
        totalErrors: 0,
        errorsBySeverity: {},
        errorsByType: {}
      };
      mockErrorTracker.getMetrics.mockReturnValue(emptyMetrics);
      mockErrorTracker.getAllErrors.mockReturnValue([]);
      render(<ErrorDashboard />);

      expect(screen.getAllByText('0')).toHaveLength(2); // Total errors and critical errors
    });

    it('handles error selection state correctly', () => {
      render(<ErrorDashboard />);

      // Select first error
      const firstError = screen.getByText('Critical API failure').closest('div[class*="cursor-pointer"]');
      fireEvent.click(firstError!);
      expect(screen.getByText('api-failure-123')).toBeInTheDocument();

      // Select different error
      const secondError = screen.getByText('Form validation error').closest('div[class*="cursor-pointer"]');
      fireEvent.click(secondError!);
      expect(screen.getByText('validation-456')).toBeInTheDocument();
      expect(screen.queryByText('api-failure-123')).not.toBeInTheDocument();
    });

    it('cleans up interval on unmount', async () => {
      const { unmount } = render(<ErrorDashboard />);
      
      // Fast forward to trigger interval
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      
      // Unmount component
      unmount();
      
      // Clear any pending timers
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      
      // Should not cause any errors or additional calls
      expect(mockErrorTracker.getMetrics).toHaveBeenCalledTimes(2); // Initial + first interval
    });

    it('handles errors with missing context fields', () => {
      const errorWithMissingContext: ErrorReport = {
        id: 'error-missing',
        message: 'Error with missing context',
        severity: 'high',
        timestamp: '2024-01-01T10:00:00.000Z',
        fingerprint: 'missing-context',
        context: {} as any
      };

      mockErrorTracker.getAllErrors.mockReturnValue([errorWithMissingContext]);
      render(<ErrorDashboard />);

      const errorElement = screen.getByText('Error with missing context').closest('div[class*="cursor-pointer"]');
      fireEvent.click(errorElement!);
      expect(screen.getByText('錯誤詳細信息')).toBeInTheDocument();
    });
  });
});