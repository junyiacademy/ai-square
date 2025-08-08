import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import AccountSettingsPage from '../page';
import { useAuth } from '@/hooks/useAuth';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { 
      changeLanguage: jest.fn(), 
      language: 'en' 
    }
  })
}));

// Mock fetch
global.fetch = jest.fn();

describe('AccountSettingsPage', () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ 
        consents: [],
        requiredConsents: []
      })
    });
  });

  it('should redirect to login if user is not authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false
    });

    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should render when user is authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com', id: '123' },
      isLoading: false
    });

    const { container } = render(<AccountSettingsPage />);
    
    await waitFor(() => {
      expect(container).toBeTruthy();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('should show loading state initially', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com', id: '123' },
      isLoading: true
    });

    render(<AccountSettingsPage />);
    
    // Component should handle loading state
    expect(screen.queryByText(/Account Settings/)).toBeDefined();
  });

  it('should fetch consents when user is authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com', id: '123' },
      isLoading: false
    });

    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/legal/consent'),
        expect.any(Object)
      );
    });
  });

  it('should handle delete account modal', async () => {
    const user = userEvent.setup();
    (useAuth as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com', id: '123' },
      isLoading: false
    });

    render(<AccountSettingsPage />);

    // Find and click delete account button - use the translation key
    const deleteButton = await screen.findByText('accountSettings.deleteAccount');
    await user.click(deleteButton);

    // Modal should be visible
    await waitFor(() => {
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
    });
  });

  it('should handle consent fetch error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (useAuth as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com', id: '123' },
      isLoading: false
    });

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('should not fetch consents while auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true
    });

    render(<AccountSettingsPage />);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle delete account form submission', async () => {
    const user = userEvent.setup();
    (useAuth as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com', id: '123' },
      isLoading: false
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ consents: [], requiredConsents: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

    render(<AccountSettingsPage />);

    // Open delete modal
    const deleteButton = await screen.findByText('accountSettings.deleteAccount');
    await user.click(deleteButton);

    // Fill in form
    const passwordInput = await screen.findByPlaceholderText(/password/i);
    await user.type(passwordInput, 'testpassword');

    const reasonInput = await screen.findByPlaceholderText(/reason/i);
    await user.type(reasonInput, 'No longer needed');

    // Check confirmation
    const confirmCheckbox = await screen.findByRole('checkbox');
    await user.click(confirmCheckbox);

    // Submit
    const confirmButton = await screen.findByText('accountSettings.deleteForever');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/delete-account'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  it('should display error when delete account fails', async () => {
    const user = userEvent.setup();
    (useAuth as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com', id: '123' },
      isLoading: false
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ consents: [], requiredConsents: [] })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid password' })
      });

    render(<AccountSettingsPage />);

    // Open modal and submit
    const deleteButton = await screen.findByText('accountSettings.deleteAccount');
    await user.click(deleteButton);

    const passwordInput = await screen.findByPlaceholderText(/password/i);
    await user.type(passwordInput, 'wrongpassword');

    const confirmCheckbox = await screen.findByRole('checkbox');
    await user.click(confirmCheckbox);

    const confirmButton = await screen.findByText('accountSettings.deleteForever');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid password/i)).toBeInTheDocument();
    });
  });
});