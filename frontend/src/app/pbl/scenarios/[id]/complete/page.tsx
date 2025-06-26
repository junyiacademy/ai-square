'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ScenarioProgram, SessionData } from '@/types/pbl';

export default function PBLCompletePage() {
  const { t, i18n, ready } = useTranslation(['pbl']);
  const params = useParams();
  const router = useRouter();
  const scenarioId = params.id as string;

  const [scenario, setScenario] = useState<ScenarioProgram | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [completedStages, setCompletedStages] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load scenario details
        const scenarioResponse = await fetch(`/api/pbl/scenarios/${scenarioId}?lang=${i18n.language}`);
        const scenarioData = await scenarioResponse.json();
        
        if (scenarioData.success) {
          setScenario(scenarioData.data);
        }

        // Get user info from cookie
        let userId = 'user-demo';
        try {
          const userCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('user='))
            ?.split('=')[1];
          
          if (userCookie) {
            const user = JSON.parse(decodeURIComponent(userCookie));
            userId = user.email || userId;
          }
        } catch (e) {
          console.log('No user cookie found, using demo user');
        }

        // Load all completed sessions for this scenario
        const sessionsResponse = await fetch(`/api/pbl/sessions?userId=${userId}&scenarioId=${scenarioId}&status=completed`);
        const sessionsData = await sessionsResponse.json();
        
        if (sessionsData.success) {
          const userSessions = sessionsData.data.sessions;
          setSessions(userSessions);
          
          // Calculate total time and completed stages
          let totalTime = 0;
          const stagesCompleted = new Set<number>();
          
          userSessions.forEach((session: SessionData) => {
            totalTime += session.progress.timeSpent;
            stagesCompleted.add(session.currentStage);
          });
          
          setTotalTimeSpent(totalTime);
          setCompletedStages(stagesCompleted.size);
        }
      } catch (error) {
        console.error('Error loading completion data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [scenarioId, i18n.language]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return t('complete.timeFormat.hours', { hours, minutes });
    } else if (minutes > 0) {
      return t('complete.timeFormat.minutes', { minutes, seconds: secs });
    } else {
      return t('complete.timeFormat.seconds', { seconds: secs });
    }
  };

  const handleViewHistory = () => {
    router.push('/pbl/history');
  };

  const handleBackToPBL = () => {
    router.push('/pbl');
  };

  const handleRetryScenario = () => {
    // Clear progress and start over
    localStorage.removeItem(`pbl-progress-${scenarioId}`);
    router.push(`/pbl/scenarios/${scenarioId}/learn`);
  };

  if (loading || !ready || !i18n.isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t('complete.errorLoading')}</p>
          <button
            onClick={handleBackToPBL}
            className="text-blue-600 hover:text-blue-700"
          >
            {t('complete.backToPBL')}
          </button>
        </div>
      </div>
    );
  }

  const completionRate = scenario.stages.length > 0 
    ? Math.round((completedStages / scenario.stages.length) * 100) 
    : 0;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
            <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('complete.congratulations')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t('complete.scenarioCompleted', { title: scenario.title })}
          </p>
        </div>

        {/* Completion Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('complete.completionStats')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Completion Rate */}
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {completionRate}%
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('complete.completionRate')}
              </p>
            </div>

            {/* Stages Completed */}
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {completedStages}/{scenario.stages.length}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('complete.stagesCompleted')}
              </p>
            </div>

            {/* Time Spent */}
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {formatTime(totalTimeSpent)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('complete.totalTimeSpent')}
              </p>
            </div>
          </div>
        </div>

        {/* Learning Objectives Achieved */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('complete.learningObjectivesAchieved')}
          </h2>
          
          <ul className="space-y-2">
            {scenario.learningObjectives.map((objective, index) => (
              <li key={index} className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">{objective}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Stage Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('complete.stageSummary')}
          </h2>
          
          <div className="space-y-3">
            {scenario.stages.map((stage, index) => {
              const isCompleted = sessions.some(s => s.currentStage === index);
              return (
                <div 
                  key={stage.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isCompleted 
                      ? 'bg-green-50 dark:bg-green-900/20' 
                      : 'bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500'
                    }`}>
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{stage.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{stage.description}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${
                    isCompleted 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {isCompleted ? t('complete.completed') : t('complete.notStarted')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleViewHistory}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {t('complete.viewHistory')}
          </button>
          
          <button
            onClick={handleRetryScenario}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            {t('complete.retryScenario')}
          </button>
          
          <button
            onClick={handleBackToPBL}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            {t('complete.backToPBL')}
          </button>
        </div>
      </div>
    </main>
  );
}