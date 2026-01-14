"use client";

import React from "react";

/**
 * Footer Component
 * Dark navy footer with Junyi Academy humanity tagline
 * Comprehensive links and brand information
 */
export default function Footer() {
  const footerLinks = {
    產品: [
      { label: "智慧評量", href: "#assessment" },
      { label: "專題導向學習", href: "#pbl" },
      { label: "探索模式", href: "#discovery" },
      { label: "定價方案", href: "#pricing" },
    ],
    資源: [
      { label: "使用手冊", href: "#docs" },
      { label: "教學影片", href: "#videos" },
      { label: "常見問題", href: "#faq" },
      { label: "開發者 API", href: "#api" },
    ],
    公司: [
      { label: "關於我們", href: "#about" },
      { label: "合作夥伴", href: "#partners" },
      { label: "最新消息", href: "#news" },
      { label: "聯絡我們", href: "#contact" },
    ],
  };

  const socialLinks = [
    {
      name: "Facebook",
      href: "#",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: "YouTube",
      href: "#",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      href: "#",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand column */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-blue-orange rounded-xl flex items-center justify-center text-white font-bold text-xl">
                AI
              </div>
              <span className="text-h3 font-bold">AI Square</span>
            </div>
            <p className="text-gray-400 text-h6 leading-relaxed mb-6">
              以科技為教育賦能，以人性為核心，創造更好的學習體驗
            </p>
            {/* Social links */}
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-primary-blue transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links columns */}
          {Object.entries(footerLinks).map(([category, links], index) => (
            <div key={index}>
              <h3 className="text-h4 font-semibold mb-6">{category}</h3>
              <ul className="space-y-4">
                {links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-white text-h6 transition-colors duration-300 focus:outline-none focus:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Humanity tagline */}
        <div className="border-t border-gray-700 pt-8 mb-8">
          <p className="text-center text-h5 text-gray-300 italic">
            &ldquo;科技始於人性，教育回歸本質&rdquo;
          </p>
          <p className="text-center text-sm text-gray-500 mt-2">
            均一教育平台 Junyi Academy
          </p>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <p>© 2024 AI Square. All rights reserved.</p>
          <div className="flex gap-6">
            <a
              href="#privacy"
              className="hover:text-white transition-colors duration-300 focus:outline-none focus:text-white"
            >
              隱私權政策
            </a>
            <a
              href="#terms"
              className="hover:text-white transition-colors duration-300 focus:outline-none focus:text-white"
            >
              服務條款
            </a>
            <a
              href="#cookies"
              className="hover:text-white transition-colors duration-300 focus:outline-none focus:text-white"
            >
              Cookie 政策
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
