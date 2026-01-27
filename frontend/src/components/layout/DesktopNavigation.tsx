"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { NavLink } from "./types";

interface DesktopNavigationProps {
  primaryNavLinks: NavLink[];
  secondaryNavLinks: NavLink[];
}

export function DesktopNavigation({
  primaryNavLinks,
  secondaryNavLinks,
}: DesktopNavigationProps) {
  const pathname = usePathname();
  const { t } = useTranslation(["navigation"]);

  return (
    <nav
      className="hidden lg:ml-10 lg:flex lg:space-x-6"
      aria-label="Main navigation"
    >
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
                ? "text-gray-900 dark:text-white border-b-2 border-[#0363A7] active"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            {link.label}
          </Link>
        ) : null,
      )}

      {/* More dropdown menu */}
      <div className="relative group">
        <button className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
          {t("more")}
          <svg
            className="ml-1 h-4 w-4"
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
                      ? "text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {link.label}
                </Link>
              ) : null,
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
