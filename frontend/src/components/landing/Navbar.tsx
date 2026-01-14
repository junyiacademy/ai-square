"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

/**
 * Navbar Component
 * Sticky minimal navbar with pill CTA button
 * Features glassmorphism when scrolled
 */
export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "功能特色", href: "#features" },
    { label: "使用案例", href: "#use-cases" },
    { label: "最新消息", href: "#news" },
    { label: "關於我們", href: "#about" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-xl shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-primary-blue rounded-lg"
            >
              <div className="w-10 h-10 bg-gradient-blue-orange rounded-xl flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition-transform duration-300">
                AI
              </div>
              <span className="text-h4 font-bold text-gray-900 group-hover:text-primary-blue transition-colors duration-300">
                AI Square
              </span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="text-h6 text-gray-700 hover:text-primary-blue transition-colors duration-300 font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue rounded px-2 py-1"
              >
                {link.label}
              </a>
            ))}

            {/* CTA button */}
            <button className="px-6 py-3 bg-gradient-blue-orange text-white text-h6 rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-blue focus:ring-opacity-50">
              免費試用
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-gray-700 hover:text-primary-blue transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-blue rounded"
            aria-label="開啟選單"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
