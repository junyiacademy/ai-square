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
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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

  const login = useCallback(async (credentials: { email: string; password: string }) => {
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

  // Initial auth check
  useEffect(() => {
    checkAuth()
  }, [])

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

  return {
    user,
    isLoggedIn,
    isLoading,
    login,
    logout,
    checkAuth,
  }
}