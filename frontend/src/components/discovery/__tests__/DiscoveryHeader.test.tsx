import React from 'react';
import { renderWithProviders, screen, waitFor, fireEvent } from '@/test-utils/helpers/render';
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
        'navigation:home': '首頁',
        'discovery:navigation.overview': '總覽',
        'discovery:navigation.evaluation': '評估',
        'discovery:navigation.scenarios': '職業冒險'
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

  it('should render header with title and subtitle', async () => {
    renderWithProviders(<DiscoveryHeader />);

    // Title appears twice (breadcrumb and main title)
    const titles = screen.getAllByText('探索世界');
    expect(titles).toHaveLength(2);
    expect(titles[0]).toBeInTheDocument(); // breadcrumb
    expect(titles[1]).toBeInTheDocument(); // main title
    
    expect(screen.getByText('發現你的 AI 學習路徑')).toBeInTheDocument();
  });

  it('should render navigation items', async () => {
    renderWithProviders(<DiscoveryHeader />);

    // Navigation items appear in both desktop and mobile views
    const overviewButtons = screen.getAllByText('總覽');
    expect(overviewButtons.length).toBeGreaterThanOrEqual(1);
    
    const evaluationButtons = screen.getAllByText('評估');
    expect(evaluationButtons.length).toBeGreaterThanOrEqual(1);
    
    const scenariosButtons = screen.getAllByText('職業冒險');
    expect(scenariosButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('should highlight active navigation item', async () => {
    renderWithProviders(<DiscoveryHeader />);

    const overviewButtons = screen.getAllByRole('button', { name: /總覽/i });
    const desktopOverviewButton = overviewButtons[0];
    expect(desktopOverviewButton).toHaveClass('bg-purple-600');
  });

  it('should navigate when clicking navigation items', async () => {
    renderWithProviders(<DiscoveryHeader />);

    const evaluationButtons = screen.getAllByRole('button', { name: /評估/i });
    fireEvent.click(evaluationButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/discovery/evaluation');
  });

  it('should navigate home when clicking breadcrumb', async () => {
    renderWithProviders(<DiscoveryHeader />);

    const homeButton = screen.getByRole('button', { name: /首頁/i });
    fireEvent.click(homeButton);

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should show different active state based on pathname', async () => {
    (usePathname as jest.Mock).mockReturnValue('/discovery/scenarios');
    renderWithProviders(<DiscoveryHeader />);

    const scenariosButtons = screen.getAllByRole('button', { name: /職業冒險/i });
    const desktopScenariosButton = scenariosButtons[0];
    expect(desktopScenariosButton).toHaveClass('bg-purple-600');
  });

  it('should not show badges when counts are zero', async () => {
    renderWithProviders(<DiscoveryHeader achievementCount={0} workspaceCount={0} />);

    // Since workspace and achievements are removed, no badges should exist
    const badges = screen.queryAllByText(/^\d+$/);
    expect(badges).toHaveLength(0);
  });

  it('should handle disabled navigation items', async () => {
    renderWithProviders(<DiscoveryHeader />);

    // All items should be enabled by default
    // Get navigation buttons (may have multiple due to desktop/mobile views)
    const overviewButtons = screen.getAllByRole('button', { name: /總覽/i });
    const evaluationButtons = screen.getAllByRole('button', { name: /評估/i });
    const scenariosButtons = screen.getAllByRole('button', { name: /職業冒險/i });
    
    expect(overviewButtons[0]).not.toBeDisabled();
    expect(evaluationButtons[0]).not.toBeDisabled();
    expect(scenariosButtons[0]).not.toBeDisabled();
  });
});