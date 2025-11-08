'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';

interface User {
  id: number;
  email: string;
  role: string;
  name: string;
  isGuest?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  tokenExpiringSoon: boolean;
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    setTokenExpiringSoon(false);
    window.dispatchEvent(new CustomEvent('auth-changed'));
  }, []);

  const updateAuthState = useCallback((userData: User) => {
    setUser(userData);
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify(userData));
    window.dispatchEvent(new CustomEvent('auth-changed'));
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/auth/check');

      if (!response.ok) {
        // API 失敗，清除所有狀態
        clearAuthState();
        return;
      }

      const data = await response.json();

      if (data.authenticated && data.user) {
        updateAuthState(data.user);
        setTokenExpiringSoon(data.tokenExpiringSoon || false);
      } else {
        clearAuthState();
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      // 網路錯誤或其他問題，清除狀態以確保安全
      clearAuthState();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthState, updateAuthState]);

  const login = useCallback(async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
    try {
      const response = await authenticatedFetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success && data.user) {
        updateAuthState(data.user);

        // Note: sessionToken is stored in httpOnly cookie, not localStorage
        // Remove the old session token from localStorage if it exists
        localStorage.removeItem('ai_square_session');

        // Dispatch a custom event to notify all components about successful login
        window.dispatchEvent(new CustomEvent('login-success', { detail: { user: data.user } }));

        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  }, [updateAuthState]);

  const logout = useCallback(async () => {
    try {
      await authenticatedFetch('/api/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    clearAuthState();
    router.push('/login');
  }, [clearAuthState, router]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await authenticatedFetch('/api/auth/refresh', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Inline auth check to avoid dependency issues
          try {
            const checkResponse = await authenticatedFetch('/api/auth/check');

            if (!checkResponse.ok) {
              throw new Error('Auth check failed');
            }

            const checkData = await checkResponse.json();

            if (checkData.authenticated && checkData.user) {
              updateAuthState(checkData.user);
              setTokenExpiringSoon(checkData.tokenExpiringSoon || false);
            } else {
              clearAuthState();
            }
          } catch (checkError) {
            console.error('Auth check after refresh failed:', checkError);
          }
          return true;
        }
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    }

    return false;
  }, [updateAuthState, clearAuthState]);

  // 初始化時檢查登入狀態
  useEffect(() => {
    const initializeAuth = async () => {
      // 直接進行 API 驗證，這是唯一的真實來源
      // 不依賴 localStorage 來設置初始狀態，避免不同步問題
      setIsLoading(true);

      try {
        const response = await authenticatedFetch('/api/auth/check');

        if (!response.ok) {
          clearAuthState();
          return;
        }

        const data = await response.json();

        if (data.authenticated && data.user) {
          updateAuthState(data.user);
          setTokenExpiringSoon(data.tokenExpiringSoon || false);
        } else {
          clearAuthState();
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        clearAuthState();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [clearAuthState, updateAuthState]); // Dependencies that don't change

  // 監聽其他 tab 的登入狀態變化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isLoggedIn' || e.key === 'user') {
        const newLoggedInStatus = localStorage.getItem('isLoggedIn');
        const newUserData = localStorage.getItem('user');

        if (newLoggedInStatus === 'true' && newUserData) {
          try {
            const parsedUser = JSON.parse(newUserData);
            setUser(parsedUser);
            setIsLoggedIn(true);
          } catch {
            // Clear state without triggering another event
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('user');
            localStorage.removeItem('ai_square_session');
            setUser(null);
            setIsLoggedIn(false);
            setTokenExpiringSoon(false);
          }
        } else {
          // Clear state without triggering another event
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('user');
          localStorage.removeItem('ai_square_session');
          setUser(null);
          setIsLoggedIn(false);
          setTokenExpiringSoon(false);
        }
      }
    };

    const handleAuthChange = () => {
      // 當其他組件觸發 auth-changed 事件時，重新檢查狀態
      const storedAuth = localStorage.getItem('isLoggedIn');
      const storedUser = localStorage.getItem('user');

      if (storedAuth === 'true' && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsLoggedIn(true);
        } catch {
          // Clear state without triggering another event
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('user');
          localStorage.removeItem('ai_square_session');
          setUser(null);
          setIsLoggedIn(false);
          setTokenExpiringSoon(false);
        }
      } else {
        // Clear state without triggering another event
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user');
        localStorage.removeItem('ai_square_session');
        setUser(null);
        setIsLoggedIn(false);
        setTokenExpiringSoon(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-changed', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleAuthChange);
    };
  }, [clearAuthState]);

  // Token 快過期時自動刷新
  useEffect(() => {
    if (tokenExpiringSoon && isLoggedIn) {
      refreshToken();
    }
  }, [tokenExpiringSoon, isLoggedIn, refreshToken]);

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
