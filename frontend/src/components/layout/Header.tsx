'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileMenu } from '@/hooks/useMobileMenu';
import { Logo } from './Logo';
import { DesktopNavigation } from './DesktopNavigation';
import { UserMenu } from './UserMenu';
import { MobileMenu } from './MobileMenu';
import type { NavLink } from './types';

export function Header() {
  const { t } = useTranslation(['navigation']);
  const { user, isLoggedIn, logout, isLoading } = useAuth();
  const { isOpen: isMobileMenuOpen, toggle: toggleMobileMenu, close: closeMobileMenu } = useMobileMenu();
  const [mounted, setMounted] = useState(false);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  // Set mounted state for hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Primary navigation links (displayed in navbar)
  const primaryNavLinks: NavLink[] = [
    { href: '/relations', label: t('relations') },
    { href: '/ksa', label: t('ksa') },
    { href: '/pbl/scenarios', label: t('pbl') },
  ];

  // Secondary navigation links (in "More" menu)
  const secondaryNavLinks: NavLink[] = [
    { href: '/assessment/scenarios', label: t('assessment'), disabled: true, tooltip: t('comingSoon') || '即將發行' },
    { href: '/dashboard', label: t('dashboard'), disabled: true, tooltip: t('comingSoon') || '即將發行' },
    { href: '/history', label: t('history'), disabled: true, tooltip: t('comingSoon') || '即將發行' },
    { href: '/discovery/overview', label: t('discovery'), disabled: true, tooltip: t('comingSoon') || '即將發行' },
  ];

  // All navigation links (for mobile menu)
  const allNavLinks: NavLink[] = [...primaryNavLinks, ...secondaryNavLinks];

  return (
    <header
      role="banner"
      className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Area */}
          <div className="flex items-center">
            <Logo />

            {/* Desktop Navigation Links */}
            <DesktopNavigation
              primaryNavLinks={primaryNavLinks}
              secondaryNavLinks={secondaryNavLinks}
            />
          </div>

          {/* Right Area */}
          <div className="flex items-center space-x-4">
            {/* Language Selector - Always visible on desktop */}
            <div className="hidden sm:block">
              <LanguageSelector />
            </div>

            {/* Mobile Menu Button & User Menu */}
            <MobileMenu
              isOpen={isMobileMenuOpen}
              allNavLinks={allNavLinks}
              user={user}
              isLoggedIn={isLoggedIn}
              onClose={closeMobileMenu}
              onToggle={toggleMobileMenu}
              onLogout={handleLogout}
            />

            {/* User Menu (Desktop) */}
            <UserMenu
              user={user}
              isLoggedIn={isLoggedIn}
              isLoading={isLoading}
              onLogout={handleLogout}
              mounted={mounted}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
