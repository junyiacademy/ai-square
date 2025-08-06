import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import LearningPathPage from '../page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' }
  }),
}));

jest.mock('next/link', () => {
  return function Link({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock implementations
const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

describe('LearningPathPage', () => {
  const mockSearchParams = {
    get: jest.fn(),
  };

  const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
  
  const mockAssessmentResult = {
    overallScore: 75,
    domainScores: {
      engaging_with_ai: 80,
      creating_with_ai: 70,
      managing_with_ai: 65,
      designing_with_ai: 85
    },
    weakDomains: ['managing_with_ai', 'creating_with_ai'],
    completedAt: '2024-01-01T00:00:00Z'
  };

  const mockProfile = {
    identity: 'professional',
    interests: ['marketing', 'data analysis', 'automation']
  };

  const mockScenarios = [
    {
      id: 'scenario1',
      title: { en: 'Digital Marketing Assistant' },
      description: { en: 'Learn to use AI for marketing campaigns' },
      difficulty: 'intermediate',
      estimatedTime: 45,
      domains: ['creating_with_ai', 'engaging_with_ai'],
      skills: ['content_creation', 'campaign_optimization'],
      topics: ['marketing', 'content'],
      taskCount: 6
    },
    {
      id: 'scenario2',
      title: { en: 'Project Management AI' },
      description: { en: 'Manage projects with AI assistance' },
      difficulty: 'advanced',
      estimatedTime: 60,
      domains: ['managing_with_ai', 'designing_with_ai'],
      skills: ['project_planning', 'team_coordination'],
      topics: ['management', 'planning'],
      taskCount: 8
    },
    {
      id: 'scenario3',
      title: { en: 'Data Analysis Helper' },
      description: { en: 'Analyze data using AI tools' },
      difficulty: 'beginner',
      estimatedTime: 30,
      domains: ['engaging_with_ai'],
      skills: ['data_interpretation', 'visualization'],
      topics: ['data', 'analysis'],
      taskCount: 4
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as any);
    
    mockUseSearchParams.mockReturnValue(mockSearchParams as any);
    mockSearchParams.get.mockReturnValue(null);

    // Default localStorage setup
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'user') return JSON.stringify(mockUser);
      if (key === 'assessmentResult') return JSON.stringify(mockAssessmentResult);
      if (key === 'userProfile') return JSON.stringify(mockProfile);
      return null;
    });

    // Default API responses
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/pbl/scenarios')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            scenarios: mockScenarios,
            success: true
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  describe('Authentication and Data Loading', () => {
    it('should redirect to login if user not logged in', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'user') return null;
        return null;
      });

      render(<LearningPathPage />);

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('should redirect to assessment if no assessment result', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'user') return JSON.stringify(mockUser);
        if (key === 'assessmentResult') return null;
        return null;
      });

      render(<LearningPathPage />);

      expect(mockPush).toHaveBeenCalledWith('/assessment');
    });

    it('should load user profile from localStorage', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(localStorageMock.getItem).toHaveBeenCalledWith('userProfile');
      });
    });

    it('should load assessment result from localStorage', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(localStorageMock.getItem).toHaveBeenCalledWith('assessmentResult');
      });
    });

    it('should fetch PBL scenarios', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/pbl/scenarios?language=en');
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.reject(new Error('API Error'));
      });

      console.error = jest.fn();

      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error generating learning path:', expect.any(Error));
      });
    });
  });

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<LearningPathPage />);

      expect(screen.getByText('Generating your personalized learning path...')).toBeInTheDocument();
    });

    it('should render main content after loading', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Your Personalized Learning Path')).toBeInTheDocument();
        expect(screen.getByText('Based on your assessment results, here\'s your recommended learning journey.')).toBeInTheDocument();
      });
    });

    it('should display assessment score', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Overall Score: 75%')).toBeInTheDocument();
      });
    });

    it('should display weak domains', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Areas for improvement: managing_with_ai, creating_with_ai')).toBeInTheDocument();
      });
    });

    it('should render filter tabs', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('All Recommendations')).toBeInTheDocument();
        expect(screen.getByText('Focus on Weak Areas')).toBeInTheDocument();
      });
    });

    it('should render domain filter chips', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('engaging_with_ai')).toBeInTheDocument();
        expect(screen.getByText('creating_with_ai')).toBeInTheDocument();
        expect(screen.getByText('managing_with_ai')).toBeInTheDocument();
        expect(screen.getByText('designing_with_ai')).toBeInTheDocument();
      });
    });
  });

  describe('Learning Path Generation', () => {
    it('should generate learning path items from scenarios', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Digital Marketing Assistant')).toBeInTheDocument();
        expect(screen.getByText('Project Management AI')).toBeInTheDocument();
        expect(screen.getByText('Data Analysis Helper')).toBeInTheDocument();
      });
    });

    it('should prioritize weak domain scenarios', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        // Project Management AI should be high priority (targets managing_with_ai - weak domain)
        const highPriorityItems = screen.getAllByTestId(/priority-high/);
        expect(highPriorityItems.length).toBeGreaterThan(0);
      });
    });

    it('should calculate relevance scores based on user profile', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        // Marketing scenario should be more relevant due to user interests
        const marketingScenario = screen.getByText('Digital Marketing Assistant').closest('[data-testid^="learning-item-"]');
        expect(marketingScenario).toHaveAttribute('data-relevance-score');
      });
    });

    it('should display estimated time for each item', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('45 min')).toBeInTheDocument();
        expect(screen.getByText('60 min')).toBeInTheDocument();
        expect(screen.getByText('30 min')).toBeInTheDocument();
      });
    });

    it('should show difficulty levels', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Intermediate')).toBeInTheDocument();
        expect(screen.getByText('Advanced')).toBeInTheDocument();
        expect(screen.getByText('Beginner')).toBeInTheDocument();
      });
    });

    it('should display reasons for recommendations', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        // Should show reasons based on weak domains and user profile
        const reasons = screen.getAllByText(/Focuses on/);
        expect(reasons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('URL Parameter Handling', () => {
    it('should respect filter parameter from URL', async () => {
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'filter') return 'weak';
        return null;
      });

      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Focus on Weak Areas')).toHaveClass('border-blue-500');
      });
    });

    it('should default to all filter when no URL parameter', async () => {
      mockSearchParams.get.mockReturnValue(null);

      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('All Recommendations')).toHaveClass('border-blue-500');
      });
    });
  });

  describe('Filtering and Interaction', () => {
    beforeEach(async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Digital Marketing Assistant')).toBeInTheDocument();
      });
    });

    it('should switch to weak areas filter', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByText('Focus on Weak Areas'));

      expect(screen.getByText('Focus on Weak Areas')).toHaveClass('border-blue-500');
      expect(screen.getByText('All Recommendations')).not.toHaveClass('border-blue-500');
    });

    it('should filter by domain when domain chip is clicked', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByText('managing_with_ai'));

      // Should only show items targeting managing_with_ai domain
      expect(screen.getByText('Project Management AI')).toBeInTheDocument();
      // Marketing scenario (primarily creating_with_ai) might be hidden
    });

    it('should clear domain filter when clicked again', async () => {
      const user = userEvent.setup();
      
      // First click to filter
      await user.click(screen.getByText('managing_with_ai'));
      
      // Second click to clear filter
      await user.click(screen.getByText('managing_with_ai'));

      // All scenarios should be visible again
      expect(screen.getByText('Digital Marketing Assistant')).toBeInTheDocument();
      expect(screen.getByText('Project Management AI')).toBeInTheDocument();
      expect(screen.getByText('Data Analysis Helper')).toBeInTheDocument();
    });

    it('should handle multiple domain filters', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByText('creating_with_ai'));
      await user.click(screen.getByText('managing_with_ai'));

      // Should show scenarios that target either domain
      expect(screen.getByText('Digital Marketing Assistant')).toBeInTheDocument();
      expect(screen.getByText('Project Management AI')).toBeInTheDocument();
    });
  });

  describe('Domain Progress Display', () => {
    it('should calculate domain progress correctly', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        // Should show progress for each domain based on current scores and available scenarios
        expect(screen.getByText('engaging_with_ai: 80%')).toBeInTheDocument();
        expect(screen.getByText('creating_with_ai: 70%')).toBeInTheDocument();
        expect(screen.getByText('managing_with_ai: 65%')).toBeInTheDocument();
        expect(screen.getByText('designing_with_ai: 85%')).toBeInTheDocument();
      });
    });

    it('should highlight weak domains', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        const weakDomains = screen.getAllByTestId(/weak-domain-/);
        expect(weakDomains).toHaveLength(2); // managing_with_ai and creating_with_ai
      });
    });

    it('should show improvement potential', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        // Should show how much each domain can improve
        expect(screen.getByText(/can improve to/)).toBeInTheDocument();
      });
    });
  });

  describe('Learning Item Actions', () => {
    beforeEach(async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Digital Marketing Assistant')).toBeInTheDocument();
      });
    });

    it('should navigate to scenario when start button is clicked', async () => {
      const user = userEvent.setup();
      const startButtons = screen.getAllByText('Start');
      
      await user.click(startButtons[0]);

      expect(mockPush).toHaveBeenCalledWith('/pbl/scenarios/scenario1');
    });

    it('should show completion status for completed scenarios', async () => {
      // Mock completed scenarios in localStorage
      const completedScenarios = ['scenario1'];
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'user') return JSON.stringify(mockUser);
        if (key === 'assessmentResult') return JSON.stringify(mockAssessmentResult);
        if (key === 'userProfile') return JSON.stringify(mockProfile);
        if (key === 'completedScenarios') return JSON.stringify(completedScenarios);
        return null;
      });

      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });
    });

    it('should show progress for in-progress scenarios', async () => {
      const scenarioProgress = { scenario1: 60 };
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'user') return JSON.stringify(mockUser);
        if (key === 'assessmentResult') return JSON.stringify(mockAssessmentResult);
        if (key === 'userProfile') return JSON.stringify(mockProfile);
        if (key === 'scenarioProgress') return JSON.stringify(scenarioProgress);
        return null;
      });

      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('60% complete')).toBeInTheDocument();
      });
    });

    it('should allow bookmarking scenarios', async () => {
      const user = userEvent.setup();
      const bookmarkButtons = screen.getAllByLabelText('Bookmark');
      
      await user.click(bookmarkButtons[0]);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'bookmarkedScenarios', 
        JSON.stringify(['scenario1'])
      );
    });
  });

  describe('Role-based Keyword Matching', () => {
    it('should boost relevance for matching keywords', async () => {
      // Test with teacher profile
      const teacherProfile = {
        identity: 'teacher',
        interests: ['education', 'curriculum']
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'user') return JSON.stringify(mockUser);
        if (key === 'assessmentResult') return JSON.stringify(mockAssessmentResult);
        if (key === 'userProfile') return JSON.stringify(teacherProfile);
        return null;
      });

      // Add educational scenario
      const educationalScenarios = [
        ...mockScenarios,
        {
          id: 'scenario4',
          title: { en: 'Educational AI Assistant' },
          description: { en: 'Use AI to create educational content and curriculum' },
          difficulty: 'intermediate',
          estimatedTime: 40,
          domains: ['creating_with_ai'],
          skills: ['content_creation', 'curriculum_design'],
          topics: ['education', 'teaching'],
          taskCount: 5
        }
      ];

      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/pbl/scenarios')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              scenarios: educationalScenarios,
              success: true
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Educational AI Assistant')).toBeInTheDocument();
      });
    });

    it('should handle different user identity types', async () => {
      const profiles = [
        { identity: 'student', interests: ['learning'] },
        { identity: 'professional', interests: ['business'] },
        { identity: 'learner', interests: ['skills'] }
      ];

      for (const profile of profiles) {
        localStorageMock.getItem.mockImplementation((key) => {
          if (key === 'user') return JSON.stringify(mockUser);
          if (key === 'assessmentResult') return JSON.stringify(mockAssessmentResult);
          if (key === 'userProfile') return JSON.stringify(profile);
          return null;
        });

        await act(async () => {
          const { unmount } = render(<LearningPathPage />);
          
          await waitFor(() => {
            expect(screen.getByText('Your Personalized Learning Path')).toBeInTheDocument();
          });

          unmount();
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed assessment result', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'user') return JSON.stringify(mockUser);
        if (key === 'assessmentResult') return 'invalid json';
        return null;
      });

      console.error = jest.fn();

      render(<LearningPathPage />);

      expect(mockPush).toHaveBeenCalledWith('/assessment');
    });

    it('should handle malformed user profile', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'user') return JSON.stringify(mockUser);
        if (key === 'assessmentResult') return JSON.stringify(mockAssessmentResult);
        if (key === 'userProfile') return 'invalid json';
        return null;
      });

      console.error = jest.fn();

      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Your Personalized Learning Path')).toBeInTheDocument();
      });

      // Should still render with default empty profile
    });

    it('should handle API failures gracefully', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' })
        });
      });

      console.error = jest.fn();

      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error generating learning path:', expect.any(Object));
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });

      console.error = jest.fn();

      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error generating learning path:', expect.any(Error));
      });
    });
  });

  describe('Priority and Sorting', () => {
    it('should sort learning path items by priority', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        const learningItems = screen.getAllByTestId(/learning-item-/);
        expect(learningItems.length).toBeGreaterThan(0);
        
        // High priority items should appear first
        const firstItem = learningItems[0];
        const priorityBadge = firstItem.querySelector('[data-testid*="priority-"]');
        expect(priorityBadge).toBeTruthy();
      });
    });

    it('should assign correct priority levels', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        // Scenarios targeting weak domains should have high priority
        const highPriorityBadges = screen.getAllByTestId('priority-high');
        const mediumPriorityBadges = screen.getAllByTestId('priority-medium');
        const lowPriorityBadges = screen.getAllByTestId('priority-low');
        
        expect(highPriorityBadges.length + mediumPriorityBadges.length + lowPriorityBadges.length)
          .toEqual(mockScenarios.length);
      });
    });
  });

  describe('User Experience Features', () => {
    it('should show total estimated time', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        // Total time: 45 + 60 + 30 = 135 minutes = 2h 15m
        expect(screen.getByText(/Total estimated time: 2h 15m/)).toBeInTheDocument();
      });
    });

    it('should display completion statistics', async () => {
      const completedScenarios = ['scenario1'];
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'user') return JSON.stringify(mockUser);
        if (key === 'assessmentResult') return JSON.stringify(mockAssessmentResult);
        if (key === 'userProfile') return JSON.stringify(mockProfile);
        if (key === 'completedScenarios') return JSON.stringify(completedScenarios);
        return null;
      });

      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('1 of 3 completed')).toBeInTheDocument();
        expect(screen.getByText('33% complete')).toBeInTheDocument();
      });
    });

    it('should show next recommended action', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Start with:/)).toBeInTheDocument();
      });
    });

    it('should provide clear call-to-action buttons', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        const startButtons = screen.getAllByText('Start');
        expect(startButtons.length).toBeGreaterThan(0);
        startButtons.forEach(button => {
          expect(button).toBeEnabled();
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(
          screen.getAllByText('Start').length + screen.getAllByLabelText('Bookmark').length
        );
      });
    });

    it('should support keyboard navigation', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        const interactiveElements = screen.getAllByRole('button');
        interactiveElements.forEach(element => {
          expect(element).toHaveAttribute('tabIndex');
        });
      });
    });

    it('should have semantic structure', async () => {
      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByRole('heading')).toHaveLength(
          1 + screen.getAllByTestId(/learning-item-/).length // Main heading + item headings
        );
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile layout', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        const container = screen.getByRole('main');
        expect(container).toHaveClass('px-4'); // Mobile padding
      });
    });

    it('should stack elements vertically on small screens', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      });

      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        const filterTabs = screen.getByRole('tablist');
        expect(filterTabs).toHaveClass('flex-col');
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should handle large number of scenarios efficiently', async () => {
      const largeScenarioSet = Array.from({ length: 50 }, (_, i) => ({
        id: `scenario${i}`,
        title: { en: `Scenario ${i}` },
        description: { en: `Description ${i}` },
        difficulty: 'intermediate',
        estimatedTime: 45,
        domains: ['creating_with_ai'],
        skills: ['skill1'],
        topics: ['topic1'],
        taskCount: 5
      }));

      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/pbl/scenarios')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              scenarios: largeScenarioSet,
              success: true
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      const startTime = performance.now();

      await act(async () => {
        render(<LearningPathPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByTestId(/learning-item-/)).toHaveLength(50);
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(5000); // Should render within 5 seconds
    });

    it('should not make unnecessary re-renders', async () => {
      const renderSpy = jest.fn();
      
      const TestWrapper = () => {
        renderSpy();
        return <LearningPathPage />;
      };

      await act(async () => {
        render(<TestWrapper />);
      });

      await waitFor(() => {
        expect(screen.getByText('Digital Marketing Assistant')).toBeInTheDocument();
      });

      const initialRenderCount = renderSpy.mock.calls.length;

      // Interact with component
      const user = userEvent.setup();
      await user.click(screen.getByText('Focus on Weak Areas'));

      // Should not cause excessive re-renders
      expect(renderSpy.mock.calls.length).toBeLessThan(initialRenderCount + 5);
    });
  });
});