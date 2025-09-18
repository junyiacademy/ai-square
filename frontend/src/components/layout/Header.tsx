'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslation(['navigation'])
  const { theme, toggleTheme } = useTheme()
  const { user, isLoggedIn, logout, isLoading } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const handleLogout = useCallback(async () => {
    await logout()
  }, [logout])

  const handleLogin = useCallback(() => {
    router.push('/login')
  }, [router])

  // Set mounted state for hydration
  useEffect(() => {
    setMounted(true)
  }, [])


  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  // Define navigation link type
  type NavLink = {
    label: string
    href?: string
    disabled?: boolean
    tooltip?: string
  }

  // 主要導航連結（顯示在導航欄）
  const primaryNavLinks: NavLink[] = [
    { href: '/relations', label: t('relations') },
    { href: '/ksa', label: t('ksa') },
    { href: '/pbl/scenarios', label: t('pbl') },
    { href: '/dashboard', label: t('dashboard') },
  ]

  // 次要導航連結（放在「更多」選單中）
  const secondaryNavLinks: NavLink[] = [
    { href: '/assessment/scenarios', label: t('assessment'), disabled: true, tooltip: t('comingSoon') || '即將發行' },
    { href: '/history', label: t('history'), disabled: true, tooltip: t('comingSoon') || '即將發行' },
    { href: '/discovery/overview', label: t('discovery'), disabled: true, tooltip: t('comingSoon') || '即將發行' },
  ]

  // 所有導航連結（用於手機選單）
  const allNavLinks: NavLink[] = [...primaryNavLinks, ...secondaryNavLinks]


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
                <Image
                  src="/images/logo.png"
                  alt="AI Square Logo"
                  width={32}
                  height={32}
                  className="mr-3"
                  priority
                />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Square</h1>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:ml-10 lg:flex lg:space-x-6" aria-label="Main navigation">
              {primaryNavLinks.map((link, index) =>
                link.disabled ? (
                  <div
                    key={link.href || index}
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed relative group"
                    title={link.tooltip}
                    onClick={(e) => e.preventDefault()}
                  >
                    {link.label}
                    {link.tooltip && (
                      <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {link.tooltip}
                      </span>
                    )}
                  </div>
                ) : link.href ? (
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
                ) : null
              )}

              {/* More dropdown menu */}
              <div className="relative group">
                <button
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  {t('more')}
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-1">
                    {secondaryNavLinks.map((link) =>
                      link.disabled ? (
                        <div
                          key={link.href || link.label}
                          className="block px-4 py-2 text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed relative"
                          title={link.tooltip}
                        >
                          {link.label}
                          {link.tooltip && (
                            <span className="ml-2 text-xs">({link.tooltip})</span>
                          )}
                        </div>
                      ) : link.href ? (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`block px-4 py-2 text-sm ${
                            pathname === link.href
                              ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {link.label}
                        </Link>
                      ) : null
                    )}
                  </div>
                </div>
              </div>
            </nav>
          </div>

          {/* 右側區域 */}
          <div className="flex items-center space-x-4">
            {/* Language Selector - Always visible */}
            <div className="hidden sm:block">
              <LanguageSelector />
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
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

            {isLoading ? (
              /* 載入中狀態 - 顯示骨架屏或空白 */
              <div className="w-32 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            ) : isLoggedIn && user ? (
              /* 已登入狀態 */
              <div className="relative group">
                {/* 用戶頭像按鈕 */}
                <button className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden md:block text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {user.name || user.email.split('@')[0]}
                  </span>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-1">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {user.name || user.email}
                      </p>
                      {user.name && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {user.email}
                        </p>
                      )}
                    </div>

                    {/* Profile link */}
                    <Link
                      href="/profile"
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{t('profile')}</span>
                    </Link>

                    {/* Theme toggle */}
                    <button
                      onClick={toggleTheme}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between border-b border-gray-200 dark:border-gray-700"
                    >
                      <span>{t('theme')}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {theme === 'light' ? t('light') : t('dark')}
                        </span>
                        {mounted && (
                          theme === 'light' ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                          )
                        )}
                      </div>
                    </button>

                    {/* Sign out */}
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>{t('signOut')}</span>
                    </button>
                  </div>
                </div>
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
        <nav className="lg:hidden bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700" aria-label="Mobile navigation">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {allNavLinks.map((link, index) =>
              link.disabled ? (
                <div
                  key={link.href || index}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  title={link.tooltip}
                  onClick={(e) => e.preventDefault()}
                >
                  {link.label}
                  {link.tooltip && (
                    <span className="ml-2 text-xs text-gray-400">({link.tooltip})</span>
                  )}
                </div>
              ) : link.href ? (
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
              ) : null
            )}

            {/* Language Selector for Mobile */}
            <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('language')}</p>
              <LanguageSelector className="w-full" />
            </div>
          </div>
        </nav>
      )}

      {/* 移動端用戶資訊 (當登入時顯示) */}
      {isLoggedIn && user && isMobileMenuOpen && (
        <div className="sm:hidden bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {user.name || user.email}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {user.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t('signOut')}
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
