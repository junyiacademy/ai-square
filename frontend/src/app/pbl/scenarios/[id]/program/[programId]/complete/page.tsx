'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export default function ProgramCompletePage() {
  const params = useParams();
  const router = useRouter();
  const { t, i18n } = useTranslation(['pbl', 'common', 'assessment']);
  
  const programId = params.programId as string;
  const scenarioId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [completionData, setCompletionData] = useState<any>(null);
  const [scenarioData, setScenarioData] = useState<any>(null);
  
  useEffect(() => {
    loadProgramData();
  }, [programId, scenarioId]);
  
  const loadProgramData = async () => {
    try {
      setLoading(true);
      
      // Load scenario data first
      const scenarioRes = await fetch(`/api/pbl/scenarios/${scenarioId}`);
      if (scenarioRes.ok) {
        const scenarioResult = await scenarioRes.json();
        setScenarioData(scenarioResult.data);
      }
      
      // Get completion data
      const response = await fetch(`/api/pbl/completion?programId=${programId}&scenarioId=${scenarioId}`);
      
      if (!response.ok) {
        // If completion.json doesn't exist, try to create it
        await fetch(`/api/pbl/completion`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programId, scenarioId })
        });
        
        // Try again
        const retryResponse = await fetch(`/api/pbl/completion?programId=${programId}&scenarioId=${scenarioId}`);
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          if (data.success && data.data) {
            setCompletionData(data.data);
          }
        }
      } else {
        const data = await response.json();
        if (data.success && data.data) {
          setCompletionData(data.data);
        }
      }
      
    } catch (error) {
      console.error('Error loading program data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return t('pbl:complete.timeFormat.hours', { hours, minutes });
    } else if (minutes > 0) {
      return t('pbl:complete.timeFormat.minutes', { minutes, seconds: remainingSeconds });
    }
    return t('pbl:complete.timeFormat.seconds', { seconds: remainingSeconds });
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };
  
  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-600';
    if (score >= 80) return 'bg-blue-600';
    if (score >= 70) return 'bg-yellow-600';
    if (score >= 50) return 'bg-orange-600';
    return 'bg-red-600';
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  if (!completionData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">{t('pbl:complete.noDataFound')}</p>
          <Link 
            href={`/pbl/scenarios/${scenarioId}`}
            className="mt-4 inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            {t('pbl:complete.backToPBL')}
          </Link>
        </div>
      </div>
    );
  }
  
  const scenarioTitle = scenarioData ? (
    i18n.language === 'zh' || i18n.language === 'zh-TW' 
      ? (scenarioData.title_zh || scenarioData.title)
      : scenarioData.title
  ) : 'Scenario';
  
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
            {t('pbl:complete.scenarioCompleted', { title: scenarioTitle })}
          </p>
        </div>
        
        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Overall Score */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('pbl:complete.overallScore')}
            </h3>
            <div className="text-center mb-4">
              <p className={`text-5xl font-bold ${getScoreColor(completionData.overallScore || 0)}`}>
                {completionData.overallScore || 0}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {completionData.evaluatedTasks}/{completionData.totalTasks} {t('pbl:history.tasksEvaluated')}
              </p>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('pbl:complete.conversationCount')}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {completionData.tasks?.reduce((sum: number, task: any) => 
                    sum + (task.log?.interactions?.length || 0), 0) || 0} {t('pbl:history.times')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('pbl:complete.totalTimeSpent')}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatDuration(completionData.totalTimeSeconds || 0)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Middle Column - Domain Scores */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('pbl:complete.domainScores')}
            </h3>
            {completionData.domainScores && (
              <div className="space-y-4">
                {Object.entries(completionData.domainScores).map(([domain, score]: [string, any]) => (
                  <div key={domain}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t(`assessment:domains.${domain}`)}
                      </span>
                      <span className={`text-sm font-medium ${getScoreColor(score)}`}>
                        {score}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          domain === 'engaging_with_ai' ? 'bg-blue-600' :
                          domain === 'creating_with_ai' ? 'bg-green-600' :
                          domain === 'managing_with_ai' ? 'bg-yellow-600' :
                          'bg-purple-600'
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Right Column - KSA Scores */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('pbl:complete.ksaSummary')}
            </h3>
            {completionData.ksaScores && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('pbl:complete.knowledge')}
                    </span>
                    <span className={`text-sm font-medium ${getScoreColor(completionData.ksaScores.knowledge)}`}>
                      {completionData.ksaScores.knowledge}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${completionData.ksaScores.knowledge}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('pbl:complete.skills')}
                    </span>
                    <span className={`text-sm font-medium ${getScoreColor(completionData.ksaScores.skills)}`}>
                      {completionData.ksaScores.skills}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${completionData.ksaScores.skills}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('pbl:complete.attitudes')}
                    </span>
                    <span className={`text-sm font-medium ${getScoreColor(completionData.ksaScores.attitudes)}`}>
                      {completionData.ksaScores.attitudes}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${completionData.ksaScores.attitudes}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Task Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            {t('pbl:complete.taskSummary')}
          </h2>
          
          <div className="space-y-6">
            {completionData.tasks?.map((task: any, index: number) => {
              const taskTitle = scenarioData?.tasks?.find((t: any) => t.id === task.taskId)?.title || task.taskId;
              const taskTitleLocalized = scenarioData?.tasks?.find((t: any) => t.id === task.taskId) ? (
                i18n.language === 'zh' || i18n.language === 'zh-TW' 
                  ? (scenarioData.tasks.find((t: any) => t.id === task.taskId).title_zh || taskTitle)
                  : taskTitle
              ) : taskTitle;
              
              return (
                <div key={task.taskId} className="border-l-4 border-purple-600 pl-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {index + 1}. {taskTitleLocalized}
                      </h3>
                      
                      {/* Task Metadata */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDuration(task.progress?.timeSpentSeconds || 0)}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {task.log?.interactions?.filter((i: any) => i.type === 'user').length || 0} {t('pbl:complete.conversations')}
                        </span>
                        {task.evaluation && (
                          <span className={`font-medium ${getScoreColor(task.evaluation.score)}`}>
                            {t('pbl:learn.overallScore')}: {task.evaluation.score}%
                          </span>
                        )}
                      </div>
                      
                      {/* Task Evaluation Details */}
                      {task.evaluation && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                          {/* Domain Scores */}
                          {task.evaluation.domainScores && (
                            <div className="mb-2">
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                {t('pbl:complete.domainScores')}:
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                {Object.entries(task.evaluation.domainScores).map(([domain, score]: [string, any]) => (
                                  <div key={domain} className="flex items-center">
                                    <span className="text-gray-500 dark:text-gray-400 flex-1">
                                      {t(`assessment:domains.${domain}`).split(' ')[0]}
                                    </span>
                                    <span className={`font-medium ${getScoreColor(score)} ml-2`}>
                                      {score}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Mini KSA Scores */}
                          {task.evaluation.ksaScores && (
                            <div className="flex gap-3 text-sm mb-2">
                              <span>
                                <span className="text-gray-600 dark:text-gray-400">K:</span>
                                <span className={`font-medium ${getScoreColor(task.evaluation.ksaScores.knowledge)}`}>
                                  {task.evaluation.ksaScores.knowledge}%
                                </span>
                              </span>
                              <span>
                                <span className="text-gray-600 dark:text-gray-400">S:</span>
                                <span className={`font-medium ${getScoreColor(task.evaluation.ksaScores.skills)}`}>
                                  {task.evaluation.ksaScores.skills}%
                                </span>
                              </span>
                              <span>
                                <span className="text-gray-600 dark:text-gray-400">A:</span>
                                <span className={`font-medium ${getScoreColor(task.evaluation.ksaScores.attitudes)}`}>
                                  {task.evaluation.ksaScores.attitudes}%
                                </span>
                              </span>
                            </div>
                          )}
                          
                          {/* Conversation Insights */}
                          {task.evaluation.conversationInsights && (
                            <div className="mb-3">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('pbl:learn.conversationInsights')}
                              </h4>
                              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                {/* Effective Examples */}
                                {task.evaluation.conversationInsights.effectiveExamples?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                                      {t('pbl:learn.effectiveExamples')}
                                    </p>
                                    {task.evaluation.conversationInsights.effectiveExamples.map((example: any, idx: number) => (
                                      <div key={idx} className="bg-green-50 dark:bg-green-900/20 rounded p-2 mb-1">
                                        <p className="text-xs italic border-l-2 border-green-300 dark:border-green-500 pl-2 mb-1">
                                          "{example.quote}"
                                        </p>
                                        <p className="text-xs">{example.suggestion}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Improvement Areas */}
                                {task.evaluation.conversationInsights.improvementAreas?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                                      {t('pbl:learn.improvementExamples')}
                                    </p>
                                    {task.evaluation.conversationInsights.improvementAreas.map((area: any, idx: number) => (
                                      <div key={idx} className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2 mb-1">
                                        <p className="text-xs italic border-l-2 border-yellow-300 dark:border-yellow-500 pl-2 mb-1">
                                          "{area.quote}"
                                        </p>
                                        <p className="text-xs">{area.suggestion}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Strengths */}
                          {task.evaluation.strengths?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('pbl:complete.strengths')}
                              </h4>
                              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                {task.evaluation.strengths.map((strength: string, idx: number) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-green-500 mr-2">✓</span>
                                    {strength}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Areas for Improvement */}
                          {task.evaluation.improvements?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('pbl:complete.improvements')}
                              </h4>
                              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                {task.evaluation.improvements.map((improvement: string, idx: number) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-yellow-500 mr-2">•</span>
                                    {improvement}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={`/pbl/scenarios/${scenarioId}`}
            className="px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-center"
          >
            {t('pbl:complete.retryScenario')}
          </Link>
          <Link
            href="/pbl/history"
            className="px-8 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors text-center"
          >
            {t('pbl:complete.viewHistory')}
          </Link>
          <button
            onClick={() => window.print()}
            className="px-8 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('common:print')}
          </button>
        </div>
      </div>
    </main>
  );
}