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
      const response = await fetch('/api/auth/check', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Auth check failed');
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
      
      // Fallback to localStorage only if API fails
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
    }
  }, [clearAuthState, updateAuthState]);

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

      if (data.success && data.user) {
        updateAuthState(data.user);
        
        if (data.sessionToken) {
          localStorage.setItem('ai_square_session', data.sessionToken);
        }
        
        return { success: true };
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
          await checkAuth();
          return true;
        }
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    }
    
    return false;
  }, [checkAuth]);

  // 初始化時檢查登入狀態
  useEffect(() => {
    // 先從 localStorage 快速設置狀態，避免 UI 閃動
    const storedAuth = localStorage.getItem('isLoggedIn');
    const storedUser = localStorage.getItem('user');
    
    if (storedAuth === 'true' && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Error parsing stored user:', error);
      }
    }
    
    // 然後進行 API 驗證
    checkAuth();
  }, [checkAuth]);

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
            clearAuthState();
          }
        } else {
          clearAuthState();
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
          clearAuthState();
        }
      } else {
        clearAuthState();
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