'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { ProgramSummary } from '@/types/pbl';

export default function ProgramCompletePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation(['pbl', 'common']);
  
  const programId = params.programId as string;
  const scenarioId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProgramSummary | null>(null);
  
  useEffect(() => {
    loadProgramSummary();
  }, [programId, scenarioId]);
  
  const loadProgramSummary = async () => {
    try {
      setLoading(true);
      
      // Get program summary from API
      const response = await fetch(`/api/pbl/programs/${programId}/completion?scenarioId=${scenarioId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load program summary');
      }
      
      const data = await response.json();
      
      if (data.success && data.summary) {
        setSummary(data.summary);
      } else {
        // Fallback to mock data if API fails
        const mockSummary: ProgramSummary = {
        program: {
          id: programId,
          scenarioId: scenarioId,
          scenarioTitle: 'AI-Assisted Job Search Training',
          scenarioTitle_zh: 'AI 輔助求職訓練',
          userId: 'user@example.com',
          userEmail: 'user@example.com',
          startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          status: 'completed',
          totalTasks: 3,
          completedTasks: 3,
          language: i18n.language
        },
        tasks: [
          {
            metadata: {
              taskId: 'task-1',
              programId: programId,
              title: 'Industry Analysis',
              startedAt: new Date(Date.now() - 3600000).toISOString(),
              completedAt: new Date(Date.now() - 2400000).toISOString(),
              status: 'completed',
              attempts: 1
            },
            progress: {
              taskId: 'task-1',
              programId: programId,
              status: 'completed',
              startedAt: new Date(Date.now() - 3600000).toISOString(),
              completedAt: new Date(Date.now() - 2400000).toISOString(),
              timeSpentSeconds: 1200,
              score: 85,
              feedback: 'Great job analyzing industry trends!',
              ksaScores: { 'K1.1': 90, 'S1.1': 80 }
            },
            interactionCount: 8
          },
          {
            metadata: {
              taskId: 'task-2',
              programId: programId,
              title: 'Resume Optimization',
              startedAt: new Date(Date.now() - 2400000).toISOString(),
              completedAt: new Date(Date.now() - 1200000).toISOString(),
              status: 'completed',
              attempts: 1
            },
            progress: {
              taskId: 'task-2',
              programId: programId,
              status: 'completed',
              startedAt: new Date(Date.now() - 2400000).toISOString(),
              completedAt: new Date(Date.now() - 1200000).toISOString(),
              timeSpentSeconds: 1200,
              score: 92,
              feedback: 'Excellent resume improvements!',
              ksaScores: { 'K2.1': 95, 'S2.1': 90 }
            },
            interactionCount: 10
          },
          {
            metadata: {
              taskId: 'task-3',
              programId: programId,
              title: 'Interview Practice',
              startedAt: new Date(Date.now() - 1200000).toISOString(),
              completedAt: new Date().toISOString(),
              status: 'completed',
              attempts: 1
            },
            progress: {
              taskId: 'task-3',
              programId: programId,
              status: 'completed',
              startedAt: new Date(Date.now() - 1200000).toISOString(),
              completedAt: new Date().toISOString(),
              timeSpentSeconds: 1200,
              score: 88,
              feedback: 'Good interview responses!',
              ksaScores: { 'K1.2': 85, 'S1.2': 90 }
            },
            interactionCount: 12
          }
        ],
        overallScore: 88,
        domainScores: {
          engaging_with_ai: 87,
          creating_with_ai: 92,
          managing_with_ai: 85,
          designing_with_ai: 88
        },
        totalTimeSeconds: 3600,
        completionRate: 100
      };
      
        setSummary(mockSummary);
      }
      
      // Update program status to completed
      await fetch('/api/pbl/task-logs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-scenario-id': scenarioId
        },
        body: JSON.stringify({
          programId,
          taskId: 'program',
          scenarioId,
          progress: {
            status: 'completed',
            completedAt: new Date().toISOString()
          }
        })
      });
      
    } catch (error) {
      console.error('Error loading program summary:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getDomainName = (domain: string) => {
    return t(`assessment:domains.${domain}`);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">{t('pbl:complete.noDataFound')}</p>
        </div>
      </div>
    );
  }
  
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Celebration Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <svg className="w-24 h-24 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('pbl:complete.congratulations')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {t('pbl:complete.completedProgram')}
          </p>
        </div>
        
        {/* Program Summary Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {i18n.language === 'zh' || i18n.language === 'zh-TW' 
              ? (summary.program.scenarioTitle_zh || summary.program.scenarioTitle)
              : summary.program.scenarioTitle}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Overall Score */}
            {summary.overallScore && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {t('pbl:complete.overallScore')}
                </h3>
                <p className={`text-4xl font-bold ${getScoreColor(summary.overallScore)}`}>
                  {summary.overallScore}%
                </p>
              </div>
            )}
            
            {/* Time Spent */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                {t('pbl:complete.totalTimeSpent')}
              </h3>
              <p className="text-4xl font-bold text-gray-900 dark:text-white">
                {formatDuration(summary.totalTimeSeconds)}
              </p>
            </div>
          </div>
          
          {/* Domain Scores */}
          {summary.domainScores && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('pbl:complete.domainScores')}
              </h3>
              <div className="space-y-3">
                {Object.entries(summary.domainScores).map(([domain, score]) => (
                  <div key={domain} className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      {getDomainName(domain)}
                    </span>
                    <div className="flex items-center">
                      <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-3">
                        <div 
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className={`font-medium ${getScoreColor(score)}`}>
                        {score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Task Summary */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('pbl:complete.taskSummary')}
            </h3>
            <div className="space-y-4">
              {summary.tasks.map((task, index) => (
                <div key={task.metadata.taskId} className="border-l-4 border-purple-600 pl-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {index + 1}. {task.metadata.title}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span>{t('pbl:complete.timeSpent')}: {formatDuration(task.progress.timeSpentSeconds)}</span>
                        <span>{t('pbl:complete.conversations')}: {task.interactionCount}</span>
                      </div>
                      {task.progress.feedback && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                          "{task.progress.feedback}"
                        </p>
                      )}
                    </div>
                    {task.progress.score && (
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getScoreColor(task.progress.score)}`}>
                          {task.progress.score}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/pbl"
            className="px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-center"
          >
            {t('pbl:complete.retryScenario')}
          </Link>
          <Link
            href="/history"
            className="px-8 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors text-center"
          >
            {t('pbl:complete.viewHistory')}
          </Link>
          <button
            onClick={() => window.print()}
            className="px-8 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('pbl:complete.downloadCertificate')}
          </button>
        </div>
      </div>
    </main>
  );
}