import { render, screen } from '@testing-library/react';
import { CompletionHeader } from '../CompletionHeader';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'complete.congratulations') return 'Congratulations!';
      if (key === 'complete.scenarioCompleted') {
        return `You completed ${(params as { title?: string })?.title || 'the scenario'}`;
      }
      return key;
    },
    i18n: { language: 'en' }
  })
}));

describe('CompletionHeader', () => {
  it('renders congratulations message', () => {
    render(<CompletionHeader scenarioTitle="Test Scenario" />);
    expect(screen.getByText('Congratulations!')).toBeInTheDocument();
  });

  it('displays scenario title in completion message', () => {
    render(<CompletionHeader scenarioTitle="AI Basics" />);
    expect(screen.getByText('You completed AI Basics')).toBeInTheDocument();
  });

  it('renders checkmark icon', () => {
    const { container } = render(<CompletionHeader scenarioTitle="Test" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-green-500');
  });

  it('applies correct styling classes', () => {
    const { container } = render(<CompletionHeader scenarioTitle="Test" />);
    const header = container.querySelector('h1');
    expect(header).toHaveClass('text-3xl', 'font-bold');
  });
});
