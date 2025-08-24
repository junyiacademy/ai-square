'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HistoryPageSkeleton } from '@/components/ui/history-skeletons';
import { formatDateWithLocale } from '@/utils/locale';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';

// Reuse interfaces from existing history pages
interface AssessmentHistoryItem {
  assessment_id: string;
  timestamp: string;
  scores: {
    overall: number;
    domains: {
      engaging_with_ai: number;
      creating_with_ai: number;
      managing_with_ai: number;
      designing_with_ai: number;
    };
  };
  summary: {
    total_questions: number;
    correct_answers: number;
    level: string;
  };
  duration_seconds: number;
  language: string;
}

interface PBLSession {
  id: string;
  logId: string;
  scenarioId: string;
  scenarioTitle: string;
  currentTaskId?: string;
  currentTaskTitle?: string;
  status: 'completed' | 'in_progress' | 'paused';
  startedAt: string;
  completedAt?: string;
  duration: number; // in seconds
  progress: {
    percentage: number;
    completedTasks: number;
    totalTaskCount: number;
  };
  score?: number;
  totalInteractions?: number;
  averageScore?: number;
  domainScores?: {
    engaging_with_ai: number;
    creating_with_ai: number;
    managing_with_ai: number;
    designing_with_ai: number;
  };
  ksaScores?: {
    knowledge: number;
    skills: number;
    attitudes: number;
  };
}

interface DiscoverySession {
  id: string;
  programId: string;
  scenarioId: string;
  scenarioTitle: string;
  careerType: string;
  currentTaskId?: string;
  currentTaskTitle?: string;
  status: 'completed' | 'active' | 'inactive';
  startedAt: string;
  completedAt?: string;
  duration: number; // in seconds
  progress: {
    percentage: number;
    completedTasks: number;
    totalTaskCount: number;
  };
  totalInteractions?: number;
  averageScore?: number;
  domainScores?: {
    engaging_with_ai: number;
    creating_with_ai: number;
    managing_with_ai: number;
    designing_with_ai: number;
  };
  ksaScores?: {
    knowledge: number;
    skills: number;
    attitudes: number;
  };
}

type HistoryItem = {
  type: 'assessment' | 'pbl' | 'discovery';
  timestamp: string;
  data: AssessmentHistoryItem | PBLSession | DiscoverySession;
};


