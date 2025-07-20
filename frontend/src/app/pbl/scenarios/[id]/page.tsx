'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { IScenario, IProgram } from '@/types/unified-learning';
import { formatDateSafely } from '@/lib/utils/date';

export default function ScenarioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, i18n } = useTranslation(['pbl', 'common']);
  const [scenario, setScenario] = useState<IScenario | null>(null);
  const [userPrograms, setUserPrograms] = useState<IProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const scenarioId = params.id as string;

  useEffect(() => {
    let ignore = false;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch scenario details
        const [scenarioResponse, programsResponse] = await Promise.all([
          fetch(`/api/pbl/scenarios/${params.id}?lang=${i18n.language}`),
          fetch(`/api/pbl/scenarios/${params.id}/programs`)
        ]);
        
        if (ignore) return;
        
        if (scenarioResponse.ok) {
          const response = await scenarioResponse.json();
          if (response.success && response.data) {
            // Transform PBL API response to match expected format
            const scenarioData = {
              ...response.data,
              objectives: response.data.learningObjectives || [],
              metadata: {
                difficulty: response.data.difficulty,
                estimatedDuration: response.data.estimatedDuration,
                prerequisites: response.data.prerequisites || [],
                targetDomains: response.data.targetDomain || [],
                tasks: response.data.tasks || [],
                ksaMapping: response.data.ksaMapping
              }
            };
            setScenario(scenarioData);
          } else {
            console.error('Invalid PBL API response:', response);
          }
        } else {
          console.error('Failed to fetch scenario:', scenarioResponse.status, scenarioResponse.statusText);
        }
        
        if (programsResponse.ok) {
          const programsData = await programsResponse.json();
          setUserPrograms(programsData);
        }
      } catch (error) {
        if (!ignore) {
          console.error('Error fetching scenario data:', error);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
      ignore = true;
    };
  }, [params.id, i18n.language]);

  // Helper function to get data from scenario metadata
  const getScenarioData = (key: string, fallback: unknown = null) => {
    return (scenario?.metadata as Record<string, unknown>)?.[key] || fallback;
  };

  const handleStartProgram = async (programId?: string) => {
    if (!scenario) return;
    
    setIsStarting(true);
    try {
      if (programId) {
        // Continue existing program
        const program = userPrograms.find(p => p.id === programId);
        if (program) {
          // Get the current task or the first task
          const currentTaskIndex = program.currentTaskIndex || 0;
          const taskIds = (program.metadata?.taskIds as string[]) || [];
          const targetTaskId = taskIds[currentTaskIndex] || taskIds[0];
          
          if (!targetTaskId) {
            console.error('No task ID found for navigation in program:', program);
            alert(t('details.errorStarting', 'Error starting program - no tasks found'));
            setIsStarting(false);
            return;
          }
          router.push(`/pbl/scenarios/${scenarioId}/programs/${programId}/tasks/${targetTaskId}`);
        }
      } else {
        // Create new program
        const response = await fetch(`/api/pbl/scenarios/${scenarioId}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            language: i18n.language
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to create program');
        }
        
        const data = await response.json();
        if (data.id) {
          // Navigate to the first task using the UUID from created tasks
          const firstTaskId = data.tasks?.[0]?.id || data.taskIds?.[0];
          if (!firstTaskId) {
            console.error('No task ID found in created program:', data);
            alert(t('details.errorStarting', 'Error starting program - no tasks created'));
            setIsStarting(false);
            return;
          }
          router.push(`/pbl/scenarios/${scenarioId}/programs/${data.id}/tasks/${firstTaskId}`);
        }
      }
    } catch (error) {
      console.error('Error starting program:', error);
      alert(t('details.errorStarting', 'Error starting program'));
    } finally {
      setIsStarting(false);
    }
  };

  // Helper functions
  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getDomainTranslation = (domain: string) => {
    return t(`domains.${domain}`, domain);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'analysis':
        return '📊';
      case 'creation':
        return '✨';
      case 'evaluation':
        return '🔍';
      case 'application':
        return '🚀';
      default:
        return '📝';
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!scenario) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t('details.scenarioNotFound', 'Scenario not found')}</p>
          <Link href="/pbl/scenarios" className="text-blue-600 hover:text-blue-700">
            {t('details.backToScenarios', 'Back to Scenarios')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/pbl/scenarios" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                {t('pbl', 'PBL')}
              </Link>
            </li>
            <li className="text-gray-400 dark:text-gray-600">/</li>
            <li className="text-gray-900 dark:text-white">{scenario.title[i18n.language] || scenario.title.en || ''}</li>
          </ol>
        </nav>

        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {scenario.title[i18n.language] || scenario.title.en || ''}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                {scenario.description[i18n.language] || scenario.description.en || ''}
              </p>
              
              {/* Metadata */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyBadge(String(getScenarioData('difficulty', 'beginner')))}`}>
                    {t(`difficulty.${String(getScenarioData('difficulty', 'beginner'))}`, String(getScenarioData('difficulty', 'beginner')))}
                  </span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{String(getScenarioData('estimatedDuration', 30))} {t('common:minutes', 'minutes')}</span>
                </div>
              </div>

              {/* Programs Section */}
              {userPrograms.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {t('details.yourPrograms', 'Your Programs')}
                  </h3>
                  <div className="space-y-2">
                    {userPrograms.map((program, index) => (
                      <div
                        key={program.id}
                        className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {index === 0 ? t('details.latestProgram', 'Latest Program') : `${t('common:program', 'Program')} ${userPrograms.length - index}`}
                            </span>
                            <span className={`ml-3 text-xs px-2 py-1 rounded-full ${
                              program.status === 'completed' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : program.status === 'active'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {t(`status.${program.status}`, program.status)}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <div>
                            {t('common:progress', 'Progress')}: {(program.metadata?.completedTaskCount as number) || 0}/{(program.metadata?.totalTaskCount as number) || 0} {t('common:tasks', 'tasks')}
                            {program.metadata && typeof program.metadata.completedTaskCount === 'number' && program.metadata.completedTaskCount > 0 && program.metadata.evaluationId ? (
                              <>
                                <span className="mx-2">•</span>
                                <span className="font-medium">
                                  {t('hasEvaluation', 'Has Evaluation')}
                                </span>
                              </>
                            ) : null}
                          </div>
                          <div>
                            {t('common:startedAt', 'Started')}: {formatDateSafely(program.startedAt, i18n.language)}
                            {program.completedAt && (
                              <>
                                <span className="mx-2">•</span>
                                {t('common:completedAt', 'Completed')}: {formatDateSafely(program.completedAt, i18n.language)}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleStartProgram(program.id)}
                            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                          >
                            {t('common:continue', 'Continue')}
                          </button>
                          {((program.metadata && typeof program.metadata.completedTaskCount === 'number' && program.metadata.completedTaskCount > 0) || program.status === 'completed' || program.metadata?.evaluationId) ? (
                            <button
                              onClick={() => router.push(`/pbl/scenarios/${scenarioId}/programs/${program.id}/complete`)}
                              className="text-sm px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
                            >
                              {t('viewResults', 'View Results')}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => handleStartProgram()}
                  disabled={isStarting}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStarting 
                    ? t('common:loading', 'Loading...') 
                    : t('startNewProgram', 'Start New Program')
                  }
                </button>
                <Link
                  href="/pbl/scenarios"
                  className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('backToScenarios', 'Back to Scenarios')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Learning Objectives */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="text-2xl mr-2">🎯</span>
              {t('learningObjectives', 'Learning Objectives')}
            </h2>
            <ul className="space-y-2">
              {(scenario.objectives || []).map((objective, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">{objective}</span>
                </li>
              ))}
              {(!scenario.objectives || scenario.objectives.length === 0) && (
                <li className="text-gray-500 dark:text-gray-400">No objectives specified</li>
              )}
            </ul>
          </div>

          {/* Prerequisites */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="text-2xl mr-2">📋</span>
              {t('prerequisites', 'Prerequisites')}
            </h2>
            <ul className="space-y-2">
              {(getScenarioData('prerequisites', []) as string[]).map((prereq: string, index: number) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span className="text-gray-600 dark:text-gray-300">{prereq}</span>
                </li>
              ))}
              {(getScenarioData('prerequisites', []) as string[]).length === 0 && (
                <li className="text-gray-500 dark:text-gray-400">No prerequisites</li>
              )}
            </ul>
          </div>
        </div>

        {/* Target Domains */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="text-2xl mr-2">🌐</span>
            {t('targetDomains', 'Target Domains')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {(getScenarioData('targetDomains', []) as string[]).map((domain: string, index: number) => (
              <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {getDomainTranslation(domain)}
              </span>
            ))}
            {(getScenarioData('targetDomains', []) as string[]).length === 0 && (
              <span className="text-gray-500 dark:text-gray-400">No target domains specified</span>
            )}
          </div>
        </div>


        {/* Learning Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            {t('learningTasks', 'Learning Tasks')}
          </h2>

          {/* Scenario KSA Overview */}
          {(() => {
            const ksaMapping = getScenarioData('ksaMapping') as Record<string, unknown> | null;
            return ksaMapping ? (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                🧠 KSA Competencies Covered in This Scenario
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {ksaMapping?.knowledge && Array.isArray(ksaMapping.knowledge) && ksaMapping.knowledge.length > 0 ? (
                  <div>
                    <span className="font-medium text-green-700 dark:text-green-300">Knowledge: </span>
                    <span className="text-green-600 dark:text-green-400">
                      {ksaMapping?.knowledge && Array.isArray(ksaMapping.knowledge) && ksaMapping.knowledge.map((item: unknown) => 
                        typeof item === 'string' ? item : (item && typeof item === 'object' && 'code' in item ? String(item.code) : '')
                      ).filter(Boolean).join(', ')}
                    </span>
                  </div>
                ) : null}
                {ksaMapping?.skills && Array.isArray(ksaMapping.skills) && ksaMapping.skills.length > 0 ? (
                  <div>
                    <span className="font-medium text-blue-700 dark:text-blue-300">Skills: </span>
                    <span className="text-blue-600 dark:text-blue-400">
                      {ksaMapping?.skills && Array.isArray(ksaMapping.skills) && ksaMapping.skills.map((item: unknown) => 
                        typeof item === 'string' ? item : (item && typeof item === 'object' && 'code' in item ? String(item.code) : '')
                      ).filter(Boolean).join(', ')}
                    </span>
                  </div>
                ) : null}
                {ksaMapping?.attitudes && Array.isArray(ksaMapping.attitudes) && ksaMapping.attitudes.length > 0 ? (
                  <div>
                    <span className="font-medium text-purple-700 dark:text-purple-300">Attitudes: </span>
                    <span className="text-purple-600 dark:text-purple-400">
                      {ksaMapping?.attitudes && Array.isArray(ksaMapping.attitudes) && ksaMapping.attitudes.map((item: unknown) => 
                        typeof item === 'string' ? item : (item && typeof item === 'object' && 'code' in item ? String(item.code) : '')
                      ).filter(Boolean).join(', ')}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null;
          })()}

          {/* Tasks List */}
          <div className="space-y-4">
            {(getScenarioData('tasks', []) as Record<string, unknown>[]).map((task: Record<string, unknown>, taskIndex: number) => (
              <div key={(task.id as string) || taskIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium text-gray-900 dark:text-white">
                    {taskIndex + 1}. {task.title as string}
                  </h5>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {getCategoryIcon((task.category as string) || (task.type as string))}
                    </span>
                    {task.timeLimit ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {String(task.timeLimit)} min
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {String(task.description)}
                </p>
                
                {/* Instructions */}
                {task.instructions && Array.isArray(task.instructions) && task.instructions.length > 0 ? (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      {t('instructions', 'Instructions')}
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      {(task.instructions as string[]).map((instruction: string, i: number) => (
                        <li key={i} className="flex items-start">
                          <span className="text-gray-400 mr-2">•</span>
                          {instruction}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                
                {/* KSA Focus */}
                {(() => {
                  const ksaFocus = task.KSA_focus as Record<string, unknown> | undefined;
                  return ksaFocus ? (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-3 mb-3">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                      🧠 KSA
                    </p>
                    <div className="space-y-1">
                      {ksaFocus.primary && Array.isArray(ksaFocus.primary) && ksaFocus.primary.length > 0 ? (
                        <div>
                          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Primary: </span>
                          <span className="text-xs text-purple-600 dark:text-purple-400">
                            {(ksaFocus.primary as unknown[]).map((item: unknown) => 
                              String(typeof item === 'string' ? item : (item && typeof item === 'object' && 'code' in item ? item.code : item))
                            ).join(', ')}
                          </span>
                        </div>
                      ) : null}
                      {ksaFocus.secondary && Array.isArray(ksaFocus.secondary) && ksaFocus.secondary.length > 0 ? (
                        <div>
                          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Secondary: </span>
                          <span className="text-xs text-purple-600 dark:text-purple-400">
                            {(ksaFocus.secondary as unknown[]).map((item: unknown) => 
                              String(typeof item === 'string' ? item : (item && typeof item === 'object' && 'code' in item ? item.code : item))
                            ).join(', ')}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null;
                })()}
                
                {/* Expected Outcome */}
                {task.expectedOutcome ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                      {t('expectedOutcome', 'Expected Outcome')}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      {String(task.expectedOutcome)}
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
            {(getScenarioData('tasks', []) as unknown[]).length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No tasks defined for this scenario
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}