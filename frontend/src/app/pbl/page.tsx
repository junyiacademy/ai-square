'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { PBLScenariosListSkeleton } from '@/components/pbl/loading-skeletons';

interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedDuration: number;
  targetDomain: string[];
  domains: string[];
  isAvailable: boolean;
  thumbnailEmoji?: string;
}

interface UserProgram {
  programId: string;
  scenarioId: string;
  status: 'draft' | 'in_progress' | 'completed';
  progress: {
    completedTasks: number;
    totalTasks: number;
  };
}

export default function PBLPage() {
  const { t, i18n } = useTranslation(['pbl', 'assessment']);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPrograms, setUserPrograms] = useState<UserProgram[]>([]);

  const getDifficultyStars = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '⭐';
      case 'intermediate': return '⭐⭐⭐';
      case 'advanced': return '⭐⭐⭐⭐⭐';
      default: return '⭐';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch scenarios
        const scenarioResponse = await fetch(`/api/pbl/scenarios?lang=${i18n.language}`);
        const scenarioData = await scenarioResponse.json();
        
        if (scenarioData.success) {
          setScenarios(scenarioData.data.scenarios);
        }

        // Fetch user programs if logged in
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
          const programResponse = await fetch('/api/pbl/user-programs');
          const programData = await programResponse.json();
          
          if (programData.success) {
            setUserPrograms(programData.programs || []);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [i18n.language]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t('title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {t('description')}
          </p>
        </div>

        {/* Scenarios Grid */}
        {loading ? (
          <PBLScenariosListSkeleton />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {scenarios.map((scenario) => {
              const userProgram = userPrograms.find(p => p.scenarioId === scenario.id);
              const hasProgress = !!userProgram;
              
              return (
                <div 
                  key={scenario.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md relative ${
                    scenario.isAvailable ? 'hover:shadow-lg transition-shadow' : 'opacity-50'
                  }`}
                >
                  {/* Learning Status Indicator */}
                  {hasProgress && (
                    <div className="absolute top-4 right-4">
                      {userProgram.status === 'completed' ? (
                        <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full text-xs">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {t('completed')}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          {userProgram.progress.completedTasks}/{userProgram.progress.totalTasks}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className={`w-12 h-12 ${
                        scenario.isAvailable ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-200 dark:bg-gray-700'
                      } rounded-lg flex items-center justify-center`}>
                        <span className="text-2xl">{scenario.thumbnailEmoji || '📚'}</span>
                      </div>
                      <h2 className="ml-4 text-xl font-semibold text-gray-900 dark:text-white pr-16">
                        {scenario.title}
                      </h2>
                    </div>
                    
                    {/* Domain Labels */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(scenario.domains || scenario.targetDomain || []).map((domain) => (
                        <span 
                          key={domain}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            domain === 'engaging_with_ai' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            domain === 'creating_with_ai' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            domain === 'managing_with_ai' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            domain === 'designing_with_ai' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {t(`assessment:domains.${domain}`)}
                        </span>
                      ))}
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <span className="mr-4">
                          {t('difficulty')}: {getDifficultyStars(scenario.difficulty)} {t(`level.${scenario.difficulty}`)}
                        </span>
                        <span>
                          {t('duration')}: {scenario.estimatedDuration} {t('minutes')}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300">
                        {scenario.description}
                      </p>
                    </div>

                    {scenario.isAvailable ? (
                      <Link
                        href={`/pbl/scenarios/${scenario.id}`}
                        className="block w-full bg-blue-600 text-white text-center px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {t('viewDetails')}
                      </Link>
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        {t('comingSoon')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Features Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            {t('features.title')}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t('features.realWorld.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('features.realWorld.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t('features.aiGuidance.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('features.aiGuidance.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t('features.progress.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('features.progress.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t('features.personalized.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('features.personalized.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}