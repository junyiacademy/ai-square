"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";

export default function HeroSection() {
  const { t } = useTranslation("homepage");

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0363A7]/5 via-[#0363A7]/10 to-[#0363A7]/15 pt-24 pb-20">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#0363A7] rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#EC6C1F] rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Hero Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            {t("hero.title")}
          </h1>

          {/* Hero Subtitle */}
          <p className="text-xl sm:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto">
            {t("hero.subtitle")}
          </p>

          {/* Hero Description */}
          <p className="text-lg text-gray-600 mb-12 max-w-4xl mx-auto">
            {t("hero.description")}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pbl"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-[#0363A7] rounded-full hover:bg-[#0363A7]/90 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {t("hero.cta.getStarted")}
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>

            <Link
              href="/relations"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              {t("hero.cta.explore")}
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Visual representation */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent z-10"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { emoji: "🎯", key: "engaging" },
              { emoji: "🎨", key: "creating" },
              { emoji: "🎮", key: "managing" },
              { emoji: "🏗️", key: "designing" },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <div className="text-4xl mb-2">{item.emoji}</div>
                <p className="text-sm font-medium text-gray-700 mt-2">
                  {t(`domains.items.${item.key}.name`)}
                </p>
                <div className="h-2 bg-gradient-to-r from-[#0363A7] to-[#0363A7]/60 rounded-full mt-2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
