import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResultsHeader } from '../ResultsHeader';
import { AssessmentResult } from '@/types/assessment';

const mockResult: AssessmentResult = {
  overallScore: 85,
  domainScores: {
    engaging_with_ai: 90,
    creating_with_ai: 80,
    managing_with_ai: 85,
    designing_with_ai: 85
  },
  totalQuestions: 12,
  correctAnswers: 10,
  timeSpentSeconds: 720,
  completedAt: new Date('2025-06-25T12:00:00Z'),
  level: 'expert',
  recommendations: []
};

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'level.expert': 'Expert',
    'results.correctAnswers': 'Correct Answers',
    'results.timeSpent': 'Time Spent',
    'results.completedAt': 'Completed At'
  };
  return translations[key] || key;
};

describe('ResultsHeader', () => {
  it('renders overall score correctly', () => {
    render(<ResultsHeader result={mockResult} language="en" t={mockT} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('renders level badge', () => {
    render(<ResultsHeader result={mockResult} language="en" t={mockT} />);
    expect(screen.getByText('Expert')).toBeInTheDocument();
  });

  it('renders correct answers stats', () => {
    render(<ResultsHeader result={mockResult} language="en" t={mockT} />);
    expect(screen.getByText('10/12')).toBeInTheDocument();
  });

  it('renders time spent correctly', () => {
    render(<ResultsHeader result={mockResult} language="en" t={mockT} />);
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });

  it('applies correct color for high score', () => {
    render(<ResultsHeader result={mockResult} language="en" t={mockT} />);
    const scoreElement = screen.getByText('85%');
    expect(scoreElement).toHaveClass('text-green-600');
  });
});
