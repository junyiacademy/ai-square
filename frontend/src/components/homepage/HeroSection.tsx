'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HeroSection() {
  const { t } = useTranslation('homepage');
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasAssessmentResult, setHasAssessmentResult] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    const isAuthenticated = !!userStr;
    setIsLoggedIn(isAuthenticated);

    // Check if user has assessment result
    if (isAuthenticated) {
      const assessmentResult = localStorage.getItem('assessmentResult');
      setHasAssessmentResult(!!assessmentResult);
    }
  }, []);

  const handleStartJourney = () => {
    if (isLoggedIn) {
      // If logged in and has assessment result, go to PBL
      if (hasAssessmentResult) {
        router.push('/pbl');
      } else {
        // If logged in but no assessment, go to assessment
        router.push('/assessment');
      }
    } else {
      // If not logged in, go to register
      router.push('/register');
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-24 pb-20">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Hero Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            {t('hero.title')}
          </h1>

          {/* Hero Subtitle */}
          <p className="text-xl sm:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto">
            {t('hero.subtitle')}
          </p>

          {/* Hero Description */}
          <p className="text-lg text-gray-600 mb-12 max-w-4xl mx-auto">
            {t('hero.description')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleStartJourney}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              {isLoggedIn
                ? (hasAssessmentResult ? t('hero.cta.continueLearning') : t('hero.cta.takeAssessment'))
                : t('hero.cta.getStarted')
              }
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>

            <Link
              href="/relations"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              {t('hero.cta.explore')}
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Visual representation */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent z-10"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {['🎯', '🎨', '🎮', '🏗️'].map((emoji, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <div className="text-4xl mb-2">{emoji}</div>
                <div className="h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}