'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ScenarioProgram, SessionData } from '@/types/pbl';
import KSAKnowledgeGraph from '@/components/pbl/KSAKnowledgeGraph';
import DomainRadarChart from '@/components/pbl/DomainRadarChart';
import KSADiagnosticReport from '@/components/pbl/KSADiagnosticReport';

export default function PBLCompletePage() {
  const { t, i18n, ready } = useTranslation(['pbl', 'homepage']);
  const params = useParams();
  const router = useRouter();
  const scenarioId = params.id as string;

  const [scenario, setScenario] = useState<ScenarioProgram | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [completedStages, setCompletedStages] = useState(0);
  const [totalInteractions, setTotalInteractions] = useState(0);
  const [analyzingStage, setAnalyzingStage] = useState<string | null>(null);

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
        } catch {
          console.log('No user cookie found, using demo user');
        }

        // Load all completed sessions for this scenario
        const sessionsResponse = await fetch(`/api/pbl/sessions?userId=${userId}&scenarioId=${scenarioId}&status=completed`);
        const sessionsData = await sessionsResponse.json();
        
        if (sessionsData.success) {
          const allSessions = sessionsData.data.sessions;
          
          // Group sessions by stage and keep only the latest one for each stage
          const latestSessionsByStage = new Map<number, SessionData>();
          
          allSessions.forEach((session: SessionData) => {
            const existingSession = latestSessionsByStage.get(session.currentStage);
            if (!existingSession || new Date(session.lastActiveAt) > new Date(existingSession.lastActiveAt)) {
              latestSessionsByStage.set(session.currentStage, session);
            }
          });
          
          // Convert map to array for display
          const latestSessions = Array.from(latestSessionsByStage.values());
          setSessions(latestSessions);
          
          // Calculate total time, completed stages, and interactions from latest sessions only
          let totalTime = 0;
          let totalMessages = 0;
          const stagesCompleted = new Set<number>();
          
          latestSessions.forEach((session: SessionData) => {
            console.log('Session:', session.id, 'TimeSpent:', session.progress.timeSpent, 'ProcessLogs:', session.processLogs?.length);
            totalTime += session.progress.timeSpent;
            stagesCompleted.add(session.currentStage);
            
            // Count user messages from process logs
            if (session.processLogs) {
              const userMessages = session.processLogs.filter(log => 
                log.actionType === 'write' && log.detail?.userInput
              );
              console.log('User messages in session:', userMessages.length);
              totalMessages += userMessages.length;
            }
          });
          
          setTotalTimeSpent(totalTime);
          setCompletedStages(stagesCompleted.size);
          setTotalInteractions(totalMessages);
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
    router.push(`/pbl/scenarios/${scenarioId}`);
  };

  const handleAnalyzeStage = async (sessionId: string, stageId: string) => {
    setAnalyzingStage(stageId);
    
    // Find the session being analyzed
    const sessionToAnalyze = sessions.find(s => s.id === sessionId);
    console.log('Analyzing session:', sessionId, 'for stage:', stageId);
    console.log('Session processLogs count:', sessionToAnalyze?.processLogs?.length || 0);
    console.log('Session status:', sessionToAnalyze?.status);
    
    try {
      const evaluateResponse = await fetch('/api/pbl/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          stageId,
          language: i18n.language
        })
      });
      
      if (evaluateResponse.ok) {
        const evaluationData = await evaluateResponse.json();
        
        // Update the session with the new stage result
        setSessions(prevSessions => 
          prevSessions.map(session => 
            session.id === sessionId 
              ? {
                  ...session,
                  stageResults: [...(session.stageResults || []), evaluationData.data.stageResult]
                }
              : session
          )
        );
      }
    } catch (error) {
      console.error('Error analyzing stage:', error);
    } finally {
      setAnalyzingStage(null);
    }
  };

  const handleGoToStage = (stageIndex: number) => {
    // Set the progress to this stage
    const progress = {
      scenarioId,
      completedStages: [],
      currentStage: stageIndex
    };
    localStorage.setItem(`pbl-progress-${scenarioId}`, JSON.stringify(progress));
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


  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Animation */}
        <div className="text-center mb-12">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full shadow-xl">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-4">
            {t('complete.congratulations')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('complete.scenarioCompleted', { title: scenario.title })}
          </p>
        </div>

        {/* Completion Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Interactions */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <span className="text-4xl font-bold bg-gradient-to-br from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {totalInteractions}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('complete.totalInteractions')}
              </p>
            </div>
          </div>

          {/* Stages Completed */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <span className="text-4xl font-bold bg-gradient-to-br from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {completedStages}/{scenario.stages.length}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('complete.stagesCompleted')}
              </p>
            </div>
          </div>

          {/* Time Spent */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {formatTime(totalTimeSpent)}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('complete.totalTimeSpent')}
              </p>
            </div>
          </div>
        </div>

        {/* AI Literacy Domains Section */}
        {(() => {
          // Calculate domain scores from all stages
          const domainScores = {
            engaging_with_ai: 0,
            creating_with_ai: 0,
            managing_with_ai: 0,
            designing_with_ai: 0
          };
          const domainCounts = { ...domainScores };
          
          sessions.forEach(session => {
            session.stageResults?.forEach(result => {
              if (result.domainScores) {
                Object.entries(result.domainScores).forEach(([domain, score]) => {
                  domainScores[domain as keyof typeof domainScores] += score;
                  domainCounts[domain as keyof typeof domainCounts] += 1;
                });
              }
            });
          });
          
          // Calculate averages
          Object.keys(domainScores).forEach(domain => {
            const key = domain as keyof typeof domainScores;
            if (domainCounts[key] > 0) {
              domainScores[key] = Math.round(domainScores[key] / domainCounts[key]);
            }
          });
          
          // Calculate overall score
          let overallScore = 0;
          let totalScores = 0;
          let scoreCount = 0;
          
          sessions.forEach(session => {
            session.stageResults?.forEach(result => {
              if (result.score) {
                totalScores += result.score;
                scoreCount++;
              }
            });
          });
          
          if (scoreCount > 0) {
            overallScore = Math.round(totalScores / scoreCount);
          }
          
          return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t('pbl:complete.domainRadarTitle')}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                {/* Radar Chart on the left */}
                <div>
                  <DomainRadarChart 
                    domainScores={domainScores}
                    title=""
                  />
                </div>
                
                {/* Domain Scores and Overall Score on the right */}
                <div className="space-y-4">
                  {/* Overall Score Card */}
                  <div className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold opacity-90">
                          {t('pbl:complete.overallScore')}
                        </h3>
                        <p className="text-sm opacity-75 mt-1">
                          {t('pbl:complete.overallScoreDescription')}
                        </p>
                      </div>
                      <div className="text-5xl font-bold">
                        {overallScore}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Domain Scores */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        {t('homepage:domains.items.engaging.name')}
                      </h5>
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {domainScores.engaging_with_ai}%
                      </span>
                    </div>
                    
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <h5 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                        {t('homepage:domains.items.creating.name')}
                      </h5>
                      <span className="text-xl font-bold text-green-600 dark:text-green-400">
                        {domainScores.creating_with_ai}%
                      </span>
                    </div>
                    
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <h5 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
                        {t('homepage:domains.items.managing.name')}
                      </h5>
                      <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                        {domainScores.managing_with_ai}%
                      </span>
                    </div>
                    
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <h5 className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
                        {t('homepage:domains.items.designing.name')}
                      </h5>
                      <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                        {domainScores.designing_with_ai}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        
        {/* KSA Competency Profile Section */}
        {(() => {
          // Aggregate all KSA scores
          const allKsaScores: { [ksa: string]: { score: number; category: 'knowledge' | 'skills' | 'attitudes' } } = {};
          
          sessions.forEach(session => {
            session.stageResults?.forEach(result => {
              Object.entries(result.ksaAchievement || {}).forEach(([ksa, achievement]) => {
                const category = ksa.charAt(0) === 'K' ? 'knowledge' : 
                                ksa.charAt(0) === 'S' ? 'skills' : 'attitudes';
                
                if (!allKsaScores[ksa] || achievement.score > allKsaScores[ksa].score) {
                  allKsaScores[ksa] = {
                    score: achievement.score,
                    category
                  };
                }
              });
            });
          });
          
          return Object.keys(allKsaScores).length > 0 ? (
            <div className="mb-8">
              <KSAKnowledgeGraph 
                ksaScores={allKsaScores}
                title={t('complete.ksaRadarTitle')}
              />
            </div>
          ) : null;
        })()}
        
        {/* KSA Diagnostic Report */}
        {(() => {
          const allStageResults = sessions.flatMap(session => session.stageResults || []);
          return allStageResults.length > 0 ? (
            <KSADiagnosticReport 
              stageResults={allStageResults}
              ksaMapping={scenario.ksaMapping}
            />
          ) : null;
        })()}


        {/* Stage Summary with Evaluations */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 border border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <span className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full mr-3"></span>
            {t('complete.stageSummary')}
          </h2>
          
          
          <div className="space-y-4">
            {scenario.stages.map((stage, index) => {
              const stageSession = sessions.find(s => s.currentStage === index);
              const stageResult = stageSession?.stageResults?.find(r => r.stageId === stage.id);
              const isCompleted = !!stageSession;
              
              return (
                <div 
                  key={stage.id}
                  className={`p-4 rounded-lg ${
                    isCompleted 
                      ? 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600' 
                      : 'bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
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
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">{stage.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{stage.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Show score if available */}
                      {stageResult?.score && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {stageResult.score}%
                          </div>
                          <p className="text-xs text-gray-500">{t('complete.score')}</p>
                        </div>
                      )}
                      
                      {/* Show analyze button if completed but no score */}
                      {isCompleted && !stageResult && (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            {t('complete.notCalculated')}
                          </span>
                          <button
                            onClick={() => handleAnalyzeStage(stageSession.id, stage.id)}
                            disabled={analyzingStage === stage.id}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                          {analyzingStage === stage.id ? (
                            <>
                              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              {t('complete.analyzing')}
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              {t('complete.calculateScore')}
                            </>
                          )}
                          </button>
                        </div>
                      )}
                      
                      {/* Show go to stage button if not completed */}
                      {!isCompleted && (
                        <button
                          onClick={() => handleGoToStage(index)}
                          className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t('complete.goToPractice')}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Stage Details - Tasks and Expected Outcomes */}
                  <div className="mt-4 pl-11 space-y-4">
                    {/* Stage Tasks */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                        {t('complete.stageTasks')}
                      </h5>
                      <ul className="space-y-2">
                        {stage.tasks.map((task, i) => (
                          <li key={i} className="flex items-start text-sm">
                            <span className="text-indigo-500 mr-2">•</span>
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">{task.title}</span>
                              <p className="text-gray-600 dark:text-gray-400 mt-1">{task.expectedOutcome}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    
                    {/* Show placeholder if no results yet */}
                    {!stageResult && isCompleted && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('complete.stageObjectives')}
                        </h5>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p className="mb-2">{t('complete.targetedKSA')}:</p>
                          <div className="flex flex-wrap gap-2">
                            {[...(stage.assessmentFocus?.primary || []), ...(stage.assessmentFocus?.secondary || [])].map(ksa => (
                              <span key={ksa} className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-xs font-medium">
                                {ksa}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Stage Feedback */}
                  {stageResult && (
                    <div className="mt-4 space-y-3 pl-11">
                      {/* KSA Achievement */}
                      {stageResult.ksaAchievement && Object.keys(stageResult.ksaAchievement).length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            KSA Achievement
                          </h5>
                          
                          {/* P/S Legend */}
                          <div className="flex items-center gap-4 text-xs mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">P</span>
                              </div>
                              <span className="text-gray-600 dark:text-gray-400">Primary Learning Objective</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">S</span>
                              </div>
                              <span className="text-gray-600 dark:text-gray-400">Secondary Learning Objective</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3">
                          {Object.entries(stageResult.ksaAchievement).map(([ksa, achievement]) => {
                            // Check if this KSA is a learning objective for this stage
                            const isPrimary = stage.assessmentFocus?.primary?.includes(ksa);
                            const isSecondary = stage.assessmentFocus?.secondary?.includes(ksa);
                            const isLearningObjective = isPrimary || isSecondary;
                            
                            return (
                              <div 
                                key={ksa} 
                                className={`text-center p-2 rounded relative border ${
                                  isLearningObjective 
                                    ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-600' 
                                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                                }`}
                              >
                                {isLearningObjective && (
                                  <div className="absolute -top-2 -right-2">
                                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">
                                        {isPrimary ? 'P' : 'S'}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                <div className={`text-xs font-medium ${
                                  isLearningObjective 
                                    ? 'text-gray-600 dark:text-gray-400' 
                                    : 'text-gray-400 dark:text-gray-500'
                                }`}>{ksa}</div>
                                <div className={`text-lg font-bold ${
                                  isLearningObjective 
                                    ? 'text-blue-600 dark:text-blue-400' 
                                    : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                  {achievement.score}%
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      )}
                      
                      {/* Rubrics Scores */}
                      {stageResult.rubricsScore && Object.keys(stageResult.rubricsScore).length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('complete.rubricsScores')}
                          </h5>
                          <div className="space-y-1">
                            {Object.entries(stageResult.rubricsScore).map(([criterion, score]) => (
                              <div key={criterion} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">{criterion}</span>
                                <div className="flex items-center">
                                  {[1, 2, 3, 4].map(level => (
                                    <div
                                      key={level}
                                      className={`w-4 h-4 rounded-full mx-0.5 ${
                                        level <= score.level
                                          ? 'bg-blue-500'
                                          : 'bg-gray-300 dark:bg-gray-600'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Strengths */}
                      {stageResult.feedback?.strengths && stageResult.feedback.strengths.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                            {t('complete.strengths')}
                          </h4>
                          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            {stageResult.feedback.strengths.map((strength, i) => (
                              <li key={i} className="flex items-start">
                                <span className="text-green-500 mr-2">•</span>
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Improvements */}
                      {stageResult.feedback?.improvements && stageResult.feedback.improvements.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">
                            {t('complete.improvements')}
                          </h4>
                          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            {stageResult.feedback.improvements.map((improvement, i) => (
                              <li key={i} className="flex items-start">
                                <span className="text-orange-500 mr-2">•</span>
                                {improvement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="mb-6" />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <button
            onClick={handleViewHistory}
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <span className="relative z-10">{t('complete.viewHistory')}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </button>
          
          <button
            onClick={handleRetryScenario}
            className="group relative px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <span className="relative z-10">{t('complete.retryScenario')}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-gray-700 to-gray-800 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </button>
          
          <button
            onClick={handleBackToPBL}
            className="group relative px-8 py-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <span className="relative z-10">{t('complete.backToPBL')}</span>
            <div className="absolute inset-0 bg-gray-50 dark:bg-gray-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </button>
        </div>
      </div>
    </main>
  );
}