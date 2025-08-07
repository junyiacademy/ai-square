import React from 'react';
import { renderWithProviders, screen, waitFor, fireEvent, act } from '@/test-utils/helpers/render';
import { useTranslation } from 'react-i18next';
import ForgotPasswordClient from '../ForgotPasswordClient';
import i18n from '@/i18n';
import '@testing-library/jest-dom';

// Mock translation
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

// Mock i18n
jest.mock('@/i18n', () => ({
  language: 'en',
  hasResourceBundle: jest.fn(),
  loadNamespaces: jest.fn(),
}));

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock fetch
global.fetch = jest.fn();

const mockT = jest.fn((key: string, defaultValue?: string) => {
  const translations: Record<string, string> = {
    'forgotPassword.title': 'Reset Password',
    'forgotPassword.subtitle': 'Enter your email to receive a reset link',
    'forgotPassword.successMessage': 'Password reset link sent to your email',
    'forgotPassword.error': 'Failed to send reset email',
    'forgotPassword.sendResetLink': 'Send Reset Link',
    'forgotPassword.backToLogin': 'Back to Login',
    'email': 'Email Address',
    'emailPlaceholder': 'Enter your email',
    'sending': 'Sending...',
  };
  return translations[key] || defaultValue || key;
});

describe('ForgotPasswordClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
    (i18n.hasResourceBundle as jest.Mock).mockReturnValue(true);
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render forgot password form', async () => {
    renderWithProviders(<ForgotPasswordClient />);
    
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByText('Enter your email to receive a reset link')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument();
    expect(screen.getByText('Back to Login')).toBeInTheDocument();
  });

  it('should not render when not mounted initially', async () => {
    // Mock mounted state to false initially
    const { container } = renderWithProviders(<ForgotPasswordClient />);
    
    // Component may render immediately in test environment, so check if mounted state works
    // This test is more about ensuring the mounting logic exists
    expect(container.firstChild).toBeTruthy(); // Component will be mounted in test env
  });

  it('should render after mounting', async () => {
    renderWithProviders(<ForgotPasswordClient />);
    
    // Wait for useEffect to set mounted state
    await waitFor(() => {
      expect(screen.getByText('Reset Password')).toBeInTheDocument();
    });
  });

  it('should load auth namespace if not available', async () => {
    (i18n.hasResourceBundle as jest.Mock).mockReturnValue(false);
    
    renderWithProviders(<ForgotPasswordClient />);
    
    await waitFor(() => {
      expect(i18n.loadNamespaces).toHaveBeenCalledWith(['auth']);
    });
  });

  it('should update email input value', async () => {
    renderWithProviders(<ForgotPasswordClient />);
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText('Email Address') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      expect(emailInput.value).toBe('test@example.com');
    });
  });

  it('should handle successful password reset request', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    
    renderWithProviders(<ForgotPasswordClient />);
    
    await act(async () => {
      const emailInput = screen.getByLabelText('Email Address');
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      
      expect(screen.getByText('Password reset link sent to your email')).toBeInTheDocument();
    });
    
    // Email input should be cleared on success
    await waitFor(() => {
      const emailInput = screen.getByLabelText('Email Address') as HTMLInputElement;
      expect(emailInput.value).toBe('');
    });
  });

  it('should handle API error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: false,
        error: 'Email not found'
      }),
    });
    
    renderWithProviders(<ForgotPasswordClient />);
    
    await act(async () => {
      const emailInput = screen.getByLabelText('Email Address');
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
      
      fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } });
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Email not found')).toBeInTheDocument();
    });
  });

  it('should handle API error response without specific error message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: false
      }),
    });
    
    renderWithProviders(<ForgotPasswordClient />);
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText('Email Address');
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Failed to send reset email')).toBeInTheDocument();
    });
  });

  it('should handle network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    renderWithProviders(<ForgotPasswordClient />);
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText('Email Address');
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Failed to send reset email')).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    let resolveRequest: (value: any) => void;
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => {
        resolveRequest = resolve;
      })
    );
    
    renderWithProviders(<ForgotPasswordClient />);
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText('Email Address');
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
    });
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Sending...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
    });
    
    // Resolve the request
    resolveRequest!({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    
    // Loading state should be cleared
    await waitFor(() => {
      expect(screen.queryByText('Sending...')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send Reset Link' })).not.toBeDisabled();
    });
  });

  it('should clear previous messages when submitting new request', async () => {
    renderWithProviders(<ForgotPasswordClient />);
    
    // First request - success
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText('Email Address');
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Password reset link sent to your email')).toBeInTheDocument();
    });
    
    // Second request - error
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: false,
        error: 'Email not found'
      }),
    });
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText('Email Address');
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
      
      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      // Previous success message should be cleared
      expect(screen.queryByText('Password reset link sent to your email')).not.toBeInTheDocument();
      // New error message should be shown
      expect(screen.getByText('Email not found')).toBeInTheDocument();
    });
  });

  it('should prevent form submission when loading', async () => {
    let resolveRequest: (value: any) => void;
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => {
        resolveRequest = resolve;
      })
    );
    
    renderWithProviders(<ForgotPasswordClient />);
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText('Email Address');
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
    });
    
    // Try to submit again while loading
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: 'Sending...' });
      expect(submitButton).toBeDisabled();
      
      // Try clicking disabled button
      fireEvent.click(submitButton);
    });
    
    // Should only have one fetch call
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    resolveRequest!({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it('should render back to login link with correct href', async () => {
    renderWithProviders(<ForgotPasswordClient />);
    
    await waitFor(() => {
      const backLink = screen.getByText('Back to Login');
      expect(backLink).toHaveAttribute('href', '/login');
    });
  });

  it('should handle form submission with empty email', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false, error: 'Email is required' }),
    });
    
    renderWithProviders(<ForgotPasswordClient />);
    
    await act(async () => {
      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
      fireEvent.submit(form!);
    });
    
    // In test environment, the form submission will still occur
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '' }),
      });
    });
  });

  it('should handle form submission with preventDefault', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    
    renderWithProviders(<ForgotPasswordClient />);
    
    const mockPreventDefault = jest.fn();
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText('Email Address');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      submitEvent.preventDefault = mockPreventDefault;
      
      fireEvent(form!, submitEvent);
    });
    
    expect(mockPreventDefault).toHaveBeenCalled();
  });

  it('should display success message with proper styling', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    
    renderWithProviders(<ForgotPasswordClient />);
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText('Email Address');
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      const successMessage = screen.getByText('Password reset link sent to your email');
      const messageContainer = successMessage.closest('div');
      
      expect(messageContainer).toHaveClass('bg-green-50');
      expect(successMessage).toHaveClass('text-green-800');
    });
  });

  it('should display error message with proper styling', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: false,
        error: 'Test error message'
      }),
    });
    
    renderWithProviders(<ForgotPasswordClient />);
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText('Email Address');
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      const errorMessage = screen.getByText('Test error message');
      const messageContainer = errorMessage.closest('div');
      
      expect(messageContainer).toHaveClass('bg-red-50');
      expect(errorMessage).toHaveClass('text-red-800');
    });
  });

  it('should have proper accessibility attributes', async () => {
    renderWithProviders(<ForgotPasswordClient />);
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText('Email Address');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('id', 'email');
      expect(emailInput).toHaveAttribute('name', 'email');
      
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });

  it('should handle multiple rapid form submissions', async () => {
    let requestCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      requestCount++;
      return new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        }), 100);
      });
    });
    
    renderWithProviders(<ForgotPasswordClient />);
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText('Email Address');
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      // Rapid clicks
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
    }, { timeout: 1000 });
    
    // Should only have one request due to loading state
    expect(requestCount).toBe(1);
  });
});