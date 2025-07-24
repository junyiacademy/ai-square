'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  role: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  tokenExpiringSoon: boolean;
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Global flag to prevent multiple auth checks
let isAuthCheckInProgress = false;
let lastAuthCheck = 0;
const AUTH_CHECK_DEBOUNCE = 1000; // 1 second debounce

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenExpiringSoon, setTokenExpiringSoon] = useState(false);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('ai_square_session');
    setUser(null);
    setIsLoggedIn(false);
    window.dispatchEvent(new CustomEvent('auth-changed'));
  }, []);

  const checkAuth = useCallback(async () => {
    // Debounce auth checks to prevent rapid fire
    const now = Date.now();
    if (isAuthCheckInProgress || (now - lastAuthCheck) < AUTH_CHECK_DEBOUNCE) {
      return;
    }

    isAuthCheckInProgress = true;
    lastAuthCheck = now;
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/check', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        setUser(data.user);
        setIsLoggedIn(true);
        setTokenExpiringSoon(data.tokenExpiringSoon || false);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        clearAuthState();
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      // Fallback to localStorage
      const storedAuth = localStorage.getItem('isLoggedIn');
      const storedUser = localStorage.getItem('user');
      
      if (storedAuth === 'true' && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsLoggedIn(true);
        } catch {
          clearAuthState();
        }
      } else {
        clearAuthState();
      }
    } finally {
      setIsLoading(false);
      isAuthCheckInProgress = false;
    }
  }, [clearAuthState]);

  const login = useCallback(async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setIsLoggedIn(true);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('isLoggedIn', 'true');
        
        if (data.sessionToken) {
          localStorage.setItem('ai_square_session', data.sessionToken);
        }
        
        window.dispatchEvent(new CustomEvent('auth-changed'));
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    clearAuthState();
    router.push('/login');
  }, [clearAuthState, router]);
  
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Use the existing checkAuth to update state
          await checkAuth();
          return true;
        }
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    }
    
    return false;
  }, [checkAuth]);

  // Initial auth check - only once
  useEffect(() => {
    checkAuth();
  }, []);

  // Auto-refresh token when expiring soon
  useEffect(() => {
    if (tokenExpiringSoon && isLoggedIn) {
      refreshToken();
    }
  }, [tokenExpiringSoon, isLoggedIn, refreshToken]);
  
  // Set up periodic auth check (every 5 minutes) - only when logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    
    const interval = setInterval(() => {
      checkAuth();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [isLoggedIn, checkAuth]);

  const value: AuthContextType = {
    user,
    isLoggedIn,
    isLoading,
    tokenExpiringSoon,
    login,
    logout,
    checkAuth,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}