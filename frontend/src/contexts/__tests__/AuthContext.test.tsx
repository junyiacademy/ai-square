/**
 * Tests for AuthContext - Auth State Synchronization
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Test component that uses useAuth
function TestComponent() {
  const { user, isLoggedIn, login } = useAuth();
  
  return (
    <div>
      <div data-testid="login-status">{isLoggedIn ? 'Logged In' : 'Not Logged In'}</div>
      <div data-testid="user-email">{user?.email || 'No User'}</div>
      <button onClick={() => login({ email: 'test@example.com', password: 'test123' })}>
        Login
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    localStorage.clear();
    
    // Mock successful auth check
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/auth/check') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            authenticated: false,
            user: null 
          }),
        });
      }
      if (url === '/api/auth/login') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            user: {
              id: 1,
              email: 'test@example.com',
              role: 'student',
              name: 'Test User'
            },
            sessionToken: 'test-token'
          }),
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  it('should initialize with logged out state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('login-status')).toHaveTextContent('Not Logged In');
      expect(screen.getByTestId('user-email')).toHaveTextContent('No User');
    });
  });

  it('should update state immediately after successful login', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Initial state
    expect(screen.getByTestId('login-status')).toHaveTextContent('Not Logged In');
    
    // Click login button
    const loginButton = screen.getByText('Login');
    
    await act(async () => {
      loginButton.click();
    });
    
    // After login, state should be updated immediately
    await waitFor(() => {
      expect(screen.getByTestId('login-status')).toHaveTextContent('Logged In');
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    });
    
    // Check localStorage was updated
    expect(localStorage.getItem('isLoggedIn')).toBe('true');
    expect(localStorage.getItem('user')).toBeTruthy();
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    expect(storedUser.email).toBe('test@example.com');
  });

  it('should trigger auth-changed event after login', async () => {
    const authChangedHandler = jest.fn();
    window.addEventListener('auth-changed', authChangedHandler);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    const loginButton = screen.getByText('Login');
    
    await act(async () => {
      loginButton.click();
    });
    
    await waitFor(() => {
      expect(authChangedHandler).toHaveBeenCalled();
    });
    
    window.removeEventListener('auth-changed', authChangedHandler);
  });

  it('should persist login state from localStorage on mount', async () => {
    // Set localStorage before rendering
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify({
      id: 1,
      email: 'cached@example.com',
      role: 'student',
      name: 'Cached User'
    }));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Should immediately show logged in state from localStorage
    expect(screen.getByTestId('login-status')).toHaveTextContent('Logged In');
    expect(screen.getByTestId('user-email')).toHaveTextContent('cached@example.com');
  });

  it('should handle auth check API validation', async () => {
    // Mock auth check to return authenticated
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/auth/check') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            authenticated: true,
            user: {
              id: 1,
              email: 'api@example.com',
              role: 'student',
              name: 'API User'
            }
          }),
        });
      }
      return Promise.reject(new Error('Not found'));
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Should update from API check
    await waitFor(() => {
      expect(screen.getByTestId('login-status')).toHaveTextContent('Logged In');
      expect(screen.getByTestId('user-email')).toHaveTextContent('api@example.com');
    });
  });
});