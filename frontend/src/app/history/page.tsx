'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
    completedStages: number;
    totalStages: number;
  };
  score?: number;
  stageDetails?: Array<{
    stageId: string;
    stageTitle: string;
    status: string;
    score?: number;
    interactions: number;
    taskDetails?: Array<{
      taskId: string;
      taskTitle: string;
      score?: number;
    }>;
  }>;
  totalInteractions?: number;
  averageScore?: number;
  domainScores?: {
    engaging_with_ai: number;
    creating_with_ai: number;
    managing_with_ai: number;
    designing_with_ai: number;
  };
}

type HistoryItem = {
  type: 'assessment' | 'pbl';
  timestamp: string;
  data: AssessmentHistoryItem | PBLSession;
};

export default function UnifiedHistoryPage() {
  const { t, i18n } = useTranslation(['navigation', 'assessment', 'pbl']);
  const router = useRouter();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'assessment' | 'pbl'>('all');
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);

  // Get current user
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('user');
    
    if (isLoggedIn === 'true' && userData) {
      const user = JSON.parse(userData);
      setCurrentUser({
        id: String(user.id),
        email: user.email
      });
    }
    // If not logged in, don't set any user
  }, []);

  // Fetch both assessment and PBL history
  useEffect(() => {
    const fetchAllHistory = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      
      try {
        // Fetch assessment history
        const assessmentResponse = await fetch(`/api/assessment/results?userId=${currentUser.id}&userEmail=${encodeURIComponent(currentUser.email || currentUser.id)}`);
        const assessmentData = await assessmentResponse.json();
        const assessmentItems: HistoryItem[] = (assessmentData.results || []).map((item: AssessmentHistoryItem) => ({
          type: 'assessment' as const,
          timestamp: item.timestamp,
          data: item
        }));

        // Fetch PBL history with current language
        const pblResponse = await fetch(`/api/pbl/history?userId=${currentUser.id}&lang=${i18n.language}&t=${Date.now()}`);
        const pblData = await pblResponse.json();
        const pblItems: HistoryItem[] = (pblData.data || []).map((item: PBLSession) => ({
          type: 'pbl' as const,
          timestamp: item.startedAt,
          data: item
        }));

        // Combine and sort by timestamp
        const allItems = [...assessmentItems, ...pblItems].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        setHistoryItems(allItems);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllHistory();
  }, [currentUser, i18n.language]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
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
                                <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                                  {t(`assessment:domains.${domain}`)}
                                </span>
                                <span className={`text-sm font-medium ${getScoreColor(score)}`}>
                                  {score}%
                                </span>
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
                        <Link
                          href={`/assessment/review/${assessment.assessment_id}`}
                          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                        >
                          {t('assessment:history.viewDetails')} →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              } else {
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
                              {session.currentTaskTitle || session.scenarioTitle}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {session.id}
                          </p>
                          
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

                          {/* Main Stats Grid - Similar to Assessment layout */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            {/* Left Column - Overall Stats */}
                            <div>
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                {session.averageScore !== undefined ? (
                                  <>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('assessment:history.overallScore')}</p>
                                    <p className={`text-3xl font-bold ${getScoreColor(session.averageScore)}`}>
                                      {session.averageScore}%
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {session.progress.completedStages}/{session.progress.totalStages} {t('pbl:history.stagesCompleted')}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('pbl:history.progress')}</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                      {session.progress.completedStages}/{session.progress.totalStages} {t('pbl:history.stages')}
                                    </p>
                                  </>
                                )}
                                {session.totalInteractions !== undefined && (
                                  <div className="mt-3">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('pbl:history.conversationCount')}</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{session.totalInteractions} {t('pbl:history.times')}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Right Column - Domain Scores or Stage Details */}
                            <div>
                              {session.domainScores ? (
                                <>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('assessment:history.domainScores')}</p>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{t('assessment:domains.engaging_with_ai')}</span>
                                      <span className={`text-sm font-medium ${getScoreColor(session.domainScores.engaging_with_ai)}`}>
                                        {session.domainScores.engaging_with_ai}%
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{t('assessment:domains.creating_with_ai')}</span>
                                      <span className={`text-sm font-medium ${getScoreColor(session.domainScores.creating_with_ai)}`}>
                                        {session.domainScores.creating_with_ai}%
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{t('assessment:domains.managing_with_ai')}</span>
                                      <span className={`text-sm font-medium ${getScoreColor(session.domainScores.managing_with_ai)}`}>
                                        {session.domainScores.managing_with_ai}%
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{t('assessment:domains.designing_with_ai')}</span>
                                      <span className={`text-sm font-medium ${getScoreColor(session.domainScores.designing_with_ai)}`}>
                                        {session.domainScores.designing_with_ai}%
                                      </span>
                                    </div>
                                  </div>
                                </>
                              ) : session.stageDetails && session.stageDetails.length > 0 ? (
                                <div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('pbl:history.stageDetails')}</p>
                                  <div className="space-y-2">
                                    {session.stageDetails.map((stage, index) => (
                                      <div key={stage.stageId} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center">
                                          <span className="text-gray-600 dark:text-gray-400 mr-2">{index + 1}.</span>
                                          <span className="text-gray-700 dark:text-gray-300">{stage.stageTitle}</span>
                                          {stage.status === 'completed' && (
                                            <svg className="w-4 h-4 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-3">
                                          {stage.interactions > 0 && (
                                            <span className="text-gray-500 dark:text-gray-400">{stage.interactions} {t('pbl:history.conversations')}</span>
                                          )}
                                          {stage.score !== undefined && (
                                            <span className={`font-medium ${getScoreColor(stage.score)}`}>{stage.score}%</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          
                          {/* Stage Details Below (when we have domain scores) */}
                          {session.domainScores && session.stageDetails && session.stageDetails.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('pbl:history.stageDetails')}</p>
                              <div className="space-y-2">
                                {session.stageDetails.map((stage, index) => (
                                  <div key={stage.stageId} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center">
                                      <span className="text-gray-600 dark:text-gray-400 mr-2">{index + 1}.</span>
                                      <span className="text-gray-700 dark:text-gray-300">{stage.stageTitle}</span>
                                      {stage.status === 'completed' && (
                                        <svg className="w-4 h-4 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      {stage.interactions > 0 && (
                                        <span className="text-gray-500 dark:text-gray-400">{stage.interactions} 對話</span>
                                      )}
                                      {stage.score !== undefined && (
                                        <span className={`font-medium ${getScoreColor(stage.score)}`}>{stage.score}%</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t('pbl:history.duration')}: {formatDuration(session.duration)}
                        </div>
                        {session.status === 'in_progress' ? (
                          <button
                            onClick={() => router.push(`/pbl/scenarios/${session.scenarioId}/learn?sessionId=${session.id}`)}
                            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                          >
                            {t('pbl:history.continueStudy')} →
                          </button>
                        ) : (
                          <Link
                            href={`/pbl/scenarios/${session.scenarioId}/complete?sessionId=${session.id}`}
                            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                          >
                            {t('assessment:history.viewDetails')} →
                          </Link>
                        )}
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
        </div>
      </div>
    </main>
  );
}