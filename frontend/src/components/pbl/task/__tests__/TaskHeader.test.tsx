import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TaskHeader } from '../TaskHeader';
import type { Scenario, DomainType } from '@/types/pbl';

describe('TaskHeader', () => {
  const mockScenario: Scenario = {
    id: 'scenario-1',
    title: 'Test Scenario',
    title_zhTW: '測試情境',
    description: 'Test Description',
    description_zhTW: '測試描述',
    targetDomains: ['math' as DomainType],
    difficulty: 'beginner',
    estimatedDuration: 60,
    learningObjectives: [],
    ksaMapping: { knowledge: [], skills: [], attitudes: [] },
    tasks: [],
  };

  it('should render scenario title in English', () => {
    render(<TaskHeader scenario={mockScenario} language="en" />);

    expect(screen.getByText('Test Scenario')).toBeInTheDocument();
  });

  it('should render scenario title in Traditional Chinese', () => {
    render(<TaskHeader scenario={mockScenario} language="zhTW" />);

    expect(screen.getByText('測試情境')).toBeInTheDocument();
  });

  it('should render header element with correct styling', () => {
    const { container } = render(<TaskHeader scenario={mockScenario} language="en" />);

    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('bg-white', 'dark:bg-gray-800', 'shadow-sm', 'flex-shrink-0');
  });

  it('should render h1 with correct styling', () => {
    render(<TaskHeader scenario={mockScenario} language="en" />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('text-lg', 'font-semibold', 'text-gray-900', 'dark:text-white');
  });

  it('should handle missing title gracefully', () => {
    const scenarioWithoutTitle: Scenario = {
      ...mockScenario,
      title: '',
      title_zhTW: undefined,
    };

    render(<TaskHeader scenario={scenarioWithoutTitle} language="en" />);

    // Should render empty string without crashing
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBe('');
  });

  it('should fallback to default title for unsupported language', () => {
    render(<TaskHeader scenario={mockScenario} language="fr" />);

    const heading = screen.getByRole('heading', { level: 1 });
    // Should fall back to default 'title' field
    expect(heading.textContent).toBe('Test Scenario');
  });
});
