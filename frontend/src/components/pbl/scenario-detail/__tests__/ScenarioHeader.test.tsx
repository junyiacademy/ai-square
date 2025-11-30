import { render, screen } from '@testing-library/react';
import { ScenarioHeader } from '../ScenarioHeader';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}));

describe('ScenarioHeader', () => {
  it('should render breadcrumb and title', () => {
    render(
      <ScenarioHeader
        title="Test Scenario"
        breadcrumbLabel="PBL"
        breadcrumbHref="/pbl/scenarios"
      />
    );

    expect(screen.getByText('PBL')).toBeInTheDocument();
    expect(screen.getByText('Test Scenario')).toBeInTheDocument();
  });

  it('should render breadcrumb link with correct href', () => {
    render(
      <ScenarioHeader
        title="Test Scenario"
        breadcrumbLabel="PBL"
        breadcrumbHref="/pbl/scenarios"
      />
    );

    const link = screen.getByText('PBL').closest('a');
    expect(link).toHaveAttribute('href', '/pbl/scenarios');
  });

  it('should display title in h1', () => {
    render(
      <ScenarioHeader
        title="My Great Scenario"
        breadcrumbLabel="PBL"
        breadcrumbHref="/pbl/scenarios"
      />
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('My Great Scenario');
  });
});