export default function UnifiedHistoryPage() {
  const { t, i18n } = useTranslation(['navigation', 'assessment', 'pbl']);
  const router = useRouter();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'assessment' | 'pbl' | 'discovery'>('all');
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);

  // Get current user
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('user');
    
    if (isLoggedIn === 'true' && userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser({
          id: String(user.id),
          email: user.email
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    // If not logged in, don't set any user
  }, []);

  // Fetch both assessment and PBL history
  useEffect(() => {
    const fetchAllHistory = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      try {
        // Fetch assessment history
        const assessmentResponse = await authenticatedFetch(`/api/assessment/results?userId=${currentUser.id}&userEmail=${encodeURIComponent(currentUser.email || currentUser.id)}`);
        const assessmentData = await assessmentResponse.json();
        const assessmentItems: HistoryItem[] = ((assessmentData.data || assessmentData.results) || []).map((item: AssessmentHistoryItem) => ({
          type: 'assessment' as const,
          timestamp: item.timestamp,
          data: item
        }));

        // Fetch PBL history using completion data
        let pblItems: HistoryItem[] = [];
        try {
          const pblResponse = await authenticatedFetch(`/api/pbl/history?lang=${i18n.language}&t=${Date.now()}`);
          if (pblResponse.ok) {
            const pblData = await pblResponse.json();
            if (pblData.success && pblData.programs) {
              // Transform programs to history item format using completion data
              interface ProgramData {
                programId?: string;
                id?: string;
                scenarioId: string;
                scenarioTitle?: string;
                status: 'completed' | 'in_progress' | 'paused';
                startedAt: string;
                completedAt?: string;
                totalTimeSeconds?: number;
                evaluatedTasks: number;
                totalTaskCount: number;
                tasks?: Array<{ 
                  id?: string;
                  title?: string;
                  log?: { interactions?: unknown[] } 
                }>;
                overallScore?: number;
                domainScores?: {
                  engaging_with_ai: number;
                  creating_with_ai: number;
                  managing_with_ai: number;
                  designing_with_ai: number;
                };
                ksaScores?: {
                  knowledge: number;
                  skills: number;
                  attitudes: number;
                };
                program?: { startedAt: string };
                currentTaskIndex?: number;
              }
              
              pblItems = (pblData.programs || []).map((program: ProgramData) => {
                // Find current task info
                const currentTask = program.tasks?.[program.currentTaskIndex || 0];
                
                return {
                  type: 'pbl' as const,
                  timestamp: program.completedAt || program.startedAt || program.program?.startedAt,
                  data: {
                    id: program.programId || program.id,
                    logId: program.programId || program.id,
                    scenarioId: program.scenarioId,
                    scenarioTitle: program.scenarioTitle || program.scenarioId,
                    currentTaskId: currentTask?.id,
                    currentTaskTitle: currentTask?.title,
                    status: program.status,
                    startedAt: program.startedAt || program.program?.startedAt,
                    completedAt: program.completedAt,
                    duration: program.totalTimeSeconds || 0,
                    progress: {
                      percentage: Math.round((program.evaluatedTasks / program.totalTaskCount) * 100),
                      completedTasks: program.evaluatedTasks,
                      totalTaskCount: program.totalTaskCount
                    },
                    totalInteractions: program.tasks?.reduce((sum, task) => 
                      sum + (task.log?.interactions?.length || 0), 0) || 0,
                    averageScore: program.overallScore,
                    domainScores: program.domainScores,
                    ksaScores: program.ksaScores
                  } as PBLSession
                };
              });
            }
          }
        } catch (error) {
          console.error('Error fetching PBL history:', error);
        }

        // Fetch Discovery history
        const discoveryItems: HistoryItem[] = [];
        try {
          const discoveryResponse = await authenticatedFetch(`/api/discovery/my-programs?t=${Date.now()}`);
          if (discoveryResponse.ok) {
            const discoveryScenarios = await discoveryResponse.json();
            
            // Check if we have scenarios
            if (!Array.isArray(discoveryScenarios)) {
              console.log('No discovery scenarios found');
            } else {
              // For each scenario with programs, get the program details
              for (const scenario of discoveryScenarios) {
                if (scenario.userPrograms?.total > 0) {
                // Get all programs for this scenario
                const programsResponse = await authenticatedFetch(`/api/discovery/scenarios/${scenario.id}/programs?t=${Date.now()}`);
                if (programsResponse.ok) {
                  const programs = await programsResponse.json();
                  
                  // Check if we have programs array
                  if (!Array.isArray(programs)) {
                    console.error('Unexpected programs data format:', programs);
                    continue;
                  }
                  
                  console.log('Discovery programs for scenario', scenario.id, ':', programs);
                  
                  if (programs.length === 0) {
                    console.log('No programs found for scenario', scenario.id);
                    continue;
                  }
                  
                  // Create history items for each program
                  const scenarioItems = programs.map((program: Record<string, unknown>) => {
                    const isCompleted = program.status === 'completed';
                    
                    // Get task info from taskLogs if available, otherwise use taskIds
                    const taskLogs = program.taskLogs || [];
                    const completedTasks = (taskLogs as Record<string, unknown>[])?.filter((log: Record<string, unknown>) => log.isCompleted).length || 0;
                    const totalTasks = (program.totalTaskCount as number) || (taskLogs as unknown[])?.length || 0;
                    
                    // For current task, we need to use currentTaskIndex with taskIds
                    const currentTaskIndex = (program.currentTaskIndex as number) || 0;
                    const currentTaskId = (program.metadata as Record<string, unknown>)?.currentTaskId || '';
                    const currentTask = {
                      id: currentTaskId,
                      title: `Task ${currentTaskIndex + 1}` // We'll need to load task details separately if needed
                    };
                    
                    // Calculate duration
                    let duration = 0;
                    if (program.startedAt) {
                      const endTime = program.completedAt ? new Date(program.completedAt as string) : new Date();
                      duration = Math.round((endTime.getTime() - new Date(program.startedAt as string).getTime()) / 1000);
                    }
                    
                    // Get scores from completion data if available
                    let scores = {};
                    if (isCompleted && program.completionData) {
                      scores = {
                        averageScore: (program.completionData as Record<string, unknown>)?.overallScore,
                        domainScores: (program.completionData as Record<string, unknown>)?.domainScores,
                        ksaScores: (program.completionData as Record<string, unknown>)?.ksaScores
                      };
                    }
                    
                    // Log program structure to debug
                    console.log('Discovery program structure:', {
                      id: program.id,
                      status: program.status,
                      tasks: (program.tasks as unknown[])?.length,
                      totalTaskCount: program.totalTaskCount,
                      currentTaskIndex: program.currentTaskIndex
                    });
                    
                    return {
                      type: 'discovery' as const,
                      timestamp: (program.completedAt as string) || (program.startedAt as string) || (program.createdAt as string) || new Date().toISOString(),
                      data: {
                        id: scenario.id,
                        programId: program.id,
                        scenarioId: scenario.id,
                        scenarioTitle: scenario.title,
                        careerType: (scenario.metadata as Record<string, unknown>)?.careerType as string || 'unknown',
                        currentTaskId: currentTask?.id || undefined,
                        currentTaskTitle: currentTask?.title || undefined,
                        status: program.status === 'active' ? 'active' : program.status === 'completed' ? 'completed' : 'inactive',
                        startedAt: (program.startedAt as string) || new Date().toISOString(),
                        completedAt: program.completedAt as string | undefined,
                        duration,
                        progress: {
                          percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                          completedTasks,
                          totalTaskCount: totalTasks
                        },
                        totalInteractions: (program.evaluations as unknown[])?.length || 0,
                        ...scores
                      } as DiscoverySession
                    };
                  });
                  
                  discoveryItems.push(...scenarioItems);
                }
              }
            }
          }
        } else {
          console.log('Discovery API returned non-OK status:', discoveryResponse.status);
        }
      } catch (error) {
        console.error('Error fetching Discovery history:', error);
      }

        // Combine and sort by timestamp
        const allItems = [...assessmentItems, ...pblItems, ...discoveryItems].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        setHistoryItems(allItems);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser || currentUser === null) {
      fetchAllHistory();
    }
  }, [currentUser, i18n.language]);

  const formatDate = (timestamp: string) => {
    return formatDateWithLocale(new Date(timestamp), i18n.language);
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

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return 'text-green-700 bg-green-100';
      case 'advanced': return 'text-blue-700 bg-blue-100';
      case 'intermediate': return 'text-yellow-700 bg-yellow-100';
      case 'beginner': return 'text-gray-700 bg-gray-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'paused':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 55) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredItems = historyItems.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">{t('assessment:history.notLoggedIn')}</p>
          <div className="mt-4 space-x-4">
            <Link href="/assessment" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              {t('assessment:history.takeAssessment')}
            </Link>
            <Link href="/pbl" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              {t('pbl:history.startLearning')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <HistoryPageSkeleton />;
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('navigation:history')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('navigation:historySubtitle')}
          </p>
        </div>


        {/* Filters */}
        <div className="mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {t('navigation:filterAll')} ({historyItems.length})
            </button>
            <button
              onClick={() => setFilter('assessment')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'assessment'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {t('assessment:title')} ({historyItems.filter(item => item.type === 'assessment').length})
            </button>
            <button
              onClick={() => setFilter('pbl')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pbl'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {t('pbl:title')} ({historyItems.filter(item => item.type === 'pbl').length})
            </button>
            <button
              onClick={() => setFilter('discovery')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'discovery'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {t('navigation:discovery')} ({historyItems.filter(item => item.type === 'discovery').length})
            </button>
          </div>
        </div>

        {/* History List */}
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <svg className="w-24 h-24 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('navigation:noHistory')}
            </p>
            <div className="space-x-4">
              <Link
                href="/assessment"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                {t('navigation:startAssessment')}
              </Link>
              <span className="text-gray-400">|</span>
              <Link
                href="/pbl"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                {t('navigation:startPBL')}
              </Link>
              <span className="text-gray-400">|</span>
              <Link
                href="/discovery"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                {t('navigation:startDiscovery')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              if (item.type === 'assessment') {
                const assessment = item.data as AssessmentHistoryItem;
                return (
                  <div key={`assessment-${assessment.assessment_id}`} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 text-xs font-medium px-2.5 py-0.5 rounded mr-2">
                              {t('assessment:title')}
                            </span>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {formatDate(assessment.timestamp)}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {assessment.assessment_id}
                          </p>
                          
                          {/* Date and Time Info */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400 mt-3">
                            <div>
                              <span className="font-medium">{t('assessment:history.startTime')}:</span>
                              <p>{formatDate(assessment.timestamp)}</p>
                            </div>
                            <div>
                              <span className="font-medium">{t('assessment:history.endTime')}:</span>
                              <p>{formatDate(new Date(new Date(assessment.timestamp).getTime() + assessment.duration_seconds * 1000).toISOString())}</p>
                            </div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(assessment.summary.level)}`}>
                          {t(`assessment:level.${assessment.summary.level}`)}
                        </div>
                      </div>
                      
                      {/* Main Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        {/* Left Column - Overall Score */}
                        <div>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('assessment:history.overallScore')}</p>
                            <p className={`text-3xl font-bold ${getScoreColor(assessment.scores.overall)}`}>
                              {assessment.scores.overall}%
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {assessment.summary.correct_answers}/{assessment.summary.total_questions} {t('assessment:history.correct')}
                            </p>
                          </div>
                        </div>
                        
                        {/* Right Column - Domain Scores */}
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('assessment:history.domainScores')}</p>
                          <div className="space-y-2">
                            {Object.entries(assessment.scores.domains).map(([domain, score]) => (
                              <div key={domain} className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400 w-32">
                                  {t(`assessment:domains.${domain}`)}
                                </span>
                                <div className="flex-1 flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
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
                                  <span className={`text-sm font-medium ${getScoreColor(score)} min-w-[40px] text-right`}>
                                    {score}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t('assessment:history.duration')}: {formatDuration(assessment.duration_seconds)}
                        </div>
                        <button
                          onClick={() => router.push(`/assessment`)}
                          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                        >
                          {t('assessment:history.takeNewAssessment')} →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              } else if (item.type === 'pbl') {
                const session = item.data as PBLSession;
                console.log('PBL Session:', {
                  id: session.id,
                  scenarioTitle: session.scenarioTitle,
                  currentTaskTitle: session.currentTaskTitle,
                  currentTaskId: session.currentTaskId
                });
                return (
                  <div key={`pbl-${session.id}`} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 text-xs font-medium px-2.5 py-0.5 rounded mr-2">
                              {t('pbl:title')}
                            </span>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mr-3">
                              {session.scenarioTitle}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Program ID: {session.id}
                          </p>
                          {session.currentTaskTitle && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {t('pbl:currentTask', { ns: 'pbl' })}: {session.currentTaskTitle.split(' - ').slice(-1)[0]}
                            </p>
                          )}
                          
                          {/* Date and Time Info - Similar to Assessment */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400 mt-3">
                            <div>
                              <span className="font-medium">{t('assessment:history.startTime')}:</span>
                              <p>{formatDate(session.startedAt)}</p>
                            </div>
                            <div>
                              <span className="font-medium">{t('assessment:history.endTime')}:</span>
                              <p>{session.completedAt ? formatDate(session.completedAt) : '-'}</p>
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(session.status)}`}>
                          {t(`pbl:history.status.${session.status}`)}
                        </span>
                      </div>

                          {/* Three Column Stats - Inline Style */}
                          {session.averageScore !== undefined && session.domainScores && session.ksaScores ? (
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mt-4">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Column - Overall Score */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    {t('pbl:complete.overallScore')}
                                  </h4>
                                  <div className="mb-3">
                                    <span className={`text-3xl font-bold ${getScoreColor(session.averageScore)}`}>
                                      {session.averageScore}%
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {session.progress.completedTasks}/{session.progress.totalTaskCount} {t('pbl:history.tasksEvaluated')}
                                  </p>
                                  <div className="mt-3 space-y-2">
                                    <div>
                                      <span className="text-sm text-gray-600 dark:text-gray-400">{t('pbl:history.conversationCount')}</span>
                                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {session.totalInteractions} {t('pbl:history.times')}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Middle Column - Domain Scores */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    {t('pbl:complete.domainScores')}
                                  </h4>
                                  <div className="space-y-3">
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('assessment:domains.engaging_with_ai')}</span>
                                        <span className={`text-sm font-medium ${getScoreColor(session.domainScores.engaging_with_ai)}`}>
                                          {session.domainScores.engaging_with_ai}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${session.domainScores.engaging_with_ai}%` }} />
                                      </div>
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('assessment:domains.creating_with_ai')}</span>
                                        <span className={`text-sm font-medium ${getScoreColor(session.domainScores.creating_with_ai)}`}>
                                          {session.domainScores.creating_with_ai}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div className="bg-green-600 h-2 rounded-full" style={{ width: `${session.domainScores.creating_with_ai}%` }} />
                                      </div>
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('assessment:domains.managing_with_ai')}</span>
                                        <span className={`text-sm font-medium ${getScoreColor(session.domainScores.managing_with_ai)}`}>
                                          {session.domainScores.managing_with_ai}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div className="bg-yellow-600 h-2 rounded-full" style={{ width: `${session.domainScores.managing_with_ai}%` }} />
                                      </div>
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('assessment:domains.designing_with_ai')}</span>
                                        <span className={`text-sm font-medium ${getScoreColor(session.domainScores.designing_with_ai)}`}>
                                          {session.domainScores.designing_with_ai}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${session.domainScores.designing_with_ai}%` }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Right Column - KSA Scores */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    {t('pbl:complete.ksaSummary')}
                                  </h4>
                                  <div className="space-y-3">
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('pbl:complete.knowledge')}</span>
                                        <span className={`text-sm font-medium ${getScoreColor(session.ksaScores.knowledge)}`}>
                                          {session.ksaScores.knowledge}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${session.ksaScores.knowledge}%` }} />
                                      </div>
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('pbl:complete.skills')}</span>
                                        <span className={`text-sm font-medium ${getScoreColor(session.ksaScores.skills)}`}>
                                          {session.ksaScores.skills}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div className="bg-green-600 h-2 rounded-full" style={{ width: `${session.ksaScores.skills}%` }} />
                                      </div>
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('pbl:complete.attitudes')}</span>
                                        <span className={`text-sm font-medium ${getScoreColor(session.ksaScores.attitudes)}`}>
                                          {session.ksaScores.attitudes}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${session.ksaScores.attitudes}%` }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Fallback for sessions without scores */
                            <div className="mt-4">
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('pbl:history.progress')}</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                  {session.progress.completedTasks}/{session.progress.totalTaskCount} {t('pbl:history.tasks')}
                                </p>
                                {session.totalInteractions !== undefined && (
                                  <div className="mt-3">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('pbl:history.conversationCount')}</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{session.totalInteractions} {t('pbl:history.times')}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                      
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t('assessment:history.duration')}: {formatDuration(session.duration)}
                        </div>
                        <div className="flex items-center space-x-4">
                          {session.status === 'in_progress' && (
                            <button
                              onClick={() => {
                                // Need to get the current task ID, assuming it's the first task or stored in session
                                const taskId = session.currentTaskId || 'task-1';
                                router.push(`/pbl/scenarios/${session.scenarioId}/programs/${session.id}/tasks/${taskId}`);
                              }}
                              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                            >
                              {t('pbl:history.continueStudy')} →
                            </button>
                          )}
                          <Link
                            href={`/pbl/programs/${session.id}/complete`}
                            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                          >
                            {t('pbl:complete.viewReport')} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else if (item.type === 'discovery') {
                const session = item.data as DiscoverySession;
                return (
                  <div key={`discovery-${session.programId}`} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 text-xs font-medium px-2.5 py-0.5 rounded mr-2">
                              {t('navigation:discovery')}
                            </span>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mr-3">
                              {session.scenarioTitle}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Program ID: {session.programId}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {t('discovery:careerType')}: {session.careerType}
                          </p>
                          {session.currentTaskTitle && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {t('pbl:currentTask', { ns: 'pbl' })}: {session.currentTaskTitle}
                            </p>
                          )}
                          
                          {/* Date and Time Info */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400 mt-3">
                            <div>
                              <span className="font-medium">{t('assessment:history.startTime')}:</span>
                              <p>{formatDate(session.startedAt)}</p>
                            </div>
                            <div>
                              <span className="font-medium">{t('assessment:history.endTime')}:</span>
                              <p>{session.completedAt ? formatDate(session.completedAt) : '-'}</p>
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          session.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          session.status === 'active' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {t(`discovery:status.${session.status}`)}
                        </span>
                      </div>

                      {/* Three Column Stats - Similar to PBL */}
                      {session.averageScore !== undefined && session.domainScores && session.ksaScores ? (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mt-4">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column - Overall Score */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                {t('pbl:complete.overallScore')}
                              </h4>
                              <div className="mb-3">
                                <span className={`text-3xl font-bold ${getScoreColor(session.averageScore)}`}>
                                  {session.averageScore}%
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {session.progress.completedTasks}/{session.progress.totalTaskCount} {t('pbl:history.tasksEvaluated')}
                              </p>
                              {session.totalInteractions !== undefined && (
                                <div className="mt-3 space-y-2">
                                  <div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('pbl:history.conversationCount')}</span>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {session.totalInteractions} {t('pbl:history.times')}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Middle Column - Domain Scores */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                {t('pbl:complete.domainScores')}
                              </h4>
                              <div className="space-y-3">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('assessment:domains.engaging_with_ai')}</span>
                                    <span className={`text-sm font-medium ${getScoreColor(session.domainScores.engaging_with_ai)}`}>
                                      {session.domainScores.engaging_with_ai}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${session.domainScores.engaging_with_ai}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('assessment:domains.creating_with_ai')}</span>
                                    <span className={`text-sm font-medium ${getScoreColor(session.domainScores.creating_with_ai)}`}>
                                      {session.domainScores.creating_with_ai}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div className="bg-green-600 h-2 rounded-full" style={{ width: `${session.domainScores.creating_with_ai}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('assessment:domains.managing_with_ai')}</span>
                                    <span className={`text-sm font-medium ${getScoreColor(session.domainScores.managing_with_ai)}`}>
                                      {session.domainScores.managing_with_ai}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div className="bg-yellow-600 h-2 rounded-full" style={{ width: `${session.domainScores.managing_with_ai}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('assessment:domains.designing_with_ai')}</span>
                                    <span className={`text-sm font-medium ${getScoreColor(session.domainScores.designing_with_ai)}`}>
                                      {session.domainScores.designing_with_ai}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${session.domainScores.designing_with_ai}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Right Column - KSA Scores */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                {t('pbl:complete.ksaSummary')}
                              </h4>
                              <div className="space-y-3">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('pbl:complete.knowledge')}</span>
                                    <span className={`text-sm font-medium ${getScoreColor(session.ksaScores.knowledge)}`}>
                                      {session.ksaScores.knowledge}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${session.ksaScores.knowledge}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('pbl:complete.skills')}</span>
                                    <span className={`text-sm font-medium ${getScoreColor(session.ksaScores.skills)}`}>
                                      {session.ksaScores.skills}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div className="bg-green-600 h-2 rounded-full" style={{ width: `${session.ksaScores.skills}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('pbl:complete.attitudes')}</span>
                                    <span className={`text-sm font-medium ${getScoreColor(session.ksaScores.attitudes)}`}>
                                      {session.ksaScores.attitudes}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${session.ksaScores.attitudes}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Fallback for sessions without scores */
                        <div className="mt-4">
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('pbl:history.progress')}</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {session.progress.completedTasks}/{session.progress.totalTaskCount} {t('pbl:history.tasks')}
                            </p>
                            {session.totalInteractions !== undefined && (
                              <div className="mt-3">
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('pbl:history.conversationCount')}</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{session.totalInteractions} {t('pbl:history.times')}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t('assessment:history.duration')}: {formatDuration(session.duration)}
                        </div>
                        <div className="flex items-center space-x-4">
                          {session.status === 'active' && (
                            <button
                              onClick={() => {
                                const taskId = session.currentTaskId || 'task-1';
                                router.push(`/discovery/scenarios/${session.scenarioId}/programs/${session.programId}/tasks/${taskId}`);
                              }}
                              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                            >
                              {t('pbl:history.continueStudy')} →
                            </button>
                          )}
                          <Link
                            href={`/discovery/programs/${session.programId}/complete`}
                            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                          >
                            {t('pbl:complete.viewReport')} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 text-center space-x-4">
          <Link
            href="/assessment"
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors inline-block"
          >
            {t('assessment:history.takeNewAssessment')}
          </Link>
          <Link
            href="/pbl"
            className="bg-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors inline-block"
          >
            {t('navigation:startNewPBL')}
          </Link>
          <Link
            href="/discovery"
            className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors inline-block"
          >
            {t('navigation:startNewDiscovery')}
          </Link>
        </div>
      </div>
    </main>
  );
}