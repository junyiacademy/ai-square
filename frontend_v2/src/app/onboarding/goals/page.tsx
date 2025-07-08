'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

interface LearningGoal {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  recommendedDomains: string[];
}

export default function OnboardingGoalsPage() {
  const router = useRouter();
  const { t } = useTranslation(['onboarding', 'common']);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const learningGoals: LearningGoal[] = [
    {
      id: 'understand-ai',
      title: t('onboarding:goals.understand.title'),
      description: t('onboarding:goals.understand.description'),
      icon: '🧠',
      category: 'foundation',
      recommendedDomains: ['Engaging_with_AI']
    },
    {
      id: 'create-content',
      title: t('onboarding:goals.create.title'),
      description: t('onboarding:goals.create.description'),
      icon: '🎨',
      category: 'creative',
      recommendedDomains: ['Creating_with_AI']
    },
    {
      id: 'analyze-data',
      title: t('onboarding:goals.analyze.title'),
      description: t('onboarding:goals.analyze.description'),
      icon: '📊',
      category: 'analytical',
      recommendedDomains: ['Managing_with_AI']
    },
    {
      id: 'build-solutions',
      title: t('onboarding:goals.build.title'),
      description: t('onboarding:goals.build.description'),
      icon: '🔧',
      category: 'technical',
      recommendedDomains: ['Designing_with_AI']
    },
    {
      id: 'teach-others',
      title: t('onboarding:goals.teach.title'),
      description: t('onboarding:goals.teach.description'),
      icon: '👩‍🏫',
      category: 'educational',
      recommendedDomains: ['Engaging_with_AI', 'Managing_with_AI']
    },
    {
      id: 'ethical-ai',
      title: t('onboarding:goals.ethical.title'),
      description: t('onboarding:goals.ethical.description'),
      icon: '⚖️',
      category: 'ethical',
      recommendedDomains: ['Managing_with_AI', 'Designing_with_AI']
    }
  ];

  const categoryColors = {
    foundation: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
    creative: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
    analytical: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
    technical: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
    educational: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700',
    ethical: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700'
  };

  const handleGoalToggle = (goalId: string) => {
    setSelectedGoals(prev =>
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const handleSubmit = async () => {
    if (selectedGoals.length === 0) {
      alert(t('onboarding:goals.selectAtLeastOne'));
      return;
    }

    setLoading(true);

    try {
      // Save selected goals to user profile
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.learningGoals = selectedGoals;
        user.hasCompletedOnboarding = true;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Save profile including interests to localStorage for personalization
        const userProfile = {
          identity: user.identity || 'learner',
          interests: selectedGoals,
          goals: selectedGoals
        };
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        
        // Update progress in GCS
        await fetch('/api/users/update-progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            stage: 'goals',
            data: { 
              goals: selectedGoals,
              interests: selectedGoals 
            }
          })
        });
      }

      // Proceed to assessment
      router.push('/assessment');
    } catch (error) {
      console.error('Error saving goals:', error);
      router.push('/assessment'); // Still proceed even if save fails
    } finally {
      setLoading(false);
    }
  };

  // Unused function - keeping for potential future use
  // const handleSkip = () => {
  //   // Mark onboarding as completed without goals
  //   const userStr = localStorage.getItem('user');
  //   if (userStr) {
  //     const user = JSON.parse(userStr);
  //     user.hasCompletedOnboarding = true;
  //     localStorage.setItem('user', JSON.stringify(user));
  //   }
  //   router.push('/assessment');
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-purple-900">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white text-sm font-medium">
                ✓
              </div>
              <span className="ml-2 text-sm text-gray-600">{t('onboarding:progress.welcome', 'Welcome')}</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white text-sm font-medium">
                ✓
              </div>
              <span className="ml-2 text-sm text-gray-600">{t('onboarding:progress.identity', 'Identity')}</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                3
              </div>
              <span className="ml-2 text-sm font-medium text-gray-900">{t('onboarding:progress.goals', 'Goals')}</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('onboarding:goals.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('onboarding:goals.subtitle')}
          </p>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {learningGoals.map((goal) => {
            const isSelected = selectedGoals.includes(goal.id);
            return (
              <div
                key={goal.id}
                onClick={() => handleGoalToggle(goal.id)}
                className={`relative cursor-pointer rounded-xl p-6 border-2 transition-all transform hover:scale-105 ${
                  isSelected
                    ? 'ring-2 ring-blue-500 shadow-lg'
                    : 'hover:shadow-md'
                } ${categoryColors[goal.category as keyof typeof categoryColors]}`}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-blue-600 rounded-full p-1">
                      <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Goal Content */}
                <div className="text-center">
                  <span className="text-5xl mb-4 block">{goal.icon}</span>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {goal.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {goal.description}
                  </p>
                </div>

                {/* Recommended Domains */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {t('onboarding:goals.recommendedDomains')}:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {goal.recommendedDomains.map((domain) => (
                      <span
                        key={domain}
                        className="text-xs px-2 py-1 bg-white dark:bg-slate-700 rounded-full"
                      >
                        {domain.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Goals Summary */}
        {selectedGoals.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-8 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('onboarding:goals.selected', { count: selectedGoals.length })}
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedGoals.map((goalId) => {
                const goal = learningGoals.find(g => g.id === goalId);
                return goal ? (
                  <span
                    key={goalId}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                  >
                    <span className="mr-2">{goal.icon}</span>
                    {goal.title}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push('/onboarding/identity')}
            className="px-6 py-3 text-gray-700 hover:text-gray-900 transition-colors"
          >
            {t('onboarding:button.back', 'Back')}
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading || selectedGoals.length === 0}
            className={`px-8 py-3 rounded-lg font-medium transition-all flex items-center ${
              selectedGoals.length === 0
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('common:loading')}
              </>
            ) : (
              <>
                {t('onboarding:goals.continue')}
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          {t('onboarding:goals.helpText')}
        </p>
      </div>
    </div>
  );
}