import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import DiscoveryHeader from '../DiscoveryHeader';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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

  it('should render header with default props', () => {
    render(<DiscoveryHeader />);

    expect(screen.getByText('探索世界')).toBeInTheDocument();
    expect(screen.getByText('發現你的 AI 學習路徑')).toBeInTheDocument();
  });

  it('should render navigation items', () => {
    render(<DiscoveryHeader />);

    // Check navigation items
    expect(screen.getByText('總覽')).toBeInTheDocument();
    expect(screen.getByText('評估')).toBeInTheDocument();
    expect(screen.getByText('職業冒險')).toBeInTheDocument();
  });

  it('should render achievement count when provided', () => {
    render(<DiscoveryHeader achievementCount={5} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render assessment status when results are available', () => {
    render(<DiscoveryHeader hasAssessmentResults={true} />);

    expect(screen.getByText('已完成評估')).toBeInTheDocument();
  });

  it('should render assessment prompt when no results', () => {
    render(<DiscoveryHeader hasAssessmentResults={false} />);

    expect(screen.getByText('開始評估')).toBeInTheDocument();
  });

  it('should handle back button click', () => {
    render(<DiscoveryHeader />);

    const backButton = screen.getByRole('button');
    fireEvent.click(backButton);

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('should have correct navigation links', () => {
    render(<DiscoveryHeader />);

    const overviewLink = screen.getByText('總覽').closest('a');
    const evaluationLink = screen.getByText('評估').closest('a');
    const scenariosLink = screen.getByText('職業冒險').closest('a');

    expect(overviewLink).toHaveAttribute('href', '/discovery/overview');
    expect(evaluationLink).toHaveAttribute('href', '/discovery/evaluation');
    expect(scenariosLink).toHaveAttribute('href', '/discovery/scenarios');
  });

  it('should render workspace count when provided', () => {
    render(<DiscoveryHeader workspaceCount={3} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should not render counts when they are zero', () => {
    render(<DiscoveryHeader achievementCount={0} workspaceCount={0} />);

    // Check that badge elements are not rendered when count is 0
    const badges = screen.queryAllByText('0');
    expect(badges).toHaveLength(0);
  });
});