'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'

interface User {
  id: number
  email: string
  role: string
  name: string
}

export function Header() {
  const { t } = useTranslation('auth')
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // 使用 useCallback 確保函數引用穩定，避免 hooks 順序問題
  const clearAuthState = useCallback(() => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('user')
    setUser(null)
    setIsLoggedIn(false)
    // 觸發自定義事件通知其他組件
    window.dispatchEvent(new CustomEvent('auth-changed'))
  }, [])

  const handleLogout = useCallback(() => {
    clearAuthState()
    router.push('/login')
  }, [clearAuthState, router])

  const handleLogin = useCallback(() => {
    router.push('/login')
  }, [router])

  // 檢查登入狀態的函數
  const checkAuthStatus = useCallback(() => {
    const loggedInStatus = localStorage.getItem('isLoggedIn')
    const userData = localStorage.getItem('user')

    if (loggedInStatus === 'true' && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        setIsLoggedIn(true)
      } catch (error) {
        console.error('Error parsing user data:', error)
        clearAuthState()
      }
    } else {
      setUser(null)
      setIsLoggedIn(false)
    }
  }, [clearAuthState])

  useEffect(() => {
    checkAuthStatus()

    // 監聽 storage 變化 (當其他 tab 登入/登出時)
    const handleStorageChange = () => {
      checkAuthStatus()
    }

    // 監聽自定義的登入狀態變化事件 (同一 tab 內)
    const handleAuthChange = () => {
      checkAuthStatus()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('auth-changed', handleAuthChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-changed', handleAuthChange)
    }
  }, [checkAuthStatus])

  const getRoleDisplayName = (role: string) => {
    const roleMap: { [key: string]: string } = {
      student: '學生',
      teacher: '教師',
      admin: '管理員'
    }
    return roleMap[role] || role
  }

  return (
    <header 
      role="banner" 
      className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo 區域 */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <svg 
                    className="h-5 w-5 text-white" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900">AI Square</h1>
              </div>
            </div>
          </div>

          {/* 導航區域 */}
          <nav role="navigation" className="flex items-center space-x-4">
            {isLoggedIn && user ? (
              /* 已登入狀態 */
              <div className="flex items-center space-x-4">
                {/* 用戶資訊 */}
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {user.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getRoleDisplayName(user.role)}
                    </div>
                  </div>
                  
                  {/* 用戶頭像 */}
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* 登出按鈕 */}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  aria-label="Sign out"
                >
                  <svg 
                    className="h-4 w-4 mr-2" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                    />
                  </svg>
                  <span className="hidden sm:inline">Sign out</span>
                  <span className="sm:hidden">登出</span>
                </button>
              </div>
            ) : (
              /* 未登入狀態 */
              <button
                onClick={handleLogin}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                aria-label="Sign in"
              >
                Sign in
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* 移動端用戶資訊 (當登入時顯示) */}
      {isLoggedIn && user && (
        <div className="sm:hidden bg-gray-50 border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">
                {user.email}
              </div>
              <div className="text-xs text-gray-500">
                {getRoleDisplayName(user.role)}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}