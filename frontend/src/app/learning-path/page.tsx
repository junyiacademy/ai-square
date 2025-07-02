'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import type { AssessmentResult } from '@/types/assessment';

interface LearningPathItem {
  id: string;
  type: 'pbl_scenario' | 'reading' | 'practice';
  priority: 'high' | 'medium' | 'low';
  domain: string;
  title: string;
  description: string;
  estimatedTime: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  reason: string;
  scenarioId?: string;
  completed?: boolean;
  progress?: number;
}

interface DomainProgress {
  domain: string;
  currentScore: number;
  targetScore: number;
  completedItems: number;
  totalItems: number;
}

export default function LearningPathPage() {
  const router = useRouter();
  const { t } = useTranslation(['learning', 'common', 'assessment']);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPathItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainProgress, setDomainProgress] = useState<DomainProgress[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    // Get assessment result
    const resultStr = localStorage.getItem('assessmentResult');
    if (!resultStr) {
      // No assessment result, redirect to assessment
      router.push('/assessment');
      return;
    }

    const result = JSON.parse(resultStr) as AssessmentResult;
    setAssessmentResult(result);

    // Generate learning path based on assessment
    generateLearningPath(result);
    setLoading(false);
  }, [router]);

  const generateLearningPath = async (result: AssessmentResult) => {
    try {
      // Fetch PBL scenarios
      const response = await fetch('/api/pbl/scenarios');
      const scenariosData = await response.json();
      
      // Handle the nested data structure
      const scenarios = scenariosData.data?.scenarios || scenariosData.scenarios || [];
      
      // Ensure scenarios is an array
      if (!Array.isArray(scenarios)) {
        console.error('Scenarios is not an array:', scenarios);
        setLearningPath([]);
        setDomainProgress([]);
        return;
      }

      const path: LearningPathItem[] = [];
      const progress: DomainProgress[] = [];

      // Analyze each domain
      Object.entries(result.domainScores).forEach(([domain, score]) => {
        const domainKey = domain.replace('_', ' ');
        const isWeak = score < 60;
        const isStrong = score >= 80;

        // Filter scenarios for this domain
        const domainScenarios = scenarios.filter((s: any) => 
          s.domains?.includes(domain) || s.domains?.includes(domainKey) ||
          s.targetDomain?.includes(domain) || s.targetDomain?.includes(domainKey)
        );

        // Add domain progress
        const domainItems: LearningPathItem[] = [];

        if (isWeak) {
          // For weak domains, recommend beginner scenarios
          const beginnerScenarios = domainScenarios.filter((s: any) => 
            s.difficulty === 'beginner' || s.difficulty === 'intermediate'
          );

          beginnerScenarios.slice(0, 3).forEach((scenario: any) => {
            const item: LearningPathItem = {
              id: `pbl-${scenario.id}`,
              type: 'pbl_scenario',
              priority: 'high',
              domain,
              title: scenario.title,
              description: scenario.description,
              estimatedTime: scenario.estimatedDuration || scenario.estimated_duration || 30,
              difficulty: scenario.difficulty,
              reason: t('learning:learningPath.weakDomainReason', { domain: domainKey, score }),
              scenarioId: scenario.id,
              completed: false,
              progress: 0
            };
            domainItems.push(item);
            path.push(item);
          });
        } else if (isStrong) {
          // For strong domains, recommend advanced scenarios
          const advancedScenarios = domainScenarios.filter((s: any) => 
            s.difficulty === 'advanced' || s.difficulty === 'intermediate'
          );

          advancedScenarios.slice(0, 1).forEach((scenario: any) => {
            const item: LearningPathItem = {
              id: `pbl-${scenario.id}`,
              type: 'pbl_scenario',
              priority: 'medium',
              domain,
              title: scenario.title,
              description: scenario.description,
              estimatedTime: scenario.estimatedDuration || scenario.estimated_duration || 45,
              difficulty: scenario.difficulty,
              reason: t('learning:learningPath.strongDomainReason', { domain: domainKey, score }),
              scenarioId: scenario.id,
              completed: false,
              progress: 0
            };
            domainItems.push(item);
            path.push(item);
          });
        } else {
          // For average domains, recommend intermediate scenarios
          const intermediateScenarios = domainScenarios.filter((s: any) => 
            s.difficulty === 'intermediate'
          );

          intermediateScenarios.slice(0, 2).forEach((scenario: any) => {
            const item: LearningPathItem = {
              id: `pbl-${scenario.id}`,
              type: 'pbl_scenario',
              priority: 'medium',
              domain,
              title: scenario.title,
              description: scenario.description,
              estimatedTime: scenario.estimatedDuration || scenario.estimated_duration || 30,
              difficulty: scenario.difficulty,
              reason: t('learning:learningPath.averageDomainReason', { domain: domainKey, score }),
              scenarioId: scenario.id,
              completed: false,
              progress: 0
            };
            domainItems.push(item);
            path.push(item);
          });
        }

        progress.push({
          domain,
          currentScore: score,
          targetScore: Math.min(score + 20, 100),
          completedItems: 0,
          totalItems: domainItems.length
        });
      });

      // Sort path by priority
      path.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setLearningPath(path);
      setDomainProgress(progress);
    } catch (error) {
      console.error('Error generating learning path:', error);
    }
  };

  const getDomainName = (domainKey: string) => {
    return t(`assessment:domains.${domainKey}`);
  };

  const getDomainColor = (domain: string) => {
    const colors: { [key: string]: string } = {
      engaging_with_ai: 'from-blue-500 to-blue-600',
      creating_with_ai: 'from-purple-500 to-purple-600',
      managing_with_ai: 'from-green-500 to-green-600',
      designing_with_ai: 'from-orange-500 to-orange-600'
    };
    return colors[domain] || 'from-gray-500 to-gray-600';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔥';
      case 'medium': return '⭐';
      case 'low': return '📌';
      default: return '📌';
    }
  };

  const filteredPath = selectedDomain 
    ? learningPath.filter(item => item.domain === selectedDomain)
    : learningPath;

  const totalEstimatedTime = filteredPath.reduce((sum, item) => sum + item.estimatedTime, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t('learningPath.title', { ns: 'learning' })}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t('learningPath.subtitle', { ns: 'learning' })}
          </p>
        </div>

        {/* Overall Progress Card */}
        {assessmentResult && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('learningPath.yourProgress', { ns: 'learning' })}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {domainProgress.map((progress) => (
                <div 
                  key={progress.domain} 
                  className="cursor-pointer"
                  onClick={() => setSelectedDomain(
                    selectedDomain === progress.domain ? null : progress.domain
                  )}
                >
                  <div className={`p-4 rounded-lg bg-gradient-to-r ${getDomainColor(progress.domain)} ${
                    selectedDomain === progress.domain ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}>
                    <h3 className="text-white font-medium mb-2">
                      {getDomainName(progress.domain)}
                    </h3>
                    <div className="flex justify-between items-center text-white/90 text-sm">
                      <span>{t('learningPath.currentScore')}: {progress.currentScore}%</span>
                      <span>{t('learningPath.target')}: {progress.targetScore}%</span>
                    </div>
                    <div className="mt-2 bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-white rounded-full h-2 transition-all duration-300"
                        style={{ width: `${(progress.completedItems / progress.totalItems) * 100 || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/80 mt-1">
                      {progress.completedItems}/{progress.totalItems} {t('learningPath.completed')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Info */}
        {selectedDomain && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600 dark:text-gray-400">
              {t('learning:learningPath.filteringBy', { domain: getDomainName(selectedDomain) })}
            </p>
            <button
              onClick={() => setSelectedDomain(null)}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t('learning:learningPath.clearFilter')}
            </button>
          </div>
        )}

        {/* Learning Path Items */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t('learning:learningPath.recommendedPath')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('learning:learningPath.estimatedTime', { 
                hours: Math.floor(totalEstimatedTime / 60),
                minutes: totalEstimatedTime % 60
              })}
            </p>
          </div>

          {filteredPath.map((item, index) => (
            <div 
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3">{getPriorityIcon(item.priority)}</span>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                      <span className={`ml-3 px-2 py-1 text-xs rounded-full ${getDifficultyColor(item.difficulty)}`}>
                        {t(`common:difficulty.${item.difficulty}`)}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {item.description}
                    </p>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-500">
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{item.estimatedTime} {t('common:minutes')}</span>
                      <span className="mx-2">•</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        {getDomainName(item.domain)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-500 italic">
                        {item.reason}
                      </p>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    {item.type === 'pbl_scenario' && item.scenarioId && (
                      <Link
                        href={`/pbl/scenarios/${item.scenarioId}`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {t('learning:learningPath.startLearning')}
                        <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {item.progress !== undefined && item.progress > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <span>{t('learning:learningPath.progress')}</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-12 text-center space-y-4">
          <Link 
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {t('learning:learningPath.goToDashboard')}
            <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="text-gray-600 dark:text-gray-400">
            {t('learning:learningPath.dashboardHint')}
          </p>
        </div>
      </div>
    </div>
  );
}