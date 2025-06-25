'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

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

export default function AssessmentHistoryPage() {
  const { t } = useTranslation('assessment');
  const [history, setHistory] = useState<AssessmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);

  // Get current user
  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('user');
    
    if (isLoggedIn === 'true' && userData) {
      const user = JSON.parse(userData);
      // Use email as user_id directly
      setCurrentUser({
        id: user.email,
        email: user.email
      });
    } else {
      // Fallback for non-logged in users
      const mockUser = localStorage.getItem('mockUser');
      if (mockUser) {
        setCurrentUser(JSON.parse(mockUser));
      }
    }
  }, []);

  // Fetch assessment history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/assessment/results?userId=${currentUser.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch history');
        }
        
        const data = await response.json();
        setHistory(data.results || []);
      } catch (err) {
        console.error('Error fetching history:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [currentUser]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 55) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{t('history.notLoggedIn')}</p>
          <Link href="/assessment" className="text-indigo-600 hover:text-indigo-700 mt-4 inline-block">
            {t('history.takeAssessment')}
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('history.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{t('history.error')}</p>
          <p className="text-gray-600 mt-2">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            {t('history.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t('history.title')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('history.subtitle')}
          </p>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t('history.user')}</p>
              <p className="text-lg font-medium text-gray-900">{currentUser.email || currentUser.id}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{t('history.totalAssessments')}</p>
              <p className="text-2xl font-bold text-indigo-600">{history.length}</p>
            </div>
          </div>
        </div>

        {/* History List */}
        {history.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-4 text-gray-600">{t('history.noHistory')}</p>
            <Link 
              href="/assessment"
              className="mt-6 inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              {t('history.takeFirstAssessment')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div key={item.assessment_id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatDate(item.timestamp)}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        ID: {item.assessment_id}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(item.summary.level)}`}>
                      {t(`level.${item.summary.level}`)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Overall Score */}
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{t('history.overallScore')}</p>
                      <p className={`text-3xl font-bold ${getScoreColor(item.scores.overall)}`}>
                        {item.scores.overall}%
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.summary.correct_answers}/{item.summary.total_questions} {t('history.correct')}
                      </p>
                    </div>
                    
                    {/* Domain Scores */}
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500 mb-2">{t('history.domainScores')}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(item.scores.domains).map(([domain, score]) => (
                          <div key={domain} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              {t(`domains.${domain}`)}
                            </span>
                            <span className={`text-sm font-medium ${getScoreColor(score)}`}>
                              {score}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('history.duration')}: {formatDuration(item.duration_seconds)}
                    </div>
                    <Link
                      href={`/assessment/review/${item.assessment_id}`}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      {t('history.viewDetails')} →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Actions */}
        <div className="mt-8 text-center">
          <Link
            href="/assessment"
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors inline-block"
          >
            {t('history.takeNewAssessment')}
          </Link>
        </div>
      </div>
    </div>
  );
}