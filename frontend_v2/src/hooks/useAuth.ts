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
    setUser(null)
    setIsLoggedIn(false)
    window.dispatchEvent(new CustomEvent('auth-changed'))
  }, [])

  const checkAuth = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/check')
      const data = await response.json()
      
      if (data.authenticated && data.user) {
        setUser(data.user)
        setIsLoggedIn(true)
        setTokenExpiringSoon(data.tokenExpiringSoon || false)
        // Sync to localStorage for compatibility
        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('user', JSON.stringify(data.user))
      } else {
        clearAuthState()
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
          clearAuthState()
        }
      } else {
        clearAuthState()
      }
    } finally {
      setIsLoading(false)
    }
  }, [clearAuthState])

  const login = useCallback(async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        setIsLoggedIn(true)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('isLoggedIn', 'true')
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
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Token refreshed successfully, re-check auth
          await checkAuth()
          return true
        }
      }
    } catch (error) {
      console.error('Token refresh error:', error)
    }
    
    return false
  }, [checkAuth])

  // Initial auth check
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Listen for auth changes
  useEffect(() => {
    const handleAuthChange = () => {
      checkAuth()
    }

    window.addEventListener('auth-changed', handleAuthChange)
    window.addEventListener('storage', handleAuthChange)

    return () => {
      window.removeEventListener('auth-changed', handleAuthChange)
      window.removeEventListener('storage', handleAuthChange)
    }
  }, [checkAuth])
  
  // Auto-refresh token when expiring soon
  useEffect(() => {
    if (tokenExpiringSoon && isLoggedIn) {
      refreshToken()
    }
  }, [tokenExpiringSoon, isLoggedIn, refreshToken])
  
  // Set up periodic auth check (every 5 minutes)
  useEffect(() => {
    if (!isLoggedIn) return
    
    const interval = setInterval(() => {
      checkAuth()
    }, 5 * 60 * 1000) // 5 minutes
    
    return () => clearInterval(interval)
  }, [isLoggedIn, checkAuth])

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