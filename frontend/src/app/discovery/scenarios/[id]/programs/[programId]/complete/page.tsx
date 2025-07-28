'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, StarIcon, TrophyIcon, LightBulbIcon, ChartBarIcon } from '@heroicons/react/24/solid';
import { ClockIcon, BeakerIcon, ChatBubbleBottomCenterTextIcon, DocumentTextIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import DiscoveryPageLayout from '@/components/discovery/DiscoveryPageLayout';

interface SkillImprovement {
  skillId: string;
  skillName: string;
  previousLevel: number;
  currentLevel: number;
  improvement: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
}

interface TaskEvaluation {
  taskId: string;
  taskTitle: string;
  taskType: string;
  score: number;
  xpEarned: number;
  attempts: number;
  bestResponse?: string;
  skillsImproved: string[];
}

interface DiscoveryCompletionData {
  programId: string;
  scenarioId: string;
  scenarioTitle: string;
  careerType: string;
  overallScore: number;
  totalXP: number;
  totalTasks: number;
  completedTasks: number;
  timeSpentSeconds: number;
  daysUsed?: number;
  skillImprovements: SkillImprovement[];
  achievementsUnlocked: Achievement[];
  taskEvaluations: TaskEvaluation[];
  qualitativeFeedback?: {
    overallAssessment: string;
    careerAlignment: string;
    strengths: string[];
    growthAreas: string[];
    nextSteps: string[];
  };
  qualitativeFeedbackVersions?: Record<string, {
    overallAssessment: string;
    careerAlignment: string;
    strengths: string[];
    growthAreas: string[];
    nextSteps: string[];
  }>;
}

export default function DiscoveryCompletePage() {
  const params = useParams();
  const { t, i18n } = useTranslation(['common', 'discovery', 'assessment']);
  
  const [completionData, setCompletionData] = useState<DiscoveryCompletionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [translatingFeedback, setTranslatingFeedback] = useState(false);

  // These hooks will be moved after their dependencies are defined

  const generateTranslation = useCallback(async (targetLang: string) => {
    // Prevent multiple concurrent translations
    if (translatingFeedback) return;
    
    try {
      setTranslatingFeedback(true);
      
      // Call API to translate feedback
      const response = await fetch(`/api/discovery/programs/${params.programId}/translate-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetLanguage: targetLang })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.translatedFeedback) {
          setCompletionData(prev => ({
            ...prev!,
            qualitativeFeedback: data.translatedFeedback,
            qualitativeFeedbackVersions: {
              ...prev!.qualitativeFeedbackVersions,
              [targetLang]: data.translatedFeedback
            }
          }));
        }
      }
    } catch (error) {
      console.error('Failed to translate feedback:', error);
    } finally {
      setTranslatingFeedback(false);
    }
  }, [params.programId, translatingFeedback]);

  // Handle language change for qualitative feedback
  useEffect(() => {
    if (!completionData || !completionData.qualitativeFeedback) return;
    
    const handleLanguageChange = async () => {
      const versions = completionData.qualitativeFeedbackVersions || {};
      const currentLang = i18n.language === 'zh-TW' ? 'zhTW' : i18n.language;
      
      // Check if we have this language version
      if (versions[currentLang]) {
        // Use existing version
        setCompletionData(prev => ({
          ...prev!,
          qualitativeFeedback: versions[currentLang]
        }));
      } else {
        // Need to generate translation
        await generateTranslation(currentLang);
      }
    };
    
    handleLanguageChange();
  }, [i18n.language, completionData, generateTranslation]); // Only depend on language change

  const loadCompletionData = useCallback(async (regenerate = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // First, trigger completion if not already done
      const completeResponse = await fetch(`/api/discovery/programs/${params.programId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language
        }
      });
      
      if (!completeResponse.ok) {
        console.error('Failed to complete program:', await completeResponse.text());
      }
      
      // Get the program data
      const programResponse = await fetch(`/api/discovery/programs/${params.programId}`);
      if (!programResponse.ok) {
        throw new Error('Failed to load program data');
      }
      const programData = await programResponse.json();

      // Get the evaluation data (with regenerate flag if needed)
      const evalUrl = `/api/discovery/programs/${params.programId}/evaluation${regenerate ? '?regenerate=true' : ''}`;
      const evalResponse = await fetch(evalUrl, {
        headers: {
          'Accept-Language': i18n.language
        }
      });
      if (!evalResponse.ok) {
        throw new Error('Failed to load evaluation data');
      }
      const evalData = await evalResponse.json();

      // Log debug info if available
      if (evalData.debug) {
        console.log('Evaluation debug info:', evalData.debug);
      }

      // Combine the data
      setCompletionData({
        ...programData,
        ...evalData.evaluation,
        scenarioId: params.id as string,
        scenarioTitle: (() => {
          const title = programData.scenario?.title;
          if (typeof title === 'string') return title;
          if (typeof title === 'object' && title !== null) {
            const lang = i18n.language === 'zh-TW' ? 'zhTW' : i18n.language;
            return title[lang] || title.en || 'Discovery Program';
          }
          return 'Discovery Program';
        })(),
        overallScore: evalData.evaluation.overallScore || evalData.evaluation.score || 0,
        totalXP: evalData.evaluation.totalXP || programData.totalXP || 0,
        totalTasks: evalData.evaluation.totalTasks || programData.totalTasks || 0,
        completedTasks: evalData.evaluation.completedTasks || programData.completedTasks || 0,
        timeSpentSeconds: evalData.evaluation.timeSpentSeconds || 0,
        daysUsed: evalData.evaluation.daysUsed || 0,
        taskEvaluations: evalData.evaluation.taskEvaluations || [],
        qualitativeFeedbackVersions: evalData.evaluation.qualitativeFeedbackVersions || {}
      });
    } catch (err) {
      console.error('Error loading completion data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load completion data');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }, [params.programId, params.id, i18n.language]);

  // Load completion data on mount
  useEffect(() => {
    loadCompletionData();
  }, [loadCompletionData]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      // Call regenerate API
      const regenerateResponse = await fetch(`/api/discovery/programs/${params.programId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!regenerateResponse.ok) {
        throw new Error('Failed to regenerate evaluation');
      }
      
      const result = await regenerateResponse.json();
      console.log('Regeneration result:', result);
      
      // Reload the data
      await loadCompletionData(false);
    } catch (error) {
      console.error('Error regenerating evaluation:', error);
      setError('Failed to regenerate evaluation');
    } finally {
      setRegenerating(false);
    }
  };


  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'question':
        return <DocumentTextIcon className="h-5 w-5" />;
      case 'chat':
        return <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />;
      case 'creation':
        return <BeakerIcon className="h-5 w-5" />;
      case 'analysis':
        return <ChartBarIcon className="h-5 w-5" />;
      default:
        return <DocumentTextIcon className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !completionData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            {t('discovery:complete.errorLoading')}
          </h2>
          <p className="text-red-600 mb-4">{error || t('discovery:complete.noData')}</p>
          <Link
            href={`/discovery/scenarios/${params.id}`}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            {t('discovery:complete.backToScenario')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DiscoveryPageLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <TrophyIcon className="h-20 w-20 text-yellow-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {t('discovery:complete.congratulations')}
        </h1>
        <p className="text-xl text-gray-600">
          {t('discovery:complete.completedProgram', { title: completionData.scenarioTitle })}
        </p>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-indigo-600 mb-2">
            {completionData.totalXP}
          </div>
          <div className="text-sm text-gray-600">{t('discovery:complete.totalXP')}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className={`text-3xl font-bold mb-2 ${getScoreColor(completionData.overallScore)}`}>
            {completionData.overallScore}
          </div>
          <div className="text-sm text-gray-600">{t('discovery:complete.overallScore')}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {completionData.completedTasks}/{completionData.totalTasks}
          </div>
          <div className="text-sm text-gray-600">{t('discovery:complete.tasksCompleted')}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="flex justify-center items-center text-gray-700 mb-2">
            <ClockIcon className="h-6 w-6 mr-2" />
            <span className="text-xl font-semibold">
              {completionData.daysUsed !== undefined && completionData.daysUsed !== null 
                ? completionData.daysUsed === 0 ? 1 : completionData.daysUsed
                : 'N/A'}
            </span>
          </div>
          <div className="text-sm text-gray-600">{t('discovery:complete.daysUsed')}</div>
        </div>
      </div>

      {/* Achievements Section */}
      {completionData.achievementsUnlocked && completionData.achievementsUnlocked.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <StarIcon className="h-6 w-6 text-yellow-500 mr-2" />
            {t('discovery:complete.achievementsUnlocked')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {completionData.achievementsUnlocked.map((achievement) => (
              <div key={achievement.id} className="border rounded-lg p-4 flex items-center">
                <div className="flex-shrink-0 mr-3">
                  <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <StarIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold text-gray-900">{achievement.name}</h3>
                  <p className="text-sm text-gray-600">{achievement.description}</p>
                  <p className="text-sm text-indigo-600 font-medium">+{achievement.xpReward} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skill Improvements */}
      {completionData.skillImprovements && completionData.skillImprovements.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <ChartBarIcon className="h-6 w-6 text-indigo-600 mr-2" />
            {t('discovery:complete.skillImprovements')}
          </h2>
          <div className="space-y-3">
            {completionData.skillImprovements.map((skill) => (
              <div key={skill.skillId} className="border-b pb-3 last:border-b-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-900">{skill.skillName}</span>
                  <span className="text-sm text-green-600 font-semibold">
                    +{skill.improvement}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="relative h-2">
                    <div
                      className="absolute bg-gray-400 h-2 rounded-full"
                      style={{ width: `${skill.previousLevel}%` }}
                    />
                    <div
                      className="absolute bg-green-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${skill.currentLevel}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>{t('discovery:complete.previousLevel')}: {skill.previousLevel}%</span>
                  <span>{t('discovery:complete.currentLevel')}: {skill.currentLevel}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Breakdown */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <DocumentTextIcon className="h-6 w-6 text-gray-700 mr-2" />
          {t('discovery:complete.taskBreakdown')}
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('discovery:complete.task')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('discovery:complete.type')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('discovery:complete.score')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('discovery:complete.xpEarned')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('discovery:complete.attempts')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {completionData.taskEvaluations.map((task) => (
                <tr key={task.taskId}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {task.taskTitle}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      {getTaskTypeIcon(task.taskType)}
                      <span className="ml-2">{t(`discovery:taskTypes.${task.taskType}`)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`font-semibold ${getScoreColor(task.score)}`}>
                      {task.score}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-indigo-600 font-medium">
                    +{task.xpEarned}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                    {task.attempts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Feedback */}
      {completionData.qualitativeFeedback && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <LightBulbIcon className="h-6 w-6 text-yellow-500 mr-2" />
            {t('discovery:complete.aiFeedback')}
            {translatingFeedback && (
              <span className="ml-2 text-sm text-gray-500 animate-pulse">
                {t('discovery:complete.translating')}...
              </span>
            )}
          </h2>
          
          <div className={`space-y-4 ${translatingFeedback ? 'opacity-50' : ''}`}>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {t('discovery:complete.overallAssessment')}
              </h3>
              <div className="text-gray-700 prose prose-sm max-w-none">
                <ReactMarkdown>{completionData.qualitativeFeedback.overallAssessment}</ReactMarkdown>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {t('discovery:complete.careerAlignment')}
              </h3>
              <div className="text-gray-700 prose prose-sm max-w-none">
                <ReactMarkdown>{completionData.qualitativeFeedback.careerAlignment}</ReactMarkdown>
              </div>
            </div>

            {completionData.qualitativeFeedback.strengths.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {t('discovery:complete.strengths')}
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {completionData.qualitativeFeedback.strengths.map((strength, idx) => (
                    <li key={idx} className="text-gray-700">
                      <span className="prose prose-sm max-w-none inline">
                        <ReactMarkdown>{strength}</ReactMarkdown>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {completionData.qualitativeFeedback.growthAreas.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {t('discovery:complete.growthAreas')}
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {completionData.qualitativeFeedback.growthAreas.map((area, idx) => (
                    <li key={idx} className="text-gray-700">
                      <span className="prose prose-sm max-w-none inline">
                        <ReactMarkdown>{area}</ReactMarkdown>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {completionData.qualitativeFeedback.nextSteps.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {t('discovery:complete.nextSteps')}
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {completionData.qualitativeFeedback.nextSteps.map((step, idx) => (
                    <li key={idx} className="text-gray-700">
                      <span className="prose prose-sm max-w-none inline">
                        <ReactMarkdown>{step}</ReactMarkdown>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href={`/discovery/scenarios/${params.id}`}
          className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          {t('discovery:complete.backToScenario')}
        </Link>
        

        <button
          onClick={() => window.print()}
          className="inline-flex items-center px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          {t('discovery:complete.printResults')}
        </button>

        {/* Development mode only: Regenerate button */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="inline-flex items-center px-6 py-3 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating...' : 'Regenerate Evaluation'}
          </button>
        )}
      </div>
    </div>
    </DiscoveryPageLayout>
  );
}