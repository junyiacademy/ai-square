'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { PBLCompletionSkeleton } from '@/components/pbl/loading-skeletons';
import type { 
  CompletionData, 
  ScenarioData, 
  QualitativeFeedback,
  LocalizedFeedback
} from '@/types/pbl-completion';

export default function ProgramCompletePage() {
  const params = useParams();
  // const router = useRouter();
  const { t, i18n } = useTranslation(['pbl', 'common', 'assessment']);
  
  const programId = params.programId as string;
  const scenarioId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  // const [feedbackError, setFeedbackError] = useState<string | null>(null);
  
  // Use ref to prevent duplicate API calls
  const loadingRef = useRef(false);
  const feedbackGeneratingRef = useRef(false);
  const isMountedRef = useRef(false);
  
  useEffect(() => {
    // Check if already mounted (handles StrictMode double mount)
    if (isMountedRef.current) return;
    isMountedRef.current = true;
    
    loadProgramData();
    
    // Cleanup function for StrictMode
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Listen for language changes
  useEffect(() => {
    if (!completionData || generatingFeedback || feedbackGeneratingRef.current) return;
    
    // Check if feedback exists for current language
    const currentLang = i18n.language.split('-')[0] || 'en';
    const hasFeedbackForLang = completionData.qualitativeFeedback && 
      (typeof completionData.qualitativeFeedback === 'object' &&
       ((completionData.qualitativeFeedback as LocalizedFeedback)[currentLang] || 
        ('overallAssessment' in completionData.qualitativeFeedback && 
         completionData.feedbackLanguage === currentLang)));
    
    // Generate feedback for new language if not exists
    if (!hasFeedbackForLang) {
      generateFeedback();
    }
  }, [i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const loadProgramData = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    try {
      setLoading(true);
      
      // Load both scenario and completion data in parallel
      const [scenarioRes, completionRes] = await Promise.all([
        fetch(`/api/pbl/scenarios/${scenarioId}`),
        fetch(`/api/pbl/completion?programId=${programId}&scenarioId=${scenarioId}`)
      ]);
      
      // Process scenario data
      if (scenarioRes.ok) {
        const scenarioResult = await scenarioRes.json();
        setScenarioData(scenarioResult.data);
      }
      
      // Process completion data
      if (!completionRes.ok) {
        // If completion.json doesn't exist, try to create it
        const updateRes = await fetch(`/api/pbl/completion`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programId, scenarioId })
        });
        
        if (updateRes.ok) {
          // Try to get the newly created completion data
          const retryResponse = await fetch(`/api/pbl/completion?programId=${programId}&scenarioId=${scenarioId}`);
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            if (data.success && data.data) {
              setCompletionData(data.data);
              
              // Generate feedback for newly created completion
              if (!data.data.qualitativeFeedback && !feedbackGeneratingRef.current) {
                await generateFeedback();
              }
            }
          }
        }
      } else {
        const data = await completionRes.json();
        if (data.success && data.data) {
          setCompletionData(data.data);
          
          // Check if qualitative feedback exists for current language
          const currentLang = i18n.language.split('-')[0] || 'en';
          const hasFeedbackForLang = data.data.qualitativeFeedback && 
            (typeof data.data.qualitativeFeedback === 'object' &&
             (data.data.qualitativeFeedback[currentLang] || 
              data.data.qualitativeFeedback.overallAssessment)); // Support old format
          
          if (!hasFeedbackForLang && !feedbackGeneratingRef.current) {
            await generateFeedback();
          }
        }
      }
      
    } catch (error) {
      console.error('Error loading program data:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };
  
  const generateFeedback = async (forceRegenerate = false) => {
    if (feedbackGeneratingRef.current) return;
    feedbackGeneratingRef.current = true;
    
    try {
      setGeneratingFeedback(true);
      
      const response = await fetch('/api/pbl/generate-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language,
        },
        body: JSON.stringify({
          programId,
          scenarioId,
          forceRegenerate,
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.feedback) {
        // Update completion data with the new feedback
        const currentLang = i18n.language.split('-')[0] || 'en';
        setCompletionData((prev) => {
          if (!prev) return null;
          
          // Handle multi-language feedback format
          const isMultiLang = typeof prev.qualitativeFeedback === 'object' && 
                             !('overallAssessment' in (prev.qualitativeFeedback as QualitativeFeedback));
          
          if (isMultiLang) {
            // New multi-language format
            return {
              ...prev,
              qualitativeFeedback: {
                ...(prev.qualitativeFeedback as LocalizedFeedback),
                [currentLang]: result.feedback
              } as LocalizedFeedback
            };
          } else {
            // Migrate from old format to new format
            return {
              ...prev,
              qualitativeFeedback: {
                [currentLang]: result.feedback
              } as LocalizedFeedback
            };
          }
        });
      } else {
        throw new Error(result.error || 'Failed to generate feedback');
      }
    } catch (error) {
      console.error('Error generating feedback:', error);
      // Error generating feedback
    } finally {
      setGeneratingFeedback(false);
      feedbackGeneratingRef.current = false;
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
  
  // Unused function - keeping for potential future use
  // const getScoreBgColor = (score: number) => {
  //   if (score >= 90) return 'bg-green-600';
  //   if (score >= 80) return 'bg-blue-600';
  //   if (score >= 70) return 'bg-yellow-600';
  //   if (score >= 50) return 'bg-orange-600';
  //   return 'bg-red-600';
  // };
  
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PBLCompletionSkeleton />
        </div>
      </main>
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
    i18n.language === 'zhTW' 
      ? (scenarioData.title_zhTW || scenarioData.title)
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
        
        {/* Qualitative Feedback Section */}
        {(() => {
          // Get feedback for current language
          const currentLang = i18n.language.split('-')[0] || 'en';
          let feedback: QualitativeFeedback | undefined;
          
          if (completionData?.qualitativeFeedback) {
            if ('overallAssessment' in completionData.qualitativeFeedback) {
              // Old format - single language feedback
              feedback = completionData.qualitativeFeedback as QualitativeFeedback;
            } else {
              // New format - multi-language feedback
              feedback = (completionData.qualitativeFeedback as LocalizedFeedback)[currentLang];
            }
          }
          
          const hasFeedback = feedback?.overallAssessment;
          
          return (hasFeedback || generatingFeedback) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
              {generatingFeedback ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('pbl:complete.generatingFeedback', 'Generating personalized feedback...')}
                  </p>
                </div>
              ) : feedback ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {t('pbl:complete.qualitativeFeedback', 'Personalized Feedback')}
                    </h2>
                    {process.env.NODE_ENV === 'development' && (
                      <button
                        onClick={() => {
                          // Force regenerate feedback
                          generateFeedback(true);
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        title="Regenerate feedback (Dev only)"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* Overall Assessment */}
                  <div className="mb-6">
                    <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                      {feedback.overallAssessment}
                    </p>
                  </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Strengths */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-green-900 dark:text-green-100 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('pbl:complete.strengths', 'Your Strengths')}
                    </h3>
                    <div className="space-y-3">
                      {feedback.strengths?.map((strength, index) => (
                        <div key={index}>
                          <h4 className="font-medium text-green-800 dark:text-green-200">
                            {strength.area}
                          </h4>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            {strength.description}
                          </p>
                          {strength.example && (
                            <p className="text-sm text-green-600 dark:text-green-400 italic mt-2 pl-4 border-l-2 border-green-300 dark:border-green-600">
                              &ldquo;{strength.example}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Areas for Improvement */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {t('pbl:complete.areasForImprovement', 'Growth Opportunities')}
                    </h3>
                    <div className="space-y-3">
                      {feedback.areasForImprovement?.map((area, index) => (
                        <div key={index}>
                          <h4 className="font-medium text-blue-800 dark:text-blue-200">
                            {area.area}
                          </h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            {area.description}
                          </p>
                          {area.suggestion && (
                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 flex items-start">
                              <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              {area.suggestion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Next Steps */}
                {feedback.nextSteps && feedback.nextSteps.length > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-medium text-purple-900 dark:text-purple-100 mb-4">
                      {t('pbl:complete.nextSteps', 'Recommended Next Steps')}
                    </h3>
                    <ul className="space-y-2">
                      {feedback.nextSteps.map((step, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-purple-600 dark:text-purple-400 mr-2">
                            {index + 1}.
                          </span>
                          <span className="text-purple-800 dark:text-purple-200">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Encouragement */}
                {feedback.encouragement && (
                  <div className="text-center p-6 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
                    <p className="text-lg text-gray-800 dark:text-gray-200 italic">
                      &ldquo;{feedback.encouragement}&rdquo;
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </div>
          );
        })()}
        
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
                  {completionData.tasks?.reduce((sum, task) => 
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
                {Object.entries(completionData.domainScores).map(([domain, score]) => (
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
            {completionData.tasks?.map((task, index) => {
              const matchedTask = scenarioData?.tasks?.find((t) => t.id === task.taskId);
              const taskTitle = matchedTask?.title || task.taskId;
              const taskTitleLocalized = matchedTask ? (
                i18n.language === 'zhTW' 
                  ? (matchedTask.title_zhTW || taskTitle)
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
                          {task.log?.interactions?.filter((i) => i.type === 'user').length || 0} {t('pbl:complete.conversations')}
                        </span>
                        {task.evaluation && (
                          <span className={`font-medium ${getScoreColor(task.evaluation.score)}`}>
                            {t('pbl:learn.overallScore')}: {task.evaluation.score}%
                          </span>
                        )}
                      </div>
                      
                      {/* Task Evaluation Details */}
                      {task.evaluation && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                          {/* Two Column Layout for Domain & KSA Scores */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Domain Scores Column */}
                            {task.evaluation.domainScores && (
                              <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                  {t('pbl:complete.domainScores')}:
                                </div>
                                <div className="space-y-3">
                                  {['creating_with_ai', 'designing_with_ai', 'engaging_with_ai', 'managing_with_ai']
                                    .filter(domain => task.evaluation?.domainScores?.[domain] !== undefined)
                                    .map((domain) => {
                                      const score = task.evaluation?.domainScores?.[domain] || 0;
                                      return (
                                        <div key={domain}>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                              {t(`assessment:domains.${domain}`)}
                                            </span>
                                            <span className={`text-sm font-bold ${getScoreColor(score)}`}>
                                              {score}%
                                            </span>
                                          </div>
                                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                            <div 
                                              className={`h-2 rounded-full ${
                                                domain === 'engaging_with_ai' ? 'bg-blue-500' :
                                                domain === 'creating_with_ai' ? 'bg-green-500' :
                                                domain === 'managing_with_ai' ? 'bg-orange-500' :
                                                'bg-purple-500'
                                              }`}
                                              style={{ width: `${score}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}
                            
                            {/* KSA Scores Column */}
                            {task.evaluation.ksaScores && (
                              <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                  {t('pbl:complete.ksa')}:
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('pbl:complete.knowledge')}
                                      </span>
                                      <span className={`text-sm font-bold ${getScoreColor(task.evaluation.ksaScores.knowledge)}`}>
                                        {task.evaluation.ksaScores.knowledge}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                      <div 
                                        className="bg-blue-500 h-2 rounded-full"
                                        style={{ width: `${task.evaluation.ksaScores.knowledge}%` }}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('pbl:complete.skills')}
                                      </span>
                                      <span className={`text-sm font-bold ${getScoreColor(task.evaluation.ksaScores.skills)}`}>
                                        {task.evaluation.ksaScores.skills}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                      <div 
                                        className="bg-green-500 h-2 rounded-full"
                                        style={{ width: `${task.evaluation.ksaScores.skills}%` }}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('pbl:complete.attitudes')}
                                      </span>
                                      <span className={`text-sm font-bold ${getScoreColor(task.evaluation.ksaScores.attitudes)}`}>
                                        {task.evaluation.ksaScores.attitudes}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                      <div 
                                        className="bg-purple-500 h-2 rounded-full"
                                        style={{ width: `${task.evaluation.ksaScores.attitudes}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Conversation Insights */}
                          {task.evaluation.conversationInsights && (
                            <div className="mb-3">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('pbl:learn.conversationInsights')}
                              </h4>
                              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                {/* Effective Examples */}
                                {task.evaluation?.conversationInsights?.effectiveExamples && 
                                 Array.isArray(task.evaluation.conversationInsights.effectiveExamples) &&
                                 task.evaluation.conversationInsights.effectiveExamples.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                                      {t('pbl:learn.effectiveExamples')}
                                    </p>
                                    {task.evaluation.conversationInsights.effectiveExamples.map((example, idx) => (
                                      <div key={idx} className="bg-green-50 dark:bg-green-900/20 rounded p-2 mb-1">
                                        <p className="text-xs italic border-l-2 border-green-300 dark:border-green-500 pl-2 mb-1">
                                          &ldquo;{example.quote}&rdquo;
                                        </p>
                                        <p className="text-xs">{example.suggestion}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Improvement Areas */}
                                {task.evaluation.conversationInsights.improvementAreas && 
                                 Array.isArray(task.evaluation.conversationInsights.improvementAreas) &&
                                 task.evaluation.conversationInsights.improvementAreas.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                                      {t('pbl:learn.improvementExamples')}
                                    </p>
                                    {task.evaluation.conversationInsights.improvementAreas.map((area, idx) => (
                                      <div key={idx} className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2 mb-1">
                                        <p className="text-xs italic border-l-2 border-yellow-300 dark:border-yellow-500 pl-2 mb-1">
                                          &ldquo;{area.quote}&rdquo;
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
                          {task.evaluation.strengths && 
                           Array.isArray(task.evaluation.strengths) &&
                           task.evaluation.strengths.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('pbl:complete.strengths')}
                              </h4>
                              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                {task.evaluation.strengths.map((strength, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-green-500 mr-2">✓</span>
                                    {strength}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Areas for Improvement */}
                          {task.evaluation.improvements && 
                           Array.isArray(task.evaluation.improvements) &&
                           task.evaluation.improvements.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('pbl:complete.improvements')}
                              </h4>
                              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                {task.evaluation.improvements.map((improvement, idx) => (
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
            {t('pbl:complete.print')}
          </button>
        </div>
      </div>
    </main>
  );
}