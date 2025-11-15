import React from 'react';
import { render, screen } from '@testing-library/react';
import FeaturesSection from '../FeaturesSection';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
    },
  }),
}));

describe('FeaturesSection', () => {
  it('should render features section', () => {
    render(<FeaturesSection />);

    // Check section title
    expect(screen.getByText('features.title')).toBeInTheDocument();
    expect(screen.getByText('features.subtitle')).toBeInTheDocument();
  });

  it('should render all feature cards', () => {
    render(<FeaturesSection />);

    // Check for each feature - using the correct i18n key structure
    expect(screen.getByText('features.items.personalizedLearning.title')).toBeInTheDocument();
    expect(screen.getByText('features.items.personalizedLearning.description')).toBeInTheDocument();

    expect(screen.getByText('features.items.multilingualSupport.title')).toBeInTheDocument();
    expect(screen.getByText('features.items.multilingualSupport.description')).toBeInTheDocument();

    expect(screen.getByText('features.items.realTimeAI.title')).toBeInTheDocument();
    expect(screen.getByText('features.items.realTimeAI.description')).toBeInTheDocument();

    expect(screen.getByText('features.items.comprehensiveAssessment.title')).toBeInTheDocument();
    expect(screen.getByText('features.items.comprehensiveAssessment.description')).toBeInTheDocument();

    expect(screen.getByText('features.items.interactiveTasks.title')).toBeInTheDocument();
    expect(screen.getByText('features.items.interactiveTasks.description')).toBeInTheDocument();

    expect(screen.getByText('features.items.progressTracking.title')).toBeInTheDocument();
    expect(screen.getByText('features.items.progressTracking.description')).toBeInTheDocument();
  });

  it('should render feature icons', () => {
    const { container } = render(<FeaturesSection />);

    // Check for SVG icons
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThanOrEqual(6); // At least 6 feature icons
  });

  it('should have proper grid layout for features', () => {
    const { container } = render(<FeaturesSection />);

    // Check for grid container
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer?.className).toContain('md:grid-cols-2');
    expect(gridContainer?.className).toContain('lg:grid-cols-3');
  });

  it('should have feature cards with proper styling', () => {
    const { container } = render(<FeaturesSection />);

    // Check for feature cards
    const featureCards = container.querySelectorAll('.group');
    expect(featureCards.length).toBeGreaterThan(0);

    // Check first card has proper classes
    const firstCard = featureCards[0];
    expect(firstCard.className).toContain('p-8');
    expect(firstCard.className).toContain('bg-white');
    expect(firstCard.className).toContain('rounded-2xl');
  });

  it('should have hover effects on feature cards', () => {
    const { container } = render(<FeaturesSection />);

    // Check for hover classes
    const featureCards = container.querySelectorAll('.group');
    featureCards.forEach(card => {
      expect(card.className).toContain('hover:shadow-xl');
      expect(card.className).toContain('transition-all');
    });
  });

  it('should render with proper section padding', () => {
    const { container } = render(<FeaturesSection />);

    const section = container.querySelector('section');
    expect(section?.className).toContain('py-20');
  });

  it('should center align the title', () => {
    const { container } = render(<FeaturesSection />);

    const titleContainer = container.querySelector('.text-center');
    expect(titleContainer).toBeInTheDocument();
  });

  it('should render feature icons with proper color', () => {
    const { container } = render(<FeaturesSection />);

    const iconContainers = container.querySelectorAll('.text-blue-600');
    expect(iconContainers.length).toBeGreaterThan(0);
  });

  it('should have responsive gap between grid items', () => {
    const { container } = render(<FeaturesSection />);

    const gridContainer = container.querySelector('.grid');
    expect(gridContainer?.className).toContain('gap-8');
  });
});
