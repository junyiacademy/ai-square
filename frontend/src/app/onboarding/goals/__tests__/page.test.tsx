/**
 * Unit tests for Onboarding Goals page
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OnboardingGoalsPage from '../page';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
    },
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('OnboardingGoalsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('should render the goals page', () => {
    render(<OnboardingGoalsPage />);
    expect(screen.getByText('onboarding:goals.title')).toBeInTheDocument();
  });

  it('should display all learning goals', () => {
    render(<OnboardingGoalsPage />);
    
    expect(screen.getByText('onboarding:goals.understand.title')).toBeInTheDocument();
    expect(screen.getByText('onboarding:goals.create.title')).toBeInTheDocument();
    expect(screen.getByText('onboarding:goals.analyze.title')).toBeInTheDocument();
    expect(screen.getByText('onboarding:goals.build.title')).toBeInTheDocument();
  });

  it('should display goal descriptions', () => {
    render(<OnboardingGoalsPage />);
    
    expect(screen.getByText('onboarding:goals.understand.description')).toBeInTheDocument();
    expect(screen.getByText('onboarding:goals.create.description')).toBeInTheDocument();
    expect(screen.getByText('onboarding:goals.analyze.description')).toBeInTheDocument();
    expect(screen.getByText('onboarding:goals.build.description')).toBeInTheDocument();
  });

  it('should display goal icons', () => {
    render(<OnboardingGoalsPage />);
    
    expect(screen.getByText('🧠')).toBeInTheDocument();
    expect(screen.getByText('🎨')).toBeInTheDocument();
    expect(screen.getByText('📊')).toBeInTheDocument();
    expect(screen.getByText('🔧')).toBeInTheDocument();
  });

  it('should toggle goal selection on click', () => {
    render(<OnboardingGoalsPage />);
    
    const understandGoal = screen.getByText('onboarding:goals.understand.title').closest('div');
    
    if (understandGoal) {
      fireEvent.click(understandGoal);
      expect(understandGoal).toHaveClass('selected');
      
      fireEvent.click(understandGoal);
      expect(understandGoal).not.toHaveClass('selected');
    }
  });

  it('should allow multiple goal selection', () => {
    render(<OnboardingGoalsPage />);
    
    const understandGoal = screen.getByText('onboarding:goals.understand.title').closest('div');
    const createGoal = screen.getByText('onboarding:goals.create.title').closest('div');
    
    if (understandGoal && createGoal) {
      fireEvent.click(understandGoal);
      fireEvent.click(createGoal);
      
      expect(understandGoal).toHaveClass('selected');
      expect(createGoal).toHaveClass('selected');
    }
  });

  it('should enable continue button when goals are selected', () => {
    render(<OnboardingGoalsPage />);
    
    const continueButton = screen.getByRole('button', { name: 'common:continue' });
    expect(continueButton).toBeDisabled();
    
    const understandGoal = screen.getByText('onboarding:goals.understand.title').closest('div');
    if (understandGoal) {
      fireEvent.click(understandGoal);
      expect(continueButton).not.toBeDisabled();
    }
  });

  it('should submit goals and navigate on continue', async () => {
    render(<OnboardingGoalsPage />);
    
    const understandGoal = screen.getByText('onboarding:goals.understand.title').closest('div');
    if (understandGoal) {
      fireEvent.click(understandGoal);
    }
    
    const continueButton = screen.getByRole('button', { name: 'common:continue' });
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users/onboarding',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('understand-ai'),
        })
      );
    });
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should handle API error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<OnboardingGoalsPage />);
    
    const understandGoal = screen.getByText('onboarding:goals.understand.title').closest('div');
    if (understandGoal) {
      fireEvent.click(understandGoal);
    }
    
    const continueButton = screen.getByRole('button', { name: 'common:continue' });
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      expect(screen.queryByText('common:continue')).toBeInTheDocument();
    });
    
    consoleSpy.mockRestore();
  });

  it('should show loading state during submission', async () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true })
      }), 100))
    );
    
    render(<OnboardingGoalsPage />);
    
    const understandGoal = screen.getByText('onboarding:goals.understand.title').closest('div');
    if (understandGoal) {
      fireEvent.click(understandGoal);
    }
    
    const continueButton = screen.getByRole('button', { name: 'common:continue' });
    fireEvent.click(continueButton);
    
    expect(continueButton).toBeDisabled();
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });

  it('should display skip option', () => {
    render(<OnboardingGoalsPage />);
    
    const skipButton = screen.getByRole('button', { name: 'onboarding:skip' });
    expect(skipButton).toBeInTheDocument();
    
    fireEvent.click(skipButton);
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('should display progress indicator', () => {
    render(<OnboardingGoalsPage />);
    
    expect(screen.getByText('onboarding:step')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should categorize goals correctly', () => {
    render(<OnboardingGoalsPage />);
    
    const goals = [
      { id: 'understand-ai', category: 'foundation' },
      { id: 'create-content', category: 'creative' },
      { id: 'analyze-data', category: 'analytical' },
      { id: 'build-solutions', category: 'technical' },
    ];
    
    goals.forEach(goal => {
      const element = document.querySelector(`[data-goal-id="${goal.id}"]`);
      expect(element).toHaveAttribute('data-category', goal.category);
    });
  });
});