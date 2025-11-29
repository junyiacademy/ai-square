/**
 * History Page - Filter Functionality Tests
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { renderWithProviders, screen, userEvent } from '@/test-utils';
import '@testing-library/jest-dom';
import UnifiedHistoryPage from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn(), forward: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/history',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'navigation:filterAll': 'All',
        'assessment:title': 'Assessment',
        'pbl:title': 'Problem-Based Learning',
        'discovery:title': 'Discovery',
        'navigation:noHistory': 'No learning history found',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('@/components/ui/history-skeletons', () => ({
  HistoryPageSkeleton: () => <div data-testid="history-skeleton">Loading...</div>,
}));

jest.mock('@/utils/locale', () => ({
  formatDateWithLocale: jest.fn((date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('en-US');
  }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('UnifiedHistoryPage - Filter Functionality', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(async () => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'isLoggedIn') return 'true';
      if (key === 'user') return JSON.stringify({ id: 'user-123', email: 'test@example.com' });
      return null;
    });

    // Mock mixed data
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/assessment/results')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [
              {
                assessment_id: 'assessment-1',
                timestamp: '2024-01-15T10:30:00Z',
                scores: { overall: 85, domains: {} },
                summary: { total_questions: 20, correct_answers: 17, level: 'advanced' },
                duration_seconds: 1200,
                language: 'en',
              },
            ],
          }),
        });
      }
      if (url.includes('/api/pbl/history')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            programs: [
              {
                id: 'pbl-1',
                scenarioId: 'scenario-1',
                scenarioTitle: 'PBL Scenario',
                status: 'completed',
                startedAt: '2024-01-15T09:00:00Z',
                totalTimeSeconds: 3600,
                evaluatedTasks: 2,
                totalTaskCount: 3,
                tasks: []
              },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });
  });

  it('should display all filter buttons with correct counts', async () => {
    renderWithProviders(<UnifiedHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('All (2)')).toBeInTheDocument();
      expect(screen.getByText('Assessment (1)')).toBeInTheDocument();
      expect(screen.getByText('Problem-Based Learning (1)')).toBeInTheDocument();
      expect(screen.getByText('Discovery (0)')).toBeInTheDocument();
    });
  });

  it('should filter items correctly when assessment filter is selected', async () => {
    renderWithProviders(<UnifiedHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('All (2)')).toBeInTheDocument();
    });

    const assessmentFilter = screen.getByText('Assessment (1)');
    await user.click(assessmentFilter);

    await waitFor(() => {
      expect(screen.getByText('ID: assessment-1')).toBeInTheDocument();
      expect(screen.queryByText('PBL Scenario')).not.toBeInTheDocument();
    });
  });

  it('should filter items correctly when PBL filter is selected', async () => {
    renderWithProviders(<UnifiedHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('All (2)')).toBeInTheDocument();
    });

    const pblFilter = screen.getByText('Problem-Based Learning (1)');
    await user.click(pblFilter);

    await waitFor(() => {
      expect(screen.getByText('PBL Scenario')).toBeInTheDocument();
      expect(screen.queryByText('ID: assessment-1')).not.toBeInTheDocument();
    });
  });

  it('should show all items when "All" filter is selected', async () => {
    renderWithProviders(<UnifiedHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('All (2)')).toBeInTheDocument();
    });

    // First select PBL filter
    const pblFilter = screen.getByText('Problem-Based Learning (1)');
    await user.click(pblFilter);

    await waitFor(() => {
      expect(screen.queryByText('ID: assessment-1')).not.toBeInTheDocument();
    });

    // Then select All filter
    const allFilter = screen.getByText('All (2)');
    await user.click(allFilter);

    await waitFor(() => {
      expect(screen.getByText('PBL Scenario')).toBeInTheDocument();
      expect(screen.getByText('ID: assessment-1')).toBeInTheDocument();
    });
  });

  it('should update filter button styles correctly', async () => {
    renderWithProviders(<UnifiedHistoryPage />);

    await waitFor(() => {
      const allFilter = screen.getByText('All (2)');
      expect(allFilter).toHaveClass('bg-blue-600', 'text-white');
    });

    const assessmentFilter = screen.getByText('Assessment (1)');
    await user.click(assessmentFilter);

    await waitFor(() => {
      expect(assessmentFilter).toHaveClass('bg-blue-600', 'text-white');
      expect(screen.getByText('All (2)')).not.toHaveClass('bg-blue-600', 'text-white');
    });
  });
});
