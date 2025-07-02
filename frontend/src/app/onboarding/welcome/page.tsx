'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export default function OnboardingWelcomePage() {
  const router = useRouter();
  const { t } = useTranslation(['onboarding', 'common']);
  const [userName, setUserName] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userStr);
    setUserName(user.name || user.email.split('@')[0]);
    setLoading(false);
  }, [router]);

  const steps = [
    {
      title: t('onboarding:welcome.step1.title'),
      description: t('onboarding:welcome.step1.description'),
      icon: '🎯',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {t('onboarding:welcome.step1.content')}
          </p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                {t('onboarding:welcome.step1.assessment')}
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('onboarding:welcome.step1.assessmentDesc')}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                {t('onboarding:welcome.step1.learning')}
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                {t('onboarding:welcome.step1.learningDesc')}
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: t('onboarding:welcome.step2.title'),
      description: t('onboarding:welcome.step2.description'),
      icon: '🤖',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {t('onboarding:welcome.step2.content')}
          </p>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('onboarding:welcome.step2.domains')}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">💡</span>
                  <span className="text-sm font-medium">{t('onboarding:welcome.step2.engaging')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🎨</span>
                  <span className="text-sm font-medium">{t('onboarding:welcome.step2.creating')}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📊</span>
                  <span className="text-sm font-medium">{t('onboarding:welcome.step2.managing')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🔧</span>
                  <span className="text-sm font-medium">{t('onboarding:welcome.step2.designing')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: t('onboarding:welcome.step3.title'),
      description: t('onboarding:welcome.step3.description'),
      icon: '🚀',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {t('onboarding:welcome.step3.content')}
          </p>
          <div className="mt-8">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('onboarding:welcome.step3.ready')}
            </h4>
            <div className="space-y-3">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  {t('onboarding:welcome.step3.benefit1')}
                </span>
              </div>
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  {t('onboarding:welcome.step3.benefit2')}
                </span>
              </div>
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  {t('onboarding:welcome.step3.benefit3')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding and go to goals selection
      router.push('/onboarding/goals');
    }
  };

  const handleSkip = () => {
    // Mark onboarding as completed and go to assessment
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      user.hasCompletedOnboarding = true;
      localStorage.setItem('user', JSON.stringify(user));
    }
    router.push('/assessment');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-purple-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('onboarding:welcome.greeting', { name: userName })}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {t('onboarding:welcome.subtitle')}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-16 rounded-full transition-colors ${
                  index <= currentStep
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-6">
            <span className="text-6xl mb-4 block">{steps[currentStep].icon}</span>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {steps[currentStep].description}
            </p>
          </div>

          <div className="mt-8">
            {steps[currentStep].content}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {t('common:skip')}
          </button>

          <div className="flex space-x-4">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                {t('common:back')}
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  {t('onboarding:welcome.startJourney')}
                  <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              ) : (
                <>
                  {t('common:next')}
                  <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}