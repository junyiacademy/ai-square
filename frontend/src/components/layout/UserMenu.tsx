'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';

interface User {
  id: number;
  email: string;
  role: string;
  name: string;
  isGuest?: boolean;
}

interface UserMenuProps {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  onLogout: () => Promise<void>;
  mounted: boolean;
}

export function UserMenu({
  user,
  isLoggedIn,
  isLoading,
  onLogout,
  mounted,
}: UserMenuProps) {
  const router = useRouter();
  const { t } = useTranslation(['navigation']);
  const { theme, toggleTheme } = useTheme();

  const handleLogin = useCallback(() => {
    router.push('/login');
  }, [router]);

  if (isLoading) {
    return (
      <div
        role="status"
        className="w-32 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
      />
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <button
        onClick={handleLogin}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        aria-label={t('signIn')}
      >
        {t('signIn')}
      </button>
    );
  }

  return (
    <div className="relative group">
      {/* User avatar button */}
      <button
        className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label={user.name || user.email}
      >
        <div
          className={`h-8 w-8 ${
            user.isGuest ? 'bg-green-100' : 'bg-blue-100'
          } rounded-full flex items-center justify-center`}
        >
          <span
            className={`${
              user.isGuest ? 'text-green-600' : 'text-blue-600'
            } text-sm font-medium`}
          >
            {user.name
              ? user.name.charAt(0).toUpperCase()
              : user.email.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="hidden md:block text-sm text-gray-700 dark:text-gray-300 font-medium">
          {user.isGuest
            ? `👤 ${user.name}`
            : user.name || user.email.split('@')[0]}
        </span>
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown menu */}
      <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="py-1">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-900 dark:text-white font-medium flex items-center gap-1">
              {user.isGuest && <span className="text-green-600">👤</span>}
              {user.name || user.email}
              {user.isGuest && (
                <span className="text-xs text-green-600 ml-1">
                  ({t('guestMode', '訪客模式')})
                </span>
              )}
            </p>
            {user.name && !user.isGuest && (
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
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>{t('profile')}</span>
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between border-b border-gray-200 dark:border-gray-700"
            aria-label={t('theme')}
          >
            <span>{t('theme')}</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {theme === 'light' ? t('light') : t('dark')}
              </span>
              {mounted &&
                (theme === 'light' ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                ))}
            </div>
          </button>

          {/* Sign out */}
          <button
            onClick={onLogout}
            className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
            aria-label={t('signOut')}
          >
            <svg
              className="h-4 w-4"
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
            <span>{t('signOut')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
