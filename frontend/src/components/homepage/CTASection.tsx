'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export default function CTASection() {
  const { t } = useTranslation('homepage');

  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('cta.title')}
          </h2>
          
          <p className="text-xl text-blue-100 mb-8">
            {t('cta.subtitle')}
          </p>

          <div className="flex justify-center">
            <Link
              href="/discovery"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg border-2 border-purple-500"
            >
              🚀 探索世界
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="text-white">
            <div className="text-4xl font-bold mb-2">3</div>
            <div className="text-blue-200">Languages (EN / 繁體 / 简体)</div>
          </div>
          <div className="text-white">
            <div className="text-4xl font-bold mb-2">4</div>
            <div className="text-blue-200">AI Domains</div>
          </div>
          <div className="text-white">
            <div className="text-4xl font-bold mb-2">20+</div>
            <div className="text-blue-200">Competencies</div>
          </div>
          <div className="text-white">
            <div className="text-4xl font-bold mb-2">24/7</div>
            <div className="text-blue-200">AI Support</div>
          </div>
        </div>
      </div>
    </section>
  );
}
