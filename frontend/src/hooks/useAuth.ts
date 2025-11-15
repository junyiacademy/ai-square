import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  email: string
  role: string
  name: string
}

interface UseAuthReturn {
  user: User | null
  isLoggedIn: boolean
  isLoading: boolean
  tokenExpiringSoon: boolean
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  refreshToken: () => Promise<boolean>
}

export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [tokenExpiringSoon, setTokenExpiringSoon] = useState(false)

  const clearAuthState = useCallback(() => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('user')
    localStorage.removeItem('ai_square_session')
    setUser(null)
    setIsLoggedIn(false)
    window.dispatchEvent(new CustomEvent('auth-changed'))
  }, [])

  const checkAuth = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/check', {
        credentials: 'include' // Include cookies for authentication
      })
      const data = await response.json()

      if (data.authenticated && data.user) {
        setUser(data.user)
        setIsLoggedIn(true)
        setTokenExpiringSoon(data.tokenExpiringSoon || false)
        // Sync to localStorage for compatibility
        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('user', JSON.stringify(data.user))
      } else {
        // Clear auth state inline to avoid dependency issues
        localStorage.removeItem('isLoggedIn')
        localStorage.removeItem('user')
        localStorage.removeItem('ai_square_session')
        setUser(null)
        setIsLoggedIn(false)
        window.dispatchEvent(new CustomEvent('auth-changed'))
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      // Fallback to localStorage
      const storedAuth = localStorage.getItem('isLoggedIn')
      const storedUser = localStorage.getItem('user')

      if (storedAuth === 'true' && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          setUser(parsedUser)
          setIsLoggedIn(true)
        } catch {
          // Clear auth state inline
          localStorage.removeItem('isLoggedIn')
          localStorage.removeItem('user')
          localStorage.removeItem('ai_square_session')
          setUser(null)
          setIsLoggedIn(false)
          window.dispatchEvent(new CustomEvent('auth-changed'))
        }
      } else {
        // Clear auth state inline
        localStorage.removeItem('isLoggedIn')
        localStorage.removeItem('user')
        localStorage.removeItem('ai_square_session')
        setUser(null)
        setIsLoggedIn(false)
        window.dispatchEvent(new CustomEvent('auth-changed'))
      }
    } finally {
      setIsLoading(false)
    }
  }, []) // Remove clearAuthState dependency to prevent infinite loops

  const login = useCallback(async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        setIsLoggedIn(true)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('isLoggedIn', 'true')

        // Store session token if provided
        if (data.sessionToken) {
          localStorage.setItem('ai_square_session', data.sessionToken)
        }

        window.dispatchEvent(new CustomEvent('auth-changed'))
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error' }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include' // Include cookies for authentication
      })
    } catch (error) {
      console.error('Logout error:', error)
    }

    clearAuthState()
    router.push('/login')
  }, [clearAuthState, router])

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include' // Include cookies for authentication
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Token refreshed successfully - inline auth check to break circular dependency
          try {
            const checkResponse = await fetch('/api/auth/check', {
              credentials: 'include'
            })
            const checkData = await checkResponse.json()

            if (checkData.authenticated && checkData.user) {
              setUser(checkData.user)
              setIsLoggedIn(true)
              setTokenExpiringSoon(checkData.tokenExpiringSoon || false)
              localStorage.setItem('isLoggedIn', 'true')
              localStorage.setItem('user', JSON.stringify(checkData.user))
            } else {
              localStorage.removeItem('isLoggedIn')
              localStorage.removeItem('user')
              localStorage.removeItem('ai_square_session')
              setUser(null)
              setIsLoggedIn(false)
              window.dispatchEvent(new CustomEvent('auth-changed'))
            }
          } catch (checkError) {
            console.error('Auth check after refresh failed:', checkError)
          }
          return true
        }
      }
    } catch (error) {
      console.error('Token refresh error:', error)
    }

    return false
  }, []) // Remove checkAuth dependency to break circular dependency

  // Initial auth check - run only once on mount
  useEffect(() => {
    checkAuth()
  }, [checkAuth]) // No dependencies - only run once on mount

  // Listen for auth changes - use useRef to avoid dependency issues
  useEffect(() => {
    const handleAuthChange = () => {
      // Debounce auth checks to prevent rapid fire and avoid circular dependencies
      setTimeout(() => {
        // Inline minimal auth check to avoid dependency loops
        fetch('/api/auth/check', { credentials: 'include' })
          .then(response => response.json())
          .then(data => {
            if (data.authenticated && data.user) {
              setUser(data.user);
              setIsLoggedIn(true);
              setTokenExpiringSoon(data.tokenExpiringSoon || false);
            } else {
              setUser(null);
              setIsLoggedIn(false);
              setTokenExpiringSoon(false);
            }
          })
          .catch(error => console.error('Auth change check failed:', error));
      }, 100);
    };

    window.addEventListener('auth-changed', handleAuthChange)
    window.addEventListener('storage', handleAuthChange)

    return () => {
      window.removeEventListener('auth-changed', handleAuthChange)
      window.removeEventListener('storage', handleAuthChange)
    }
  }, []) // No dependencies to prevent circular loops

  // Auto-refresh token when expiring soon
  useEffect(() => {
    if (tokenExpiringSoon && isLoggedIn) {
      refreshToken()
    }
  }, [tokenExpiringSoon, isLoggedIn, refreshToken])

  // Set up periodic auth check (every 5 minutes) - only when logged in
  useEffect(() => {
    if (!isLoggedIn) return

    const interval = setInterval(() => {
      // Inline auth check to avoid circular dependency
      fetch('/api/auth/check', { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
          if (data.authenticated && data.user) {
            setUser(data.user);
            setIsLoggedIn(true);
            setTokenExpiringSoon(data.tokenExpiringSoon || false);
          } else {
            setUser(null);
            setIsLoggedIn(false);
            setTokenExpiringSoon(false);
          }
        })
        .catch(error => console.error('Periodic auth check failed:', error));
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [isLoggedIn]) // Only depend on login status

  return {
    user,
    isLoggedIn,
    isLoading,
    tokenExpiringSoon,
    login,
    logout,
    checkAuth,
    refreshToken,
  }
}
