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
              href="/assessment"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              {t('hero.cta.assessment')}
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </Link>

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

          {/* 測試新導航頁面 - 臨時添加 */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700 mb-3 font-semibold">🧪 測試 Discovery 子頁面（臨時）</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link href="/discovery/overview" className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">總覽</Link>
              <Link href="/discovery/evaluation" className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200">評估</Link>
              <Link href="/discovery/paths" className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200">路徑</Link>
              <Link href="/discovery/workspace" className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm hover:bg-orange-200">工作區</Link>
              <Link href="/discovery/achievements" className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200">成就</Link>
            </div>
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