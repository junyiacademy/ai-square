import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import DiscoveryHeader from '../DiscoveryHeader';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'title': '探索世界',
        'subtitle': '發現你的 AI 學習路徑',
        'navigation:home': '首頁'
      };
      return translations[key] || key;
    },
  }),
}));

describe('DiscoveryHeader', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
    (usePathname as jest.Mock).mockReturnValue('/discovery/overview');
  });

  it('should render header with title and subtitle', () => {
    render(<DiscoveryHeader />);

    // Title appears twice (breadcrumb and main title)
    const titles = screen.getAllByText('探索世界');
    expect(titles).toHaveLength(2);
    expect(titles[0]).toBeInTheDocument(); // breadcrumb
    expect(titles[1]).toBeInTheDocument(); // main title
    
    expect(screen.getByText('發現你的 AI 學習路徑')).toBeInTheDocument();
  });

  it('should render navigation items', () => {
    render(<DiscoveryHeader />);

    // Navigation items appear in both desktop and mobile views
    const overviewButtons = screen.getAllByText('總覽');
    expect(overviewButtons.length).toBeGreaterThanOrEqual(1);
    
    expect(screen.getByText('評估')).toBeInTheDocument();
    expect(screen.getByText('職業冒險')).toBeInTheDocument();
  });

  it('should highlight active navigation item', () => {
    render(<DiscoveryHeader />);

    const overviewButton = screen.getByRole('button', { name: /總覽/i });
    expect(overviewButton).toHaveClass('bg-purple-600');
  });

  it('should navigate when clicking navigation items', () => {
    render(<DiscoveryHeader />);

    const evaluationButton = screen.getByRole('button', { name: /評估/i });
    fireEvent.click(evaluationButton);

    expect(mockPush).toHaveBeenCalledWith('/discovery/evaluation');
  });

  it('should navigate home when clicking breadcrumb', () => {
    render(<DiscoveryHeader />);

    const homeButton = screen.getByRole('button', { name: /首頁/i });
    fireEvent.click(homeButton);

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should show different active state based on pathname', () => {
    (usePathname as jest.Mock).mockReturnValue('/discovery/scenarios');
    render(<DiscoveryHeader />);

    const scenariosButton = screen.getByRole('button', { name: /職業冒險/i });
    expect(scenariosButton).toHaveClass('bg-purple-600');
  });

  it('should not show badges when counts are zero', () => {
    render(<DiscoveryHeader achievementCount={0} workspaceCount={0} />);

    // Since workspace and achievements are removed, no badges should exist
    const badges = screen.queryAllByText(/^\d+$/);
    expect(badges).toHaveLength(0);
  });

  it('should handle disabled navigation items', () => {
    render(<DiscoveryHeader />);

    // All items should be enabled by default
    // Get navigation buttons (excluding breadcrumb home button)
    const overviewButton = screen.getByRole('button', { name: /總覽/i });
    const evaluationButton = screen.getByRole('button', { name: /評估/i });
    const scenariosButton = screen.getByRole('button', { name: /職業冒險/i });
    
    expect(overviewButton).not.toBeDisabled();
    expect(evaluationButton).not.toBeDisabled();
    expect(scenariosButton).not.toBeDisabled();
  });
});