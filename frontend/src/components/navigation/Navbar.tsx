"use client";

import { useState } from "react";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { label: "Programs", href: "#programs" },
    { label: "Features", href: "#features" },
    { label: "Community", href: "#community" },
    { label: "About", href: "#about" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-cardBg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <span className="text-h3 font-bold bg-gradient-tech-to-human bg-clip-text text-transparent">
              AI Square
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-body text-neutral-textSecondary hover:text-primary-blue-500 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <button className="px-6 py-2 bg-primary-blue-500 text-white font-semibold rounded-pill hover:bg-primary-blue-600 transition-colors text-small">
              Get Started
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 text-neutral-textPrimary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
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
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block text-body text-neutral-textSecondary hover:text-primary-blue-500 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <button className="w-full px-6 py-2 bg-primary-blue-500 text-white font-semibold rounded-pill hover:bg-primary-blue-600 transition-colors text-small">
              Get Started
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
