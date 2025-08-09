import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingIdentityPage from '../page';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' }
  })
}));

// Mock fetch
global.fetch = jest.fn();

describe('OnboardingIdentityPage', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  it('should render the onboarding form', () => {
    render(<OnboardingIdentityPage />);
    expect(screen.getByText(/onboarding.identity.title/)).toBeInTheDocument();
  });

  it('should display form fields', () => {
    render(<OnboardingIdentityPage />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const user = userEvent.setup();
    render(<OnboardingIdentityPage />);
    
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    
    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    
    const submitButton = screen.getByRole('button', { name: /continue/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/onboarding/identity',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  it('should handle submission errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid data' })
    });
    
    const user = userEvent.setup();
    render(<OnboardingIdentityPage />);
    
    const submitButton = screen.getByRole('button', { name: /continue/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid data/)).toBeInTheDocument();
    });
  });

  it('should navigate to next step on success', async () => {
    const user = userEvent.setup();
    render(<OnboardingIdentityPage />);
    
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'John Doe');
    
    const submitButton = screen.getByRole('button', { name: /continue/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onboarding/preferences');
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<OnboardingIdentityPage />);
    
    const submitButton = screen.getByRole('button', { name: /continue/i });
    await user.click(submitButton);
    
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });

  it('should allow role selection', async () => {
    const user = userEvent.setup();
    render(<OnboardingIdentityPage />);
    
    const roleSelect = screen.getByLabelText(/role/i);
    await user.selectOptions(roleSelect, 'student');
    
    expect((roleSelect as HTMLSelectElement).value).toBe('student');
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    render(<OnboardingIdentityPage />);
    
    const submitButton = screen.getByRole('button', { name: /continue/i });
    await user.click(submitButton);
    
    expect(submitButton).toBeDisabled();
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    
    const user = userEvent.setup();
    render(<OnboardingIdentityPage />);
    
    const submitButton = screen.getByRole('button', { name: /continue/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });
});
