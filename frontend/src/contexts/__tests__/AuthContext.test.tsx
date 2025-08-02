/**
 * AuthContext Tests
 * 提升覆蓋率從 38.92% 到 80%+
 */

import React from 'react';
import { render, renderHook, act, waitFor, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush
  }))
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation()
};

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock CustomEvent and dispatchEvent
const mockDispatchEvent = jest.fn();
window.dispatchEvent = mockDispatchEvent;

describe('AuthContext', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    role: 'student',
    name: 'Test User'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    consoleSpy.error.mockClear();
  });

  describe('AuthProvider', () => {
    it('should provide auth context to children', () => {
      const TestComponent = () => {
        const auth = useAuth();
        return <div>{auth.isLoading ? 'Loading' : 'Ready'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByText('Loading')).toBeInTheDocument();
    });

    it('should throw error when useAuth is used outside AuthProvider', () => {
      const TestComponent = () => {
        useAuth();
        return null;
      };

      // Prevent error from propagating
      const spy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => render(<TestComponent />)).toThrow('useAuth must be used within an AuthProvider');
      
      spy.mockRestore();
    });
  });

  describe('Initial State and Loading', () => {
    it('should initialize with loading state', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: false })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isLoggedIn).toBe(false);
      expect(result.current.user).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should restore user from localStorage on init', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: mockUser })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      // Should set user from localStorage immediately
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoggedIn).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('checkAuth', () => {
    it('should check authentication status successfully', async () => {
      // Mock initial check to prevent errors
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: false })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            authenticated: true, 
            user: mockUser,
            tokenExpiringSoon: false 
          })
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/check', {
        credentials: 'include'
      });
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoggedIn).toBe(true);
      expect(result.current.tokenExpiringSoon).toBe(false);
    });

    it('should handle token expiring soon', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          authenticated: true, 
          user: mockUser,
          tokenExpiringSoon: true 
        })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(result.current.tokenExpiringSoon).toBe(true);
    });

    it('should clear auth state when not authenticated', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: false })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isLoggedIn).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('isLoggedIn');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ai_square_session');
    });

    it('should handle API errors and fallback to localStorage', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(consoleSpy.error).toHaveBeenCalledWith('Error checking auth:', expect.any(Error));
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoggedIn).toBe(true);
    });

    it('should handle invalid JSON in localStorage', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return 'invalid json';
        return null;
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isLoggedIn).toBe(false);
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          user: mockUser,
          sessionToken: 'test-token' 
        })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: true
        });
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: true
        })
      });

      expect(loginResult).toEqual({ success: true, user: mockUser });
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoggedIn).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('ai_square_session', 'test-token');
    });

    it('should login successfully without session token', async () => {
      // Initial auth check
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: false })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            user: mockUser
            // No sessionToken
          })
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login({
          email: 'test@example.com',
          password: 'password123'
        });
      });

      expect(loginResult).toEqual({ success: true, user: mockUser });
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoggedIn).toBe(true);
      // Should not set session token if not provided
      expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith('ai_square_session', expect.anything());
    });

    it('should handle login failure', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: false })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: false, 
            error: 'Invalid credentials' 
          })
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login({
          email: 'test@example.com',
          password: 'wrong'
        });
      });

      expect(loginResult).toEqual({ success: false, error: 'Invalid credentials' });
      expect(result.current.user).toBeNull();
      expect(result.current.isLoggedIn).toBe(false);
    });

    it('should handle login failure without error message', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: false })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: false
            // No error message
          })
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login({
          email: 'test@example.com',
          password: 'wrong'
        });
      });

      expect(loginResult).toEqual({ success: false, error: 'Login failed' });
    });

    it('should handle network errors during login', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login({
          email: 'test@example.com',
          password: 'password'
        });
      });

      expect(loginResult).toEqual({ success: false, error: 'Network error' });
      expect(consoleSpy.error).toHaveBeenCalledWith('Login error:', expect.any(Error));
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Setup logged in state
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: true, user: mockUser })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      expect(result.current.user).toBeNull();
      expect(result.current.isLoggedIn).toBe(false);
      expect(mockPush).toHaveBeenCalledWith('/login');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('isLoggedIn');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ai_square_session');
    });

    it('should handle logout API errors gracefully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: true, user: mockUser })
        })
        .mockRejectedValueOnce(new Error('Logout failed'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(consoleSpy.error).toHaveBeenCalledWith('Logout error:', expect.any(Error));
      // Should still clear local state
      expect(result.current.user).toBeNull();
      expect(result.current.isLoggedIn).toBe(false);
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: true, user: mockUser })
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      let refreshResult;
      await act(async () => {
        refreshResult = await result.current.refreshToken();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      expect(refreshResult).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should handle refresh token failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      let refreshResult;
      await act(async () => {
        refreshResult = await result.current.refreshToken();
      });

      expect(refreshResult).toBe(false);
    });

    it('should handle network errors during refresh', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      let refreshResult;
      await act(async () => {
        refreshResult = await result.current.refreshToken();
      });

      expect(refreshResult).toBe(false);
      expect(consoleSpy.error).toHaveBeenCalledWith('Token refresh error:', expect.any(Error));
    });
  });

  describe('Storage Events', () => {
    it('should handle storage change events from other tabs', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: false })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate storage change from another tab
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      // Create real storage event handler
      let storageHandler: ((e: StorageEvent) => void) | null = null;
      const originalAddEventListener = window.addEventListener;
      window.addEventListener = jest.fn((event: string, handler: any) => {
        if (event === 'storage') {
          storageHandler = handler;
        }
      });

      // Re-render to attach event listener
      const { unmount } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      act(() => {
        if (storageHandler) {
          const event = new StorageEvent('storage', {
            key: 'user',
            newValue: JSON.stringify(mockUser),
            oldValue: null,
            storageArea: localStorage,
            url: window.location.href
          });
          storageHandler(event);
        }
      });

      // Cleanup
      unmount();
      window.addEventListener = originalAddEventListener;
    });

    it('should handle clearing auth from storage events', async () => {
      // Start with logged in state
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: mockUser })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isLoggedIn).toBe(true);
      });

      // Simulate logout from another tab
      let storageHandler: ((e: StorageEvent) => void) | null = null;
      const originalAddEventListener = window.addEventListener;
      window.addEventListener = jest.fn((event: string, handler: any) => {
        if (event === 'storage') {
          storageHandler = handler;
        }
      });

      // Re-render to attach event listener
      renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      // Clear localStorage
      mockLocalStorage.getItem.mockReturnValue(null);

      act(() => {
        if (storageHandler) {
          const event = new StorageEvent('storage', {
            key: 'isLoggedIn',
            newValue: null,
            oldValue: 'true',
            storageArea: localStorage,
            url: window.location.href
          });
          storageHandler(event);
        }
      });

      window.addEventListener = originalAddEventListener;
    });

    it('should handle auth-changed custom events', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: false })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      act(() => {
        const event = new CustomEvent('auth-changed');
        window.dispatchEvent(event);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoggedIn).toBe(true);
    });

    it('should handle invalid user data in storage events', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: false })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return 'invalid json';
        return null;
      });

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'user',
          newValue: 'invalid json'
        });
        window.dispatchEvent(event);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isLoggedIn).toBe(false);
    });
  });

  describe('Auto Token Refresh', () => {
    it('should auto-refresh token when expiring soon', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            authenticated: true, 
            user: mockUser,
            tokenExpiringSoon: true 
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: true, user: mockUser })
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.tokenExpiringSoon).toBe(true);
      });

      // Should trigger auto refresh
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include'
        });
      });
    });
  });

  describe('updateAuthState and clearAuthState', () => {
    it('should dispatch auth-changed event when updating auth state', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: false })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Login to trigger updateAuthState
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, user: mockUser })
      });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password'
        });
      });

      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
    });

    it('should dispatch auth-changed event when clearing auth state', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: mockUser })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear auth state
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: false })
      });

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
    });
  });

  describe('Error Scenarios', () => {
    it('should handle non-ok response in checkAuth', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isLoggedIn).toBe(false);
    });

    it('should handle auth check failure after token refresh', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: false
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      const refreshResult = await act(async () => {
        return await result.current.refreshToken();
      });

      expect(refreshResult).toBe(true); // Refresh succeeded
      expect(consoleSpy.error).toHaveBeenCalledWith('Auth check after refresh failed:', expect.any(Error));
    });
  });
});