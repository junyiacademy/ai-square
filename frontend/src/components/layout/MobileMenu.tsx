"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import type { NavLink } from "./types";

interface User {
  id: number;
  email: string;
  role: string;
  name: string;
  isGuest?: boolean;
}

interface MobileMenuProps {
  isOpen: boolean;
  allNavLinks: NavLink[];
  user: User | null;
  isLoggedIn: boolean;
  onClose: () => void;
  onToggle?: () => void;
  onLogout: () => Promise<void>;
}

export function MobileMenu({
  isOpen,
  allNavLinks,
  user,
  isLoggedIn,
  onClose,
  onToggle,
  onLogout,
}: MobileMenuProps) {
  const pathname = usePathname();
  const { t } = useTranslation(["navigation"]);

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        onClick={onToggle || onClose}
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
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

      {/* Mobile Navigation Menu */}
      {isOpen && (
        <>
          <nav
            className="lg:hidden bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700"
            aria-label="Mobile navigation"
          >
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
                      <span className="ml-2 text-xs text-gray-400">
                        ({link.tooltip})
                      </span>
                    )}
                  </div>
                ) : link.href ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      pathname === link.href
                        ? "text-gray-900 dark:text-white bg-gray-100 dark:bg-slate-700"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700"
                    }`}
                    onClick={onClose}
                  >
                    {link.label}
                  </Link>
                ) : null,
              )}

              {/* Language Selector for Mobile */}
              <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {t("language")}
                </p>
                <LanguageSelector className="w-full" />
              </div>
            </div>
          </nav>

          {/* Mobile User Info (when logged in) */}
          {isLoggedIn && user && (
            <div className="sm:hidden bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                    {user.isGuest && <span className="text-green-600">👤</span>}
                    {user.name || user.email}
                    {user.isGuest && (
                      <span className="text-xs text-green-600 ml-1">
                        ({t("guestMode", "訪客模式")})
                      </span>
                    )}
                  </div>
                  {!user.isGuest && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </div>
                  )}
                </div>
                <button
                  onClick={onLogout}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  aria-label={t("signOut")}
                >
                  {t("signOut")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
