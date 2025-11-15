import React from 'react';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

// Mock the components as default exports
jest.mock('@/components/homepage/HeroSection', () => ({
  __esModule: true,
  default: () => <div data-testid="hero-section">Hero Section</div>
}));

jest.mock('@/components/homepage/FeaturesSection', () => ({
  __esModule: true,
  default: () => <div data-testid="features-section">Features Section</div>
}));

jest.mock('@/components/homepage/KnowledgeGraph', () => ({
  __esModule: true,
  default: () => <div data-testid="knowledge-graph">Knowledge Graph</div>
}));

jest.mock('@/components/homepage/HowItWorksSection', () => ({
  __esModule: true,
  default: () => <div data-testid="how-it-works">How It Works</div>
}));

jest.mock('@/components/homepage/TargetAudienceSection', () => ({
  __esModule: true,
  default: () => <div data-testid="target-audience">Target Audience</div>
}));

jest.mock('@/components/homepage/CTASection', () => ({
  __esModule: true,
  default: () => <div data-testid="cta-section">CTA Section</div>
}));

describe('HomePage', () => {
  it('should render all homepage sections', () => {
    render(<HomePage />);

    expect(screen.getByTestId('hero-section')).toBeInTheDocument();
    expect(screen.getByTestId('features-section')).toBeInTheDocument();
    expect(screen.getByTestId('knowledge-graph-section')).toBeInTheDocument();
    expect(screen.getByTestId('knowledge-graph')).toBeInTheDocument();
    expect(screen.getByTestId('how-it-works')).toBeInTheDocument();
    expect(screen.getByTestId('target-audience')).toBeInTheDocument();
    expect(screen.getByTestId('cta-section')).toBeInTheDocument();
  });

  it('should have proper structure', () => {
    const { container } = render(<HomePage />);
    const mainElement = container.querySelector('main');

    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveClass('min-h-screen');
  });

  it('should render sections in correct order', () => {
    const { container } = render(<HomePage />);
    const sections = container.querySelectorAll('[data-testid]');

    expect(sections[0]).toHaveAttribute('data-testid', 'hero-section');
    expect(sections[1]).toHaveAttribute('data-testid', 'features-section');
    expect(sections[2]).toHaveAttribute('data-testid', 'knowledge-graph-section');
    expect(sections[3]).toHaveAttribute('data-testid', 'knowledge-graph');
    expect(sections[4]).toHaveAttribute('data-testid', 'how-it-works');
    expect(sections[5]).toHaveAttribute('data-testid', 'target-audience');
    expect(sections[6]).toHaveAttribute('data-testid', 'cta-section');
  });
});
