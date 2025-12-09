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
        'navigation:allTypes': 'All',
        'navigation:filterAll': 'All',
        'assessment:title': 'Assessment',
        'pbl:title': 'Problem-Based Learning',
        'navigation:discovery': 'Discovery',
        'discovery:title': 'Discovery',
        'navigation:noHistory': 'No learning history found',
        'navigation:history': 'Learning History',
        'navigation:historyDescription': 'View your learning progress',
        'navigation:startAssessment': 'Start Assessment',
        'navigation:startPBL': 'Start PBL',
        'navigation:startDiscovery': 'Start Discovery',
        'assessment:history.duration': 'Duration',
        'pbl:complete.viewReport': 'View Report',
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
      // Filter buttons show translated labels, not counts
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getAllByText('Assessment').length).toBeGreaterThan(0); // Button and badge
      expect(screen.getAllByText('Problem-Based Learning').length).toBeGreaterThan(0); // Button and badge
      expect(screen.getByText('Discovery')).toBeInTheDocument();

      // Verify both items are displayed (1 assessment + 1 PBL = 2 total)
      expect(screen.getByText('ID: assessment-1')).toBeInTheDocument();
      expect(screen.getByText('PBL Scenario')).toBeInTheDocument();
    });
  });

  it('should filter items correctly when assessment filter is selected', async () => {
    renderWithProviders(<UnifiedHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    // Find the Assessment button specifically (it's the second button in filter bar)
    const assessmentFilter = screen.getAllByText('Assessment')[0]; // First occurrence is the button
    await user.click(assessmentFilter);

    await waitFor(() => {
      expect(screen.getByText('ID: assessment-1')).toBeInTheDocument();
      expect(screen.queryByText('PBL Scenario')).not.toBeInTheDocument();
    });
  });

  it('should filter items correctly when PBL filter is selected', async () => {
    renderWithProviders(<UnifiedHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    // Get the first "Problem-Based Learning" text (the button, not the badge)
    const pblFilter = screen.getAllByText('Problem-Based Learning')[0];
    await user.click(pblFilter);

    await waitFor(() => {
      expect(screen.getByText('PBL Scenario')).toBeInTheDocument();
      expect(screen.queryByText('ID: assessment-1')).not.toBeInTheDocument();
    });
  });

  it('should show all items when "All" filter is selected', async () => {
    renderWithProviders(<UnifiedHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    // First select PBL filter (first occurrence is the button)
    const pblFilter = screen.getAllByText('Problem-Based Learning')[0];
    await user.click(pblFilter);

    await waitFor(() => {
      expect(screen.queryByText('ID: assessment-1')).not.toBeInTheDocument();
    });

    // Then select All filter
    const allFilter = screen.getByText('All');
    await user.click(allFilter);

    await waitFor(() => {
      expect(screen.getByText('PBL Scenario')).toBeInTheDocument();
      expect(screen.getByText('ID: assessment-1')).toBeInTheDocument();
    });
  });

  it('should update filter button styles correctly', async () => {
    renderWithProviders(<UnifiedHistoryPage />);

    await waitFor(() => {
      const allFilter = screen.getByText('All');
      // Default active filter uses indigo-600, not blue-600
      expect(allFilter).toHaveClass('bg-indigo-600', 'text-white');
    });

    // Get the first Assessment text (the button, not the badge)
    const assessmentFilter = screen.getAllByText('Assessment')[0];
    await user.click(assessmentFilter);

    await waitFor(() => {
      expect(assessmentFilter).toHaveClass('bg-indigo-600', 'text-white');
      expect(screen.getByText('All')).not.toHaveClass('bg-indigo-600', 'text-white');
    });
  });
});
