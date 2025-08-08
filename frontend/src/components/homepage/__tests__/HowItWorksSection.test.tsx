import React from 'react';
import { renderWithProviders, screen, waitFor } from '@/test-utils/helpers/render';
import '@testing-library/jest-dom';
import HowItWorksSection from '../HowItWorksSection';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'howItWorks.title': 'How AI Square Works',
        'howItWorks.subtitle': 'Your journey to AI literacy in four simple steps',
        'howItWorks.steps.assessment.title': 'Take Assessment',
        'howItWorks.steps.assessment.description': 'Complete our AI literacy assessment to identify your current level',
        'howItWorks.steps.personalized.title': 'Get Personalized Path',
        'howItWorks.steps.personalized.description': 'Receive a customized learning pathway based on your needs',
        'howItWorks.steps.learn.title': 'Learn with AI',
        'howItWorks.steps.learn.description': 'Engage with interactive scenarios and AI-powered tutoring',
        'howItWorks.steps.track.title': 'Track Progress',
        'howItWorks.steps.track.description': 'Monitor your growth and earn certifications'
      };
      return translations[key] || key;
    }
  })
}));

describe('HowItWorksSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', async () => {
    renderWithProviders(<HowItWorksSection />);
    expect(screen.getByText('How AI Square Works')).toBeInTheDocument();
  });

  it('displays the section title', async () => {
    renderWithProviders(<HowItWorksSection />);
    const title = screen.getByText('How AI Square Works');
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H2');
    expect(title).toHaveClass('text-3xl', 'md:text-4xl', 'font-bold', 'text-gray-900');
  });

  it('displays the section subtitle', async () => {
    renderWithProviders(<HowItWorksSection />);
    const subtitle = screen.getByText('Your journey to AI literacy in four simple steps');
    expect(subtitle).toBeInTheDocument();
    expect(subtitle).toHaveClass('text-xl', 'text-gray-600');
  });

  it('renders all four steps', async () => {
    renderWithProviders(<HowItWorksSection />);
    
    expect(screen.getByText('Take Assessment')).toBeInTheDocument();
    expect(screen.getByText('Get Personalized Path')).toBeInTheDocument();
    expect(screen.getByText('Learn with AI')).toBeInTheDocument();
    expect(screen.getByText('Track Progress')).toBeInTheDocument();
  });

  it('renders step descriptions', async () => {
    renderWithProviders(<HowItWorksSection />);
    
    expect(screen.getByText('Complete our AI literacy assessment to identify your current level')).toBeInTheDocument();
    expect(screen.getByText('Receive a customized learning pathway based on your needs')).toBeInTheDocument();
    expect(screen.getByText('Engage with interactive scenarios and AI-powered tutoring')).toBeInTheDocument();
    expect(screen.getByText('Monitor your growth and earn certifications')).toBeInTheDocument();
  });

  it('displays step numbers', async () => {
    renderWithProviders(<HowItWorksSection />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders SVG icons for each step', async () => {
    const { container } = renderWithProviders(<HowItWorksSection />);
    const svgs = container.querySelectorAll('svg');
    
    // Should have 4 SVG icons
    expect(svgs).toHaveLength(4);
    
    // Each SVG should have proper classes
    svgs.forEach(svg => {
      expect(svg).toHaveClass('w-8', 'h-8');
    });
  });

  it('applies correct color classes to step icons', async () => {
    const { container } = renderWithProviders(<HowItWorksSection />);
    
    const iconContainers = container.querySelectorAll('.inline-flex.rounded-full');
    
    expect(iconContainers[0]).toHaveClass('bg-blue-100', 'text-blue-600');
    expect(iconContainers[1]).toHaveClass('bg-green-100', 'text-green-600');
    expect(iconContainers[2]).toHaveClass('bg-purple-100', 'text-purple-600');
    expect(iconContainers[3]).toHaveClass('bg-orange-100', 'text-orange-600');
  });

  it('applies hover effects to step cards', async () => {
    const { container } = renderWithProviders(<HowItWorksSection />);
    const cards = container.querySelectorAll('.bg-white.rounded-2xl');
    
    cards.forEach(card => {
      expect(card).toHaveClass('hover:shadow-xl', 'transition-all', 'duration-300');
    });
  });

  it('renders connection line for desktop', async () => {
    const { container } = renderWithProviders(<HowItWorksSection />);
    const connectionLine = container.querySelector('.hidden.lg\\:block.absolute');
    
    expect(connectionLine).toBeInTheDocument();
    expect(connectionLine).toHaveClass('h-0.5', 'bg-gray-300');
  });

  it('uses responsive grid layout', async () => {
    const { container } = renderWithProviders(<HowItWorksSection />);
    const grid = container.querySelector('.grid');
    
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
  });

  it('applies proper section styling', async () => {
    const { container } = renderWithProviders(<HowItWorksSection />);
    const section = container.querySelector('section');
    
    expect(section).toHaveClass('py-20', 'bg-gray-50');
  });

  it('centers text content', async () => {
    const { container } = renderWithProviders(<HowItWorksSection />);
    const textCenterDiv = container.querySelector('.text-center');
    
    expect(textCenterDiv).toBeInTheDocument();
    expect(textCenterDiv).toHaveClass('mb-16');
  });

  it('positions step numbers correctly', async () => {
    const { container } = renderWithProviders(<HowItWorksSection />);
    const stepNumbers = container.querySelectorAll('.absolute.-top-4');
    
    expect(stepNumbers).toHaveLength(4);
    
    stepNumbers.forEach(stepNumber => {
      expect(stepNumber).toHaveClass('left-1/2', 'transform', '-translate-x-1/2');
      expect(stepNumber).toHaveClass('w-8', 'h-8', 'bg-white', 'border-2', 'border-gray-300', 'rounded-full');
    });
  });

  it('applies shadow to step cards', async () => {
    const { container } = renderWithProviders(<HowItWorksSection />);
    const cards = container.querySelectorAll('.bg-white.rounded-2xl');
    
    cards.forEach(card => {
      expect(card).toHaveClass('shadow-lg');
    });
  });

  it('uses proper spacing and padding', async () => {
    const { container } = renderWithProviders(<HowItWorksSection />);
    
    const maxWidthContainer = container.querySelector('.max-w-7xl');
    expect(maxWidthContainer).toHaveClass('mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
    
    const cards = container.querySelectorAll('.bg-white.rounded-2xl');
    cards.forEach(card => {
      expect(card).toHaveClass('p-8');
    });
  });

  it('applies z-index to step numbers', async () => {
    const { container } = renderWithProviders(<HowItWorksSection />);
    const stepNumbers = container.querySelectorAll('.z-10');
    
    expect(stepNumbers).toHaveLength(4);
  });

  it('uses gap spacing in grid', async () => {
    const { container } = renderWithProviders(<HowItWorksSection />);
    const grid = container.querySelector('.grid');
    
    expect(grid).toHaveClass('gap-8');
  });
