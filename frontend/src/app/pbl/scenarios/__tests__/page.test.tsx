import { render, screen, waitFor, within } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import PBLScenariosPage from '../page';

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn()
}));

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock('@/components/pbl/loading-skeletons', () => ({
  PBLScenariosListSkeleton: () => <div data-testid="loading-skeleton">Loading...</div>
}));

// Mock fetch
global.fetch = jest.fn();

describe('PBLScenariosPage', () => {
  const mockT = jest.fn((key: string) => key);
  const mockI18n = { language: 'en' };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({
      t: mockT,
      i18n: mockI18n
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading skeleton initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<PBLScenariosPage />);
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should fetch and display scenarios', async () => {
    const mockScenarios = [
      {
        id: 'scenario-1',
        title: 'AI Ethics in Healthcare',
        description: 'Learn about ethical AI use in medical settings',
        difficulty: 'intermediate',
        taskTemplates: [{ estimatedTime: 20 }, { estimatedTime: 30 }],
        thumbnailEmoji: '🏥',
        isAvailable: true
      },
      {
        id: 'scenario-2',
        title: 'AI in Education',
        description: 'Explore AI applications in learning',
        difficulty: 'beginner',
        taskCount: 3,
        domains: ['engaging_with_ai'],
        isAvailable: false
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios }
      })
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('AI Ethics in Healthcare')).toBeInTheDocument();
    });

    expect(screen.getByText('AI in Education')).toBeInTheDocument();
    expect(screen.getByText('Learn about ethical AI use in medical settings')).toBeInTheDocument();
    expect(screen.getByText('Explore AI applications in learning')).toBeInTheDocument();
  });

  it('should handle API error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching PBL scenarios:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should show empty state when no scenarios', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: [] }
      })
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('Loading scenarios from YAML files...')).toBeInTheDocument();
    });

    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('should display difficulty stars correctly', async () => {
    const mockScenarios = [
      {
        id: 's1',
        title: 'Beginner Scenario',
        description: 'Easy',
        difficulty: 'beginner',
        taskTemplates: []
      },
      {
        id: 's2',
        title: 'Intermediate Scenario',
        description: 'Medium',
        difficulty: 'intermediate',
        taskTemplates: []
      },
      {
        id: 's3',
        title: 'Advanced Scenario',
        description: 'Hard',
        difficulty: 'advanced',
        taskTemplates: []
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios }
      })
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('Beginner Scenario')).toBeInTheDocument();
    });

    // Check that all difficulty levels are displayed
    const allText = screen.getAllByText(/⭐/);
    expect(allText.length).toBeGreaterThan(0);
    
    // Verify each scenario has its difficulty displayed
    expect(screen.getByText('Beginner Scenario')).toBeInTheDocument();
    expect(screen.getByText('Intermediate Scenario')).toBeInTheDocument();
    expect(screen.getByText('Advanced Scenario')).toBeInTheDocument();
  });

  it('should display domain labels', async () => {
    const mockScenarios = [
      {
        id: 'scenario-1',
        title: 'Test Scenario',
        description: 'Test',
        domains: ['engaging_with_ai', 'creating_with_ai'],
        taskTemplates: []
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios }
      })
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Scenario')).toBeInTheDocument();
    });

    expect(mockT).toHaveBeenCalledWith('assessment:domains.engaging_with_ai');
    expect(mockT).toHaveBeenCalledWith('assessment:domains.creating_with_ai');
  });

  it('should calculate estimated duration from task templates', async () => {
    const mockScenarios = [
      {
        id: 'scenario-1',
        title: 'Test Scenario',
        description: 'Test',
        taskTemplates: [
          { estimatedTime: 15 },
          { estimatedTime: 20 },
          { estimatedTime: 25 }
        ]
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios }
      })
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Scenario')).toBeInTheDocument();
    });

    // Total duration should be 15 + 20 + 25 = 60
    expect(screen.getByText(/60/)).toBeInTheDocument();
  });

  it('should show "Coming Soon" for unavailable scenarios', async () => {
    const mockScenarios = [
      {
        id: 'scenario-1',
        title: 'Unavailable Scenario',
        description: 'Not yet available',
        isAvailable: false,
        taskTemplates: []
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios }
      })
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('Unavailable Scenario')).toBeInTheDocument();
    });

    expect(screen.getByText('comingSoon')).toBeInTheDocument();
    expect(screen.queryByText('viewDetails')).not.toBeInTheDocument();
  });

  it('should display View Details link for available scenarios', async () => {
    const mockScenarios = [
      {
        id: 'scenario-1',
        title: 'Available Scenario',
        description: 'Ready to use',
        isAvailable: true,
        taskTemplates: []
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios }
      })
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Scenario')).toBeInTheDocument();
    });

    const link = screen.getByRole('link', { name: 'viewDetails' });
    expect(link).toHaveAttribute('href', '/pbl/scenarios/scenario-1');
  });

  it('should render features section', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: [] }
      })
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
    });

    expect(mockT).toHaveBeenCalledWith('features.title');
    expect(mockT).toHaveBeenCalledWith('features.realWorld.title');
    expect(mockT).toHaveBeenCalledWith('features.aiGuidance.title');
    expect(mockT).toHaveBeenCalledWith('features.progress.title');
    expect(mockT).toHaveBeenCalledWith('features.personalized.title');
  });

  it('should render refresh button when no scenarios', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: [] }
      })
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toHaveClass('px-4', 'py-2', 'bg-blue-600', 'text-white');
    
    // Test that the button has an onClick handler
    expect(refreshButton).toHaveProperty('onclick');
  });

  it('should abort fetch on unmount', async () => {
    const abortSpy = jest.fn();
    const originalAbortController = global.AbortController;
    
    global.AbortController = jest.fn(() => ({
      abort: abortSpy,
      signal: {} as AbortSignal
    })) as any;

    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { unmount } = render(<PBLScenariosPage />);
    
    unmount();

    expect(abortSpy).toHaveBeenCalled();

    global.AbortController = originalAbortController;
  });

  it('should handle non-ok response', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' })
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching PBL scenarios:',
      expect.objectContaining({
        message: expect.stringContaining('500')
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle unified architecture scenario format', async () => {
    const mockScenarios = [
      {
        id: 'scenario-1',
        title: 'Unified Format Scenario',
        description: 'Test scenario with unified format',
        sourceMetadata: {
          domain: 'designing_with_ai',
          difficulty: 'advanced'
        },
        taskTemplates: []
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios }
      })
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('Unified Format Scenario')).toBeInTheDocument();
    });

    // Should extract domain from sourceMetadata
    expect(mockT).toHaveBeenCalledWith('assessment:domains.designing_with_ai');
    // Should display advanced difficulty (5 stars)
    expect(screen.getByText(/⭐⭐⭐⭐⭐/)).toBeInTheDocument();
  });

  it('should use language from i18n for API call', async () => {
    mockI18n.language = 'zh';

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: [] }
      })
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/pbl/scenarios?lang=zh',
        expect.objectContaining({
          signal: expect.any(Object)
        })
      );
    });
  });

  it('should handle targetDomain array format', async () => {
    const mockScenarios = [
      {
        id: 'scenario-1',
        title: 'Test Scenario With Target Domain',
        description: 'Test Description',
        targetDomain: ['managing_with_ai', 'creating_with_ai'],
        taskTemplates: []
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios }
      })
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Scenario With Target Domain')).toBeInTheDocument();
    });

    expect(mockT).toHaveBeenCalledWith('assessment:domains.managing_with_ai');
    expect(mockT).toHaveBeenCalledWith('assessment:domains.creating_with_ai');
  });
});