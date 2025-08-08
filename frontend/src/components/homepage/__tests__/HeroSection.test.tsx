import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import HeroSection from '../HeroSection';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

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

describe('HeroSection', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      prefetch: jest.fn(),
    });
    
    // Clear localStorage
    localStorage.clear();
    
    // Clear mock calls
    mockPush.mockClear();
  });

  it('should render hero section with title and subtitle', () => {
    render(<HeroSection />);
    
    expect(screen.getByText('hero.title')).toBeInTheDocument();
    expect(screen.getByText('hero.subtitle')).toBeInTheDocument();
  });

  it('should render CTA button', () => {
    render(<HeroSection />);
    
    const ctaButton = screen.getByRole('button', { name: 'hero.cta' });
    expect(ctaButton).toBeInTheDocument();
  });

  it('should navigate to register when not logged in', async () => {
    const user = userEvent.setup();
    render(<HeroSection />);
    
    const ctaButton = screen.getByRole('button', { name: 'hero.cta' });
    await user.click(ctaButton);
    
    expect(mockPush).toHaveBeenCalledWith('/register');
  });

  it('should navigate to assessment when logged in without assessment result', async () => {
    const user = userEvent.setup();
    
    // Set logged in user without assessment result
    localStorage.setItem('user', JSON.stringify({ id: '123', email: 'test@example.com' }));
    
    render(<HeroSection />);
    
    // Wait for useEffect to complete
    await waitFor(() => {
      const ctaButton = screen.getByRole('button', { name: 'hero.cta' });
      expect(ctaButton).toBeInTheDocument();
    });
    
    const ctaButton = screen.getByRole('button', { name: 'hero.cta' });
    await user.click(ctaButton);
    
    expect(mockPush).toHaveBeenCalledWith('/assessment');
  });

  it('should navigate to PBL when logged in with assessment result', async () => {
    const user = userEvent.setup();
    
    // Set logged in user with assessment result
    localStorage.setItem('user', JSON.stringify({ id: '123', email: 'test@example.com' }));
    localStorage.setItem('assessmentResult', JSON.stringify({ score: 80 }));
    
    render(<HeroSection />);
    
    // Wait for useEffect to complete
    await waitFor(() => {
      const ctaButton = screen.getByRole('button', { name: 'hero.cta' });
      expect(ctaButton).toBeInTheDocument();
    });
    
    const ctaButton = screen.getByRole('button', { name: 'hero.cta' });
    await user.click(ctaButton);
    
    expect(mockPush).toHaveBeenCalledWith('/pbl');
  });

  it('should render background decorations', () => {
    const { container } = render(<HeroSection />);
    
    // Check for background decoration elements
    const decorations = container.querySelectorAll('.absolute .rounded-full');
    expect(decorations.length).toBeGreaterThan(0);
  });

  it('should have proper gradient background', () => {
    render(<HeroSection />);
    
    const section = screen.getByRole('region') || document.querySelector('section');
    expect(section?.className).toContain('bg-gradient-to-br');
    expect(section?.className).toContain('from-blue-50');
    expect(section?.className).toContain('via-indigo-50');
    expect(section?.className).toContain('to-purple-50');
  });

  it('should check localStorage on mount', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    
    render(<HeroSection />);
    
    expect(getItemSpy).toHaveBeenCalledWith('user');
  });

  it('should handle localStorage without user data', async () => {
    const user = userEvent.setup();
    
    // Ensure localStorage is empty
    localStorage.clear();
    
    render(<HeroSection />);
    
    const ctaButton = screen.getByRole('button', { name: 'hero.cta' });
    await user.click(ctaButton);
    
    expect(mockPush).toHaveBeenCalledWith('/register');
  });

  it('should update state when localStorage changes', async () => {
    const { rerender } = render(<HeroSection />);
    
    // Initially not logged in
    let ctaButton = screen.getByRole('button', { name: 'hero.cta' });
    await userEvent.click(ctaButton);
    expect(mockPush).toHaveBeenCalledWith('/register');
    
    // Simulate login
    localStorage.setItem('user', JSON.stringify({ id: '123' }));
    mockPush.mockClear();
    
    // Re-render to trigger useEffect
    rerender(<HeroSection />);
    
    await waitFor(async () => {
      ctaButton = screen.getByRole('button', { name: 'hero.cta' });
      await userEvent.click(ctaButton);
      expect(mockPush).toHaveBeenCalledWith('/assessment');
    });
  });
});
