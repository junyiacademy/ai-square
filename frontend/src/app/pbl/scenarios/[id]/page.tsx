'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { ScenarioProgram } from '@/types/pbl';

export default function PBLScenarioDetailsPage() {
  const { t, i18n } = useTranslation(['pbl']);
  const params = useParams();
  const scenarioId = params.id as string;
  
  const [scenario, setScenario] = useState<ScenarioProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletionReport, setHasCompletionReport] = useState(false);

  useEffect(() => {
    const fetchScenario = async () => {
      try {
        const response = await fetch(`/api/pbl/scenarios/${scenarioId}?lang=${i18n.language}`);
        const data = await response.json();
        
        if (data.success) {
          setScenario(data.data);
          
          // Check if user has completed this scenario
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
          
          // Check for completed sessions
          const sessionsResponse = await fetch(`/api/pbl/sessions?userId=${userId}&scenarioId=${scenarioId}&status=completed`);
          const sessionsData = await sessionsResponse.json();
          
          if (sessionsData.success && sessionsData.data.sessions.length > 0) {
            // Check if all stages are completed
            const scenario = data.data;
            const completedStages = new Set(sessionsData.data.sessions.map((s: any) => s.currentStage));
            const allStagesCompleted = scenario.stages.length === completedStages.size;
            setHasCompletionReport(allStagesCompleted);
          }
        } else {
          setError(data.error?.message || 'Failed to load scenario');
        }
      } catch (err) {
        console.error('Error fetching scenario:', err);
        setError('Failed to load scenario details');
      } finally {
        setLoading(false);
      }
    };

    if (scenarioId) {
      fetchScenario();
    }
  }, [scenarioId, i18n.language]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case 'reading':
        return '📖';
      case 'writing':
        return '✍️';
      case 'listening':
        return '👂';
      case 'speaking':
        return '🗣️';
      case 'mixed':
        return '🔄';
      default:
        return '📝';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || t('details.scenarioNotFound')}
          </h1>
          <Link
            href="/pbl"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← {t('details.backToPBL')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <Link href="/pbl" className="text-blue-600 hover:text-blue-700">
                {t('details.breadcrumb.pbl')}
              </Link>
            </li>
            <li className="text-gray-500">/</li>
            <li className="text-gray-900 dark:text-white">{scenario.title}</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {scenario.title}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                {scenario.description}
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{scenario.estimatedDuration}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('details.minutes')}</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(scenario.difficulty)}`}>
                {t(`level.${scenario.difficulty}`)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('difficulty')}</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{scenario.stages.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('details.learningStages')}</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl">🎯</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('details.learningObjectives')}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href={`/pbl/scenarios/${scenarioId}/learn`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              🚀 {t('details.startLearningJourney')}
            </Link>
            
            {hasCompletionReport && (
              <Link
                href={`/pbl/scenarios/${scenarioId}/complete`}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                📊 {t('details.viewCompletionReport')}
              </Link>
            )}
          </div>
        </div>

        {/* Learning Objectives */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {t('details.learningObjectives')}
          </h2>
          <ul className="space-y-3">
            {scenario.learningObjectives.map((objective, index) => (
              <li key={index} className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{objective}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Prerequisites */}
        {scenario.prerequisites && scenario.prerequisites.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {t('details.prerequisites')}
            </h2>
            <ul className="space-y-2">
              {scenario.prerequisites.map((prerequisite, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span className="text-gray-700 dark:text-gray-300">{prerequisite}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Learning Stages */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {t('details.learningStages')}
          </h2>
          <div className="space-y-6">
            {scenario.stages.map((stage, index) => (
              <div key={stage.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                        {index + 1}
                      </span>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {stage.name}
                      </h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 ml-11 mb-4">
                      {stage.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className="text-2xl">{getModalityIcon(stage.modalityFocus)}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {t(`details.modalities.${stage.modalityFocus}`)}
                    </span>
                  </div>
                </div>

                {/* Stage Tasks */}
                <div className="ml-11">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    {t('details.tasksInStage')}
                  </h4>
                  <div className="space-y-3">
                    {stage.tasks.map((task, taskIndex) => (
                      <div key={task.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                          {taskIndex + 1}. {task.title}
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                          {task.description}
                        </p>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                              {t('details.instructions')}
                            </h6>
                            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                              {task.instructions.map((instruction, instIndex) => (
                                <li key={instIndex} className="flex items-start">
                                  <span className="text-blue-500 mr-1">•</span>
                                  <span>{instruction}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                              {t('details.expectedOutcome')}
                            </h6>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {task.expectedOutcome}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Action */}
        <div className="flex flex-wrap gap-4 justify-center mt-8">
          <Link
            href={`/pbl/scenarios/${scenarioId}/learn`}
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-lg"
          >
            🚀 {t('details.startLearning')}
          </Link>
          
          {hasCompletionReport && (
            <Link
              href={`/pbl/scenarios/${scenarioId}/complete`}
              className="inline-flex items-center px-8 py-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-lg"
            >
              📊 {t('details.viewCompletionReport')}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}