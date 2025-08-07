import React from 'react';
import { renderWithProviders, screen, waitFor, fireEvent } from '@/test-utils/helpers/render';
import DiscoveryPageLayout from '../DiscoveryPageLayout';
import { useDiscoveryData } from '@/hooks/useDiscoveryData';
import '@testing-library/jest-dom';

// Mock DiscoveryHeader component
jest.mock('@/components/discovery/DiscoveryHeader', () => {
  return function MockDiscoveryHeader({ hasAssessmentResults, achievementCount, workspaceCount }: any) {
    return (
      <div data-testid="discovery-header">
        <span data-testid="has-results">{hasAssessmentResults ? 'true' : 'false'}</span>
        <span data-testid="achievement-count">{achievementCount}</span>
        <span data-testid="workspace-count">{workspaceCount}</span>
      </div>
    );
  };
});

// Mock useDiscoveryData hook
jest.mock('@/hooks/useDiscoveryData', () => ({
  useDiscoveryData: jest.fn(),
}));

const mockUseDiscoveryData = useDiscoveryData as jest.Mock;

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
  },
  writable: true,
});

describe('DiscoveryPageLayout', () => {
  const mockChildren = <div data-testid="test-children">Test Children Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
    window.location.href = '';
  });

  it('should render loading state when isLoading is true', async () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: true,
      assessmentResults: null,
      achievementCount: 0,
    });

    renderWithProviders(
      <DiscoveryPageLayout>
        {mockChildren}
      </DiscoveryPageLayout>
    );

    expect(screen.getByText('載入中...')).toBeInTheDocument();
    expect(screen.getByRole('status', { hidden: true })).toHaveClass('animate-spin');
    expect(screen.queryByTestId('test-children')).not.toBeInTheDocument();
    expect(screen.queryByTestId('discovery-header')).not.toBeInTheDocument();
  });

  it('should render children when loading is complete and no assessment required', async () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      assessmentResults: { someData: 'test' },
      achievementCount: 5,
    });

    renderWithProviders(
      <DiscoveryPageLayout>
        {mockChildren}
      </DiscoveryPageLayout>
    );

    expect(screen.getByTestId('discovery-header')).toBeInTheDocument();
    expect(screen.getByTestId('test-children')).toBeInTheDocument();
    expect(screen.getByTestId('has-results')).toHaveTextContent('true');
    expect(screen.getByTestId('achievement-count')).toHaveTextContent('5');
    expect(screen.getByTestId('workspace-count')).toHaveTextContent('0');
    expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
  });

  it('should render assessment required message when requiresAssessment is true and no results', async () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      assessmentResults: null,
      achievementCount: 2,
    });

    renderWithProviders(
      <DiscoveryPageLayout requiresAssessment={true}>
        {mockChildren}
      </DiscoveryPageLayout>
    );

    expect(screen.getByText('需要先完成評估')).toBeInTheDocument();
    expect(screen.getByText('請先完成興趣評估，以獲得個人化的體驗。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '開始評估' })).toBeInTheDocument();
    expect(screen.getByTestId('discovery-header')).toBeInTheDocument();
    expect(screen.getByTestId('has-results')).toHaveTextContent('false');
    expect(screen.queryByTestId('test-children')).not.toBeInTheDocument();
  });

  it('should redirect to evaluation when assessment button is clicked', async () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      assessmentResults: null,
      achievementCount: 2,
    });

    renderWithProviders(
      <DiscoveryPageLayout requiresAssessment={true}>
        {mockChildren}
      </DiscoveryPageLayout>
    );

    const assessmentButton = screen.getByRole('button', { name: '開始評估' });
    fireEvent.click(assessmentButton);

    expect(window.location.href).toBe('/discovery/evaluation');
  });

  it('should render children when assessment is required but results exist', async () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      assessmentResults: { completed: true },
      achievementCount: 8,
    });

    renderWithProviders(
      <DiscoveryPageLayout requiresAssessment={true}>
        {mockChildren}
      </DiscoveryPageLayout>
    );

    expect(screen.getByTestId('discovery-header')).toBeInTheDocument();
    expect(screen.getByTestId('test-children')).toBeInTheDocument();
    expect(screen.getByTestId('has-results')).toHaveTextContent('true');
    expect(screen.getByTestId('achievement-count')).toHaveTextContent('8');
    expect(screen.queryByText('需要先完成評估')).not.toBeInTheDocument();
  });

  it('should render with default requiresAssessment as false', async () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      assessmentResults: null,
      achievementCount: 3,
    });

    renderWithProviders(
      <DiscoveryPageLayout>
        {mockChildren}
      </DiscoveryPageLayout>
    );

    expect(screen.getByTestId('test-children')).toBeInTheDocument();
    expect(screen.queryByText('需要先完成評估')).not.toBeInTheDocument();
  });

  it('should handle multiple children', async () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      assessmentResults: { data: 'test' },
      achievementCount: 1,
    });

    renderWithProviders(
      <DiscoveryPageLayout>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <span data-testid="child-3">Child 3</span>
      </DiscoveryPageLayout>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
  });

  it('should handle empty children', async () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      assessmentResults: { data: 'test' },
      achievementCount: 0,
    });

    renderWithProviders(
      <DiscoveryPageLayout>
        {null}
      </DiscoveryPageLayout>
    );

    expect(screen.getByTestId('discovery-header')).toBeInTheDocument();
    const container = screen.getByTestId('discovery-header').parentElement;
    expect(container).toBeInTheDocument();
  });

  it('should pass correct props to DiscoveryHeader', async () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      assessmentResults: { score: 85 },
      achievementCount: 12,
    });

    renderWithProviders(
      <DiscoveryPageLayout>
        {mockChildren}
      </DiscoveryPageLayout>
    );

    expect(screen.getByTestId('has-results')).toHaveTextContent('true');
    expect(screen.getByTestId('achievement-count')).toHaveTextContent('12');
    expect(screen.getByTestId('workspace-count')).toHaveTextContent('0');
  });

  it('should pass correct props to DiscoveryHeader when no assessment results', async () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      assessmentResults: null,
      achievementCount: 7,
    });

    renderWithProviders(
      <DiscoveryPageLayout requiresAssessment={true}>
        {mockChildren}
      </DiscoveryPageLayout>
    );

    expect(screen.getByTestId('has-results')).toHaveTextContent('false');
    expect(screen.getByTestId('achievement-count')).toHaveTextContent('7');
    expect(screen.getByTestId('workspace-count')).toHaveTextContent('0');
  });

  it('should render with proper CSS classes and structure', async () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      assessmentResults: { data: 'test' },
      achievementCount: 4,
    });

    const { container } = renderWithProviders(
      <DiscoveryPageLayout>
        {mockChildren}
      </DiscoveryPageLayout>
    );

    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass('min-h-screen', 'bg-gradient-to-br', 'from-blue-50', 'via-white', 'to-purple-50');

    const contentContainer = container.querySelector('.max-w-7xl');
    expect(contentContainer).toHaveClass('mx-auto', 'px-4', 'sm:px-6', 'lg:px-8', 'py-8');
  });

  it('should render loading spinner with correct styling', async () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: true,
      assessmentResults: null,
      achievementCount: 0,
    });

    renderWithProviders(
      <DiscoveryPageLayout>
        {mockChildren}
      </DiscoveryPageLayout>
    );

    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toHaveClass(
      'w-8',
      'h-8', 
      'border-4',
      'border-blue-600',
      'border-t-transparent',
      'rounded-full',
      'animate-spin'
    );
  });

  it('should render assessment required section with correct styling', async () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      assessmentResults: null,
      achievementCount: 1,
    });

    const { container } = renderWithProviders(
      <DiscoveryPageLayout requiresAssessment={true}>
        {mockChildren}
      </DiscoveryPageLayout>
    );

    const assessmentSection = container.querySelector('.text-center.py-12');
    expect(assessmentSection).toBeInTheDocument();

    const assessmentButton = screen.getByRole('button', { name: '開始評估' });
    expect(assessmentButton).toHaveClass(
      'bg-blue-600',
      'text-white',
      'px-6',
      'py-3',
      'rounded-lg',
      'hover:bg-blue-700',
      'transition-colors'
    );
  });

  it('should handle falsy assessment results correctly', async () => {
    // Test different falsy values
    const falsyValues = [null, undefined, false, 0, ''];

    falsyValues.forEach((falsyValue) => {
      mockUseDiscoveryData.mockReturnValue({
        isLoading: false,
        assessmentResults: falsyValue,
        achievementCount: 2,
      });

      const { unmount } = renderWithProviders(
        <DiscoveryPageLayout requiresAssessment={true}>
          {mockChildren}
        </DiscoveryPageLayout>
      );

      expect(screen.getByText('需要先完成評估')).toBeInTheDocument();
      expect(screen.queryByTestId('test-children')).not.toBeInTheDocument();

      unmount();
    });
  });

  it('should handle truthy assessment results correctly', async () => {
    // Test different truthy values
    const truthyValues = [
      { data: 'test' },
      { score: 100 },
      'completed',
      1,
      true,
      []
    ];

    truthyValues.forEach((truthyValue) => {
      mockUseDiscoveryData.mockReturnValue({
        isLoading: false,
        assessmentResults: truthyValue,
        achievementCount: 3,
      });

      const { unmount } = renderWithProviders(
        <DiscoveryPageLayout requiresAssessment={true}>
          {mockChildren}
        </DiscoveryPageLayout>
      );

      expect(screen.getByTestId('test-children')).toBeInTheDocument();
      expect(screen.queryByText('需要先完成評估')).not.toBeInTheDocument();

      unmount();
    });
  });

  it('should render complex children components', async () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      assessmentResults: { completed: true },
      achievementCount: 6,
    });

    const ComplexChild = () => (
      <div data-testid="complex-child">
        <h1>Complex Title</h1>
        <div>
          <p>Nested paragraph</p>
          <ul>
            <li>List item 1</li>
            <li>List item 2</li>
          </ul>
        </div>
      </div>
    );

    renderWithProviders(
      <DiscoveryPageLayout>
        <ComplexChild />
      </DiscoveryPageLayout>
    );

    expect(screen.getByTestId('complex-child')).toBeInTheDocument();
    expect(screen.getByText('Complex Title')).toBeInTheDocument();
    expect(screen.getByText('Nested paragraph')).toBeInTheDocument();
    expect(screen.getByText('List item 1')).toBeInTheDocument();
    expect(screen.getByText('List item 2')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', async () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      assessmentResults: null,
      achievementCount: 1,
    });

    renderWithProviders(
      <DiscoveryPageLayout requiresAssessment={true}>
        {mockChildren}
      </DiscoveryPageLayout>
    );

    const assessmentButton = screen.getByRole('button', { name: '開始評估' });
    expect(assessmentButton).toBeEnabled();
    expect(assessmentButton).toBeVisible();
  });
});