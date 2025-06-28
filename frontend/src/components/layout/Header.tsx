'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { useTheme } from '@/contexts/ThemeContext'

interface User {
  id: number
  email: string
  role: string
  name: string
}

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslation(['navigation'])
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 使用 useCallback 確保函數引用穩定，避免 hooks 順序問題
  const clearAuthState = useCallback(() => {
    // 清除 localStorage (為了相容性)
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('user')
    setUser(null)
    setIsLoggedIn(false)
    // 觸發自定義事件通知其他組件
    window.dispatchEvent(new CustomEvent('auth-changed'))
  }, [])

  const handleLogout = useCallback(async () => {
    // Call logout API to clear cookies
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    // Clear local state
    clearAuthState()
    router.push('/login')
  }, [clearAuthState, router])

  const handleLogin = useCallback(() => {
    router.push('/login')
  }, [router])

  // 檢查登入狀態的函數
  const checkAuthStatus = useCallback(async () => {
    try {
      // 先從服務器檢查認證狀態
      const response = await fetch('/api/auth/check')
      const data = await response.json()
      
      if (data.authenticated && data.user) {
        setUser(data.user)
        setIsLoggedIn(true)
        // 同步到 localStorage (為了相容性)
        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('user', JSON.stringify(data.user))
      } else {
        // 未認證，清除狀態
        clearAuthState()
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
      // 發生錯誤時，fallback 到 localStorage
      const loggedInStatus = localStorage.getItem('isLoggedIn')
      const userData = localStorage.getItem('user')

      if (loggedInStatus === 'true' && userData) {
        try {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
          setIsLoggedIn(true)
        } catch (parseError) {
          console.error('Error parsing user data:', parseError)
          clearAuthState()
        }
      } else {
        clearAuthState()
      }
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
    return t(`userRole.${role}`)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const navLinks = [
    { href: '/relations', label: t('relations') },
    { href: '/ksa', label: t('ksa') },
    { href: '/assessment', label: t('assessment') },
    { href: '/pbl', label: t('pbl') },
    { href: '/history', label: t('history') },
  ]

  // 設置 mounted 狀態
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header 
      role="banner" 
      className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo 區域 */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center">
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
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Square</h1>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:ml-10 md:flex md:space-x-8" aria-label="Main navigation">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'text-gray-900 dark:text-white border-b-2 border-blue-600 active'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* 右側區域 */}
          <div className="flex items-center space-x-4">
            {/* 語言選擇器 */}
            <LanguageSelector />
            
            {/* 主題切換按鈕 */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              aria-label={t('toggleTheme')}
            >
              {/* 在 mount 前顯示預設圖標，避免 hydration 問題 */}
              {!mounted ? (
                <div className="h-5 w-5" />
              ) : theme === 'light' ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              )}
            </button>
            
            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={toggleMobileMenu}
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
            
            {isLoggedIn && user ? (
              /* 已登入狀態 */
              <div className="flex items-center space-x-4">
                {/* 用戶資訊 */}
                <div className="hidden sm:flex sm:items-center sm:space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.email}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
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
                  aria-label={t('signOut')}
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
                  <span className="hidden sm:inline">{t('signOut')}</span>
                  <span className="sm:hidden">{t('signOut')}</span>
                </button>
              </div>
            ) : (
              /* 未登入狀態 */
              <button
                onClick={handleLogin}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                aria-label={t('signIn')}
              >
                {t('signIn')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <nav className="md:hidden bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700" aria-label="Mobile navigation">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-slate-700'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* 移動端用戶資訊 (當登入時顯示) */}
      {isLoggedIn && user && (
        <div className="sm:hidden bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {user.email}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {getRoleDisplayName(user.role)}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}