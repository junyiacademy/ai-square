/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import DashboardPage from '../page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'dashboard:welcome' && options?.name) {
        return `Welcome, ${options.name}!`;
      }
      return key.split(':').pop() || key;
    },
  }),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockRouter = {
  push: jest.fn(),
};

describe('Dashboard Page', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockClear();
    mockRouter.push.mockClear();
    
    // Clear localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  it('redirects to login when no user is found', () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
    
    render(<DashboardPage />);
    
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('loads assessment results from database when user is logged in', async () => {
    const mockUser = {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      role: 'student',
    };
    
    const mockAssessmentResponse = {
      results: [{
        scores: {
          overall: 85,
          domains: {
            engaging_with_ai: 80,
            creating_with_ai: 90,
            managing_with_ai: 85,
            designing_with_ai: 80,
          },
        },
        summary: {
          level: 'intermediate',
          total_questions: 20,
          correct_answers: 17,
        },
        duration_seconds: 1200,
        timestamp: '2024-01-01T10:00:00Z',
        recommendations: ['Practice more with AI tools', 'Explore advanced features'],
      }],
    };

    (window.localStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'user') {
        return JSON.stringify(mockUser);
      }
      return null;
    });
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockAssessmentResponse),
    });

    render(<DashboardPage />);

    // Wait for loading to complete and component to render
    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Wait for API call to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/assessment/results?userId=${encodeURIComponent(mockUser.id)}&userEmail=${encodeURIComponent(mockUser.email)}`
      );
    });

    // Verify that localStorage is updated with the assessment result
    await waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'assessmentResult',
        expect.stringContaining('"overallScore":85')
      );
    });
  });

  it('handles case when no assessment results exist in database', async () => {
    const mockUser = {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      role: 'student',
    };

    (window.localStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'user') {
        return JSON.stringify(mockUser);
      }
      return null;
    });
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ results: [] }),
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/assessment/results?userId=${encodeURIComponent(mockUser.id)}&userEmail=${encodeURIComponent(mockUser.email)}`
      );
    });

    // Should show content for users without assessment
    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
    });
  });

  it('falls back to localStorage when API fails', async () => {
    const mockUser = {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      role: 'student',
    };
    
    const mockLocalAssessment = {
      overallScore: 75,
      domainScores: {
        engaging_with_ai: 70,
        creating_with_ai: 80,
        managing_with_ai: 75,
        designing_with_ai: 75,
      },
      level: 'intermediate',
      totalQuestions: 20,
      correctAnswers: 15,
      timeSpentSeconds: 1000,
      completedAt: new Date(),
      recommendations: ['Keep practicing'],
    };

    (window.localStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'user') {
        return JSON.stringify(mockUser);
      }
      if (key === 'assessmentResult') {
        return JSON.stringify(mockLocalAssessment);
      }
      return null;
    });
    
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
    });

    // Should still function with localStorage data
    expect(global.fetch).toHaveBeenCalled();
  });
});