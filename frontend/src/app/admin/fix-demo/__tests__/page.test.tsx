/**
 * Unit tests for Admin Fix Demo page
 * Tests administrative demo account fix interface
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FixDemoAccountsPage from '../page';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('FixDemoAccountsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        message: 'Demo accounts fixed successfully',
        results: [
          { email: 'student@example.com', action: 'created', role: 'student' },
          { email: 'teacher@example.com', action: 'updated', role: 'teacher' },
          { email: 'admin@example.com', action: 'updated', role: 'admin' }
        ],
        verification: [
          { email: 'student@example.com', role: 'student', password_status: 'set', email_verified: true },
          { email: 'teacher@example.com', role: 'teacher', password_status: 'set', email_verified: true },
          { email: 'admin@example.com', role: 'admin', password_status: 'set', email_verified: true }
        ],
        credentials: {
          student: 'student@example.com / student123',
          teacher: 'teacher@example.com / teacher123',
          admin: 'admin@example.com / admin123'
        }
      }),
    });
  });

  it('should render the admin fix demo interface', () => {
    render(<FixDemoAccountsPage />);

    expect(screen.getByRole('heading', { name: 'Fix Demo Accounts' })).toBeInTheDocument();
    expect(screen.getByText('This tool will reset the demo accounts with proper passwords.')).toBeInTheDocument();
  });

  it('should show fix demo button', () => {
    render(<FixDemoAccountsPage />);

    expect(screen.getByRole('button', { name: 'Fix Demo Accounts' })).toBeInTheDocument();
  });

  it('should handle demo fix operation', async () => {
    render(<FixDemoAccountsPage />);

    const fixButton = screen.getByRole('button', { name: 'Fix Demo Accounts' });
    fireEvent.click(fixButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/fix-demo-accounts',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secretKey: 'fix-demo-accounts-2025' })
        })
      );
    });
  });

  it('should show loading state during fix operation', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      }), 100))
    );

    render(<FixDemoAccountsPage />);

    const fixButton = screen.getByRole('button', { name: 'Fix Demo Accounts' });
    fireEvent.click(fixButton);

    // Should show loading state
    expect(screen.getByText('Fixing Demo Accounts...')).toBeInTheDocument();
    expect(fixButton).toBeDisabled();
  });

  it('should handle fix errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Fix operation failed' }),
    });

    render(<FixDemoAccountsPage />);

    const fixButton = screen.getByRole('button', { name: 'Fix Demo Accounts' });
    fireEvent.click(fixButton);

    await waitFor(() => {
      expect(screen.getByText('❌ Error')).toBeInTheDocument();
      expect(screen.getByText('Fix operation failed')).toBeInTheDocument();
    });
  });

  it('should show success message after successful fix', async () => {
    render(<FixDemoAccountsPage />);

    const fixButton = screen.getByRole('button', { name: 'Fix Demo Accounts' });
    fireEvent.click(fixButton);

    await waitFor(() => {
      expect(screen.getByText('✅ Success!')).toBeInTheDocument();
      expect(screen.getByText('Actions Performed:')).toBeInTheDocument();
      expect(screen.getByText('Verification:')).toBeInTheDocument();
    });
  });

  it('should show demo account information', () => {
    render(<FixDemoAccountsPage />);

    expect(screen.getByText('Demo Accounts to Fix:')).toBeInTheDocument();
    expect(screen.getByText('• Student: student@example.com / student123')).toBeInTheDocument();
    expect(screen.getByText('• Teacher: teacher@example.com / teacher123')).toBeInTheDocument();
    expect(screen.getByText('• Admin: admin@example.com / admin123')).toBeInTheDocument();
  });

  it('should handle network errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<FixDemoAccountsPage />);

    const fixButton = screen.getByRole('button', { name: 'Fix Demo Accounts' });
    fireEvent.click(fixButton);

    await waitFor(() => {
      expect(screen.getByText('❌ Error')).toBeInTheDocument();
      expect(screen.getByText('Network error: Network error')).toBeInTheDocument();
    });
  });

  it('should show detailed results after successful operation', async () => {
    render(<FixDemoAccountsPage />);

    const fixButton = screen.getByRole('button', { name: 'Fix Demo Accounts' });
    fireEvent.click(fixButton);

    await waitFor(() => {
      // Check actions performed section appears
      expect(screen.getByText('Actions Performed:')).toBeInTheDocument();
      expect(screen.getByText(/student@example.com.*created.*student/)).toBeInTheDocument();
      expect(screen.getByText(/teacher@example.com.*updated.*teacher/)).toBeInTheDocument();

      // Check credentials display
      expect(screen.getByText('You can now login with:')).toBeInTheDocument();
    });
  });

  it('should show admin warning', () => {
    render(<FixDemoAccountsPage />);

    expect(screen.getByText('⚠️ Admin Only:')).toBeInTheDocument();
    expect(screen.getByText(/This tool will reset the demo accounts with proper passwords/)).toBeInTheDocument();
  });

  it('should reset error state when starting new operation', async () => {
    // First, trigger an error
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('First error'));

    render(<FixDemoAccountsPage />);

    const fixButton = screen.getByRole('button', { name: 'Fix Demo Accounts' });
    fireEvent.click(fixButton);

    await waitFor(() => {
      expect(screen.getByText('Network error: First error')).toBeInTheDocument();
    });

    // Now mock a successful response and click again
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, results: [], verification: [], credentials: {} })
    });

    fireEvent.click(fixButton);

    // Error should be cleared - wait for it to disappear
    await waitFor(() => {
      expect(screen.queryByText('Network error: First error')).not.toBeInTheDocument();
    });
  });
});
