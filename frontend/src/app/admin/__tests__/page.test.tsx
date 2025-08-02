/**
 * Admin Dashboard Page Tests
 * 提升覆蓋率從 0% 到 100%
 */

import { render, screen, waitFor } from '@testing-library/react';
import AdminDashboard from '../page';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: { [key: string]: string } = {
        'dashboard.title': 'Admin Dashboard',
        'dashboard.domains': 'Domains',
        'dashboard.questions': 'Questions',
        'dashboard.overrides': 'Overrides',
        'dashboard.drafts': 'Drafts',
        'dashboard.quickActions': 'Quick Actions',
        'content.domains': 'Manage Domains',
        'content.domainsDesc': 'Edit AI literacy domains and competencies',
        'content.assessment': 'Assessment Questions',
        'content.assessmentDesc': 'Manage assessment questions',
        'history.title': 'Change History',
        'history.changeLog': 'View content modification logs'
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: jest.fn()
    }
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard title', () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        domains: 4,
        questions: 50,
        overrides: 10,
        drafts: 3
      })
    });

    render(<AdminDashboard />);
    
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    render(<AdminDashboard />);
    
    // Should show ... for all stats while loading
    const loadingIndicators = screen.getAllByText('...');
    expect(loadingIndicators).toHaveLength(4);
  });

  it('should fetch and display stats', async () => {
    const mockStats = {
      domains: 4,
      questions: 50,
      overrides: 10,
      drafts: 3
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/admin/stats');
  });

  it('should handle fetch error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<AdminDashboard />);

    await waitFor(() => {
      // Should show 0 for all stats when error occurs
      const zeroValues = screen.getAllByText('0');
      expect(zeroValues).toHaveLength(4);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch stats:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('should handle non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      // Should show default 0 values when fetch fails
      const zeroValues = screen.getAllByText('0');
      expect(zeroValues).toHaveLength(4);
    });
  });

  it('should render all stat cards with correct labels', () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    render(<AdminDashboard />);

    expect(screen.getByText('Domains')).toBeInTheDocument();
    expect(screen.getByText('Questions')).toBeInTheDocument();
    expect(screen.getByText('Overrides')).toBeInTheDocument();
    expect(screen.getByText('Drafts')).toBeInTheDocument();
  });

  it('should render quick actions section', () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    render(<AdminDashboard />);

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('should render all quick action links', () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    render(<AdminDashboard />);

    // Check domain management link
    expect(screen.getByText('Manage Domains')).toBeInTheDocument();
    expect(screen.getByText('Edit AI literacy domains and competencies')).toBeInTheDocument();
    
    // Check assessment questions link
    expect(screen.getByText('Assessment Questions')).toBeInTheDocument();
    expect(screen.getByText('Manage assessment questions')).toBeInTheDocument();
    
    // Check history link
    expect(screen.getByText('Change History')).toBeInTheDocument();
    expect(screen.getByText('View content modification logs')).toBeInTheDocument();
  });

  it('should have correct href attributes for links', () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    render(<AdminDashboard />);

    const domainLink = screen.getByText('Manage Domains').closest('a');
    expect(domainLink).toHaveAttribute('href', '/admin/content?type=domain');

    const assessmentLink = screen.getByText('Assessment Questions').closest('a');
    expect(assessmentLink).toHaveAttribute('href', '/admin/content?type=question');

    const historyLink = screen.getByText('Change History').closest('a');
    expect(historyLink).toHaveAttribute('href', '/admin/history');
  });

  it('should render SVG icons for all stat cards', () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    const { container } = render(<AdminDashboard />);

    // Should have 4 stat card icons
    const statCardIcons = container.querySelectorAll('.h-6.w-6.text-gray-400');
    expect(statCardIcons).toHaveLength(4);
  });

  it('should render arrow icons for quick actions', () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    const { container } = render(<AdminDashboard />);

    // Should have 3 arrow icons for quick actions
    const arrowIcons = container.querySelectorAll('.h-5.w-5.text-gray-400');
    expect(arrowIcons).toHaveLength(3);
  });

  it('should apply correct styling classes', () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    const { container } = render(<AdminDashboard />);

    // Check main container
    expect(container.firstChild).toHaveClass('px-4', 'py-8', 'sm:px-0');

    // Check stats grid
    const statsGrid = container.querySelector('.grid');
    expect(statsGrid).toHaveClass('grid-cols-1', 'gap-5', 'sm:grid-cols-2', 'lg:grid-cols-4');

    // Check quick actions container
    const quickActionsContainer = container.querySelector('.bg-white.shadow.rounded-lg.p-6');
    expect(quickActionsContainer).toBeTruthy();
  });
});