/**
 * History Page - Data Fetching Tests
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils';
import '@testing-library/jest-dom';
import UnifiedHistoryPage from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn(), forward: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/history',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en', changeLanguage: jest.fn() } }),
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

describe('UnifiedHistoryPage - Data Fetching', () => {
  const mockUserData = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'isLoggedIn') return 'true';
      if (key === 'user') return JSON.stringify(mockUserData);
      return null;
    });
  });

  it('should fetch assessment history correctly', async () => {
    const mockAssessmentData = {
      data: [
        {
          assessment_id: 'test-assessment-1',
          timestamp: '2024-01-15T10:30:00Z',
          scores: {
            overall: 85,
            domains: {
              engaging_with_ai: 90,
              creating_with_ai: 80,
              managing_with_ai: 85,
              designing_with_ai: 85,
            },
          },
          summary: {
            total_questions: 20,
            correct_answers: 17,
            level: 'advanced',
          },
          duration_seconds: 1200,
          language: 'en',
        },
      ],
    };

    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/assessment/results')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAssessmentData),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, programs: [] }),
      });
    });

    renderWithProviders(<UnifiedHistoryPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/assessment/results?userId=${mockUserData.id}&userEmail=${encodeURIComponent(mockUserData.email)}`),
        { credentials: 'include' }
      );
    });
  });

  it('should fetch PBL history correctly', async () => {
    const mockPBLData = {
      success: true,
      programs: [
        {
          id: 'pbl-program-1',
          scenarioId: 'scenario-1',
          scenarioTitle: 'AI Ethics Dilemma',
          status: 'completed',
          startedAt: '2024-01-15T09:00:00Z',
          completedAt: '2024-01-15T11:30:00Z',
          totalTimeSeconds: 9000,
          evaluatedTasks: 3,
          totalTaskCount: 3,
          overallScore: 88,
          tasks: [
            {
              id: 'task-1',
              title: 'Ethics Analysis',
              log: { interactions: [1, 2, 3] }
            }
          ],
          domainScores: {
            engaging_with_ai: 85,
            creating_with_ai: 90,
            managing_with_ai: 88,
            designing_with_ai: 90,
          },
          ksaScores: {
            knowledge: 85,
            skills: 90,
            attitudes: 88,
          },
        },
      ],
    };

    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/pbl/history')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPBLData),
        });
      }
      if (url.includes('/api/assessment/results')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    renderWithProviders(<UnifiedHistoryPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/pbl/history?lang=en&t='),
        { credentials: 'include', cache: 'no-store' }
      );
    });
  });

  it('should fetch Discovery history correctly', async () => {
    const mockDiscoveryScenarios = [
      {
        id: 'discovery-scenario-1',
        title: 'Data Scientist Career Path',
        metadata: { careerType: 'data_scientist' },
        userPrograms: { total: 1 }
      }
    ];

    const mockDiscoveryPrograms = [
      {
        id: 'discovery-program-1',
        status: 'completed',
        startedAt: '2024-01-15T08:00:00Z',
        completedAt: '2024-01-15T10:00:00Z',
        totalTaskCount: 5,
        currentTaskIndex: 4,
        taskLogs: [
          { isCompleted: true },
          { isCompleted: true },
          { isCompleted: true },
          { isCompleted: true },
          { isCompleted: true },
        ],
        completionData: {
          overallScore: 92,
          domainScores: {
            engaging_with_ai: 90,
            creating_with_ai: 95,
            managing_with_ai: 88,
            designing_with_ai: 95,
          },
          ksaScores: {
            knowledge: 88,
            skills: 95,
            attitudes: 93,
          },
        },
        metadata: { currentTaskId: 'task-5' },
      }
    ];

    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/discovery/my-programs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDiscoveryScenarios),
        });
      }
      if (url.includes('/api/discovery/scenarios/discovery-scenario-1/programs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDiscoveryPrograms),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
    });

    renderWithProviders(<UnifiedHistoryPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/discovery/my-programs?t='),
        { credentials: 'include', cache: 'no-store' }
      );
    });
  });

  it('should handle API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    mockFetch.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<UnifiedHistoryPage />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching history:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should handle partial API failures', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/assessment/results')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      if (url.includes('/api/pbl/history')) {
        return Promise.reject(new Error('PBL API error'));
      }
      if (url.includes('/api/discovery/my-programs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.reject(new Error('Unknown error'));
    });

    renderWithProviders(<UnifiedHistoryPage />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching PBL history:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
