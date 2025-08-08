// Unmock the AuthContext for this test file
jest.unmock('./AuthContext');

import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn()
  })
}));

// Test component to access auth context
const TestComponent = () => {
  const { user, isLoggedIn, isLoading, login, logout } = useAuth();
  
  const handleLogin = () => {
    login({ email: 'test@example.com', password: 'password' });
  };
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="logged-in">{isLoggedIn ? 'Logged In' : 'Not Logged In'}</div>
      <div data-testid="user-email">{user?.email || 'No User'}</div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  it('should provide auth context to children', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.getByTestId('logged-in')).toBeInTheDocument();
    expect(screen.getByTestId('user-email')).toBeInTheDocument();
  });

  it('should handle login', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          user: { 
            id: 1,
            email: 'test@example.com',
            role: 'student',
            name: 'Test User'
          },
          accessToken: 'test-token',
          refreshToken: 'refresh-token'
        })
      })
    ) as jest.Mock;

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('logged-in')).toHaveTextContent('Logged In');
    });
  });

  it('should handle logout', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    ) as jest.Mock;

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('No User');
      expect(screen.getByTestId('logged-in')).toHaveTextContent('Not Logged In');
    });
  });

  it('should show initial loading state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
  });

  it('should check auth on mount', async () => {
    // Mock localStorage
    const mockUser = { id: 2, email: 'stored@example.com', role: 'teacher', name: 'Stored User' };
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'isLoggedIn') return 'true';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          authenticated: true, 
          user: mockUser 
        })
      })
    ) as jest.Mock;

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      expect(screen.getByTestId('user-email')).toHaveTextContent('stored@example.com');
    });
  });

  it('should handle login failure', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ 
          success: false, 
          error: 'Invalid credentials' 
        })
      })
    ) as jest.Mock;

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('No User');
      expect(screen.getByTestId('logged-in')).toHaveTextContent('Not Logged In');
    });

    consoleError.mockRestore();
  });

  it('should throw error when used outside provider', () => {
    // Suppress console errors for this test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create a component that uses useAuth outside provider
    const TestComponentOutsideProvider = () => {
      useAuth();
      return <div>Should not render</div>;
    };

    // Expect the render to throw an error
    expect(() => {
      render(<TestComponentOutsideProvider />);
    }).toThrow('useAuth must be used within an AuthProvider');

    spy.mockRestore();
  });
});