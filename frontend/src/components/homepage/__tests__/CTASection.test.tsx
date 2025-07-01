import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CTASection from '../CTASection';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, className }: any) => {
    return <a href={href} className={className}>{children}</a>;
  };
});

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'cta.title': 'Ready to Start Your AI Learning Journey?',
        'cta.subtitle': 'Join thousands of learners developing AI literacy skills',
        'cta.button': 'Get Started for Free',
        'cta.login': 'Already have an account? Sign in'
      };
      return translations[key] || key;
    }
  })
}));

describe('CTASection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CTASection />);
    expect(screen.getByText('Ready to Start Your AI Learning Journey?')).toBeInTheDocument();
  });

  it('displays the main title', () => {
    render(<CTASection />);
    const title = screen.getByText('Ready to Start Your AI Learning Journey?');
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H2');
    expect(title).toHaveClass('text-3xl', 'md:text-4xl', 'font-bold', 'text-white');
  });

  it('displays the subtitle', () => {
    render(<CTASection />);
    const subtitle = screen.getByText('Join thousands of learners developing AI literacy skills');
    expect(subtitle).toBeInTheDocument();
    expect(subtitle).toHaveClass('text-xl', 'text-blue-100');
  });

  it('renders the CTA button with correct link', () => {
    render(<CTASection />);
    const button = screen.getByText('Get Started for Free');
    expect(button).toBeInTheDocument();
    const link = button.closest('a');
    expect(link).toHaveAttribute('href', '/register');
    expect(link).toHaveClass('inline-flex', 'items-center', 'justify-center');
  });

  it('renders the sign in link', () => {
    render(<CTASection />);
    const signInLink = screen.getByText('Sign in');
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute('href', '/login');
    expect(signInLink).toHaveClass('underline', 'hover:text-blue-200');
  });

  it('displays the decorative statistics', () => {
    render(<CTASection />);
    
    // Check statistics numbers
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('20+')).toBeInTheDocument();
    expect(screen.getByText('24/7')).toBeInTheDocument();
    
    // Check statistics labels
    expect(screen.getByText('Languages')).toBeInTheDocument();
    expect(screen.getByText('AI Domains')).toBeInTheDocument();
    expect(screen.getByText('Competencies')).toBeInTheDocument();
    expect(screen.getByText('AI Support')).toBeInTheDocument();
  });

  it('applies gradient background', () => {
    const { container } = render(<CTASection />);
    const section = container.querySelector('section');
    expect(section).toHaveClass('bg-gradient-to-r', 'from-blue-600', 'to-indigo-700');
  });

  it('renders SVG arrow icon in CTA button', () => {
    render(<CTASection />);
    const svg = screen.getByText('Get Started for Free').parentElement?.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('ml-2', 'w-5', 'h-5');
  });

  it('uses responsive layout classes', () => {
    const { container } = render(<CTASection />);
    
    // Check responsive flex container
    const flexContainer = container.querySelector('.flex-col.sm\\:flex-row');
    expect(flexContainer).toBeInTheDocument();
    
    // Check responsive grid
    const grid = container.querySelector('.grid-cols-2.md\\:grid-cols-4');
    expect(grid).toBeInTheDocument();
  });

  it('properly handles the login text split', () => {
    render(<CTASection />);
    
    // Check that "Already have an account?" is rendered
    expect(screen.getByText(/Already have an account/)).toBeInTheDocument();
    
    // Check that "Sign in" is rendered as a link
    const signInLink = screen.getByText('Sign in');
    expect(signInLink.tagName).toBe('A');
  });

  it('applies hover effects to the CTA button', () => {
    render(<CTASection />);
    const link = screen.getByText('Get Started for Free').closest('a');
    expect(link).toHaveClass('hover:bg-gray-100', 'hover:scale-105');
  });

  it('uses proper spacing and padding', () => {
    const { container } = render(<CTASection />);
    const section = container.querySelector('section');
    expect(section).toHaveClass('py-20');
    
    const innerContainer = container.querySelector('.max-w-7xl');
    expect(innerContainer).toHaveClass('mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
  });

  it('centers content properly', () => {
    const { container } = render(<CTASection />);
    const textCenter = container.querySelector('.text-center');
    expect(textCenter).toBeInTheDocument();
    
    const flexCenter = container.querySelector('.justify-center');
    expect(flexCenter).toBeInTheDocument();
  });

  it('applies shadow to CTA button', () => {
    render(<CTASection />);
    const link = screen.getByText('Get Started for Free').closest('a');
    expect(link).toHaveClass('shadow-lg');
  });

  it('uses transition effects', () => {
    render(<CTASection />);
    const link = screen.getByText('Get Started for Free').closest('a');
    expect(link).toHaveClass('transition-all', 'duration-200');
  });
});