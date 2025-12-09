import { render, screen } from '@testing-library/react';
import { ActionButtons } from '../ActionButtons';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'complete.retryScenario') return 'Retry Scenario';
      return key;
    }
  })
}));

describe('ActionButtons', () => {
  it('renders retry button', () => {
    render(<ActionButtons scenarioId="scenario-123" />);
    expect(screen.getByText('Retry Scenario')).toBeInTheDocument();
  });

  it('links to correct scenario URL', () => {
    render(<ActionButtons scenarioId="scenario-456" />);
    const link = screen.getByText('Retry Scenario').closest('a');
    expect(link).toHaveAttribute('href', '/pbl/scenarios/scenario-456');
  });

  it('applies correct styling classes', () => {
    render(<ActionButtons scenarioId="test-id" />);
    const link = screen.getByText('Retry Scenario');
    expect(link).toHaveClass('bg-purple-600', 'text-white', 'rounded-lg');
  });
});
