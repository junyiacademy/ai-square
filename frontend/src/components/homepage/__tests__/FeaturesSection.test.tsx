import React from 'react';
import { render, screen } from '@testing-library/react';
import FeaturesSection from '../FeaturesSection';
import { useTranslation } from 'react-i18next';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

describe('FeaturesSection', () => {
  const mockT = jest.fn((key: string) => key);

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({
      t: mockT,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders features section with title and subtitle', () => {
    render(<FeaturesSection />);

    expect(screen.getByText('features.title')).toBeInTheDocument();
    expect(screen.getByText('features.subtitle')).toBeInTheDocument();
  });

  it('renders all six feature cards', () => {
    render(<FeaturesSection />);

    const featureKeys = [
      'personalizedLearning',
      'multilingualSupport',
      'realTimeAI',
      'comprehensiveAssessment',
      'interactiveTasks',
      'progressTracking'
    ];

    featureKeys.forEach(key => {
      expect(screen.getByText(`features.items.${key}.title`)).toBeInTheDocument();
      expect(screen.getByText(`features.items.${key}.description`)).toBeInTheDocument();
    });
  });

  it('renders feature icons', () => {
    const { container } = render(<FeaturesSection />);

    // Check that SVG icons are rendered
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBe(6); // 6 features, each with an icon
  });

  it('applies hover styles to feature cards', () => {
    const { container } = render(<FeaturesSection />);

    // Check for hover classes on feature cards
    const featureCards = container.querySelectorAll('.group');
    expect(featureCards.length).toBe(6);
    
    featureCards.forEach(card => {
      expect(card).toHaveClass('hover:shadow-xl');
    });
  });
});