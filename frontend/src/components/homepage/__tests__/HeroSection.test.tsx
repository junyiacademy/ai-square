import React from 'react';
import { render, screen } from '@testing-library/react';
import HeroSection from '../HeroSection';
import { useTranslation } from 'react-i18next';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('HeroSection', () => {
  const mockT = jest.fn((key: string) => key);

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({
      t: mockT,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders hero section with all elements', () => {
    render(<HeroSection />);

    // Check for title
    expect(screen.getByText('hero.title')).toBeInTheDocument();

    // Check for subtitle
    expect(screen.getByText('hero.subtitle')).toBeInTheDocument();

    // Check for description
    expect(screen.getByText('hero.description')).toBeInTheDocument();

    // Check for CTA buttons
    expect(screen.getByText('hero.cta.getStarted')).toBeInTheDocument();
    expect(screen.getByText('hero.cta.assessment')).toBeInTheDocument();
    expect(screen.getByText('hero.cta.explore')).toBeInTheDocument();
  });

  it('renders CTA links with correct hrefs', () => {
    render(<HeroSection />);

    const getStartedLink = screen.getByText('hero.cta.getStarted').closest('a');
    expect(getStartedLink).toHaveAttribute('href', '/register');

    const assessmentLink = screen.getByText('hero.cta.assessment').closest('a');
    expect(assessmentLink).toHaveAttribute('href', '/assessment');

    const exploreLink = screen.getByText('hero.cta.explore').closest('a');
    expect(exploreLink).toHaveAttribute('href', '/relations');
  });

  it('renders visual elements (emojis)', () => {
    render(<HeroSection />);

    const emojis = ['🎯', '🎨', '🎮', '🏗️'];
    emojis.forEach(emoji => {
      expect(screen.getByText(emoji)).toBeInTheDocument();
    });
  });

  it('applies correct styling classes', () => {
    const { container } = render(<HeroSection />);

    // Check for gradient background
    const section = container.querySelector('section');
    expect(section).toHaveClass('bg-gradient-to-br', 'from-blue-50', 'via-indigo-50', 'to-purple-50');

    // Check for responsive padding
    expect(section).toHaveClass('pt-24', 'pb-20');
  });
});