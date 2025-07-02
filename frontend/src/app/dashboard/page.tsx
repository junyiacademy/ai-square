'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import type { AssessmentResult } from '@/types/assessment';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  hasCompletedAssessment: boolean;
  hasCompletedOnboarding: boolean;
  learningGoals?: string[];
}

interface LearningProgress {
  totalScenarios: number;
  completedScenarios: number;
  inProgressScenarios: number;
  totalLearningHours: number;
  currentStreak: number;
  lastActivityDate?: string;
}

interface RecentActivity {
  id: string;
  type: 'assessment' | 'pbl_completed' | 'pbl_started' | 'achievement';
  title: string;
  description: string;
  date: string;
  icon: string;
  link?: string;
}

interface NextAction {
  id: string;
  title: string;
  description: string;
  type: 'assessment' | 'pbl' | 'learning_path';
  link: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation(['dashboard', 'common']);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [nextActions, setNextActions] = useState<NextAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(userStr) as UserProfile;
    setUser(userData);

    // Load assessment result if exists
    const resultStr = localStorage.getItem('assessmentResult');
    if (resultStr) {
      setAssessmentResult(JSON.parse(resultStr) as AssessmentResult);
    }

    // Load user progress and activities
    const hasAssessment = !!resultStr;
    loadUserData(userData, hasAssessment);
    setLoading(false);
  }, [router]);

  const loadUserData = async (userData: UserProfile, hasCompletedAssessment: boolean) => {
    // Simulate loading user progress
    const progress: LearningProgress = {
      totalScenarios: 12,
      completedScenarios: 0,
      inProgressScenarios: 0,
      totalLearningHours: 0,
      currentStreak: 0,
      lastActivityDate: new Date().toISOString()
    };
    setLearningProgress(progress);

    // Generate recent activities
    const activities: RecentActivity[] = [];
    
    if (hasCompletedAssessment) {
      activities.push({
        id: 'assessment-1',
        type: 'assessment',
        title: t('dashboard:activities.completedAssessment'),
        description: t('dashboard:activities.assessmentDesc'),
        date: new Date().toISOString(),
        icon: '🎯',
        link: '/history'
      });
    }

    setRecentActivities(activities);

    // Generate next actions
    const actions: NextAction[] = [];

    if (!hasCompletedAssessment) {
      actions.push({
        id: 'take-assessment',
        title: t('dashboard:nextActions.takeAssessment'),
        description: t('dashboard:nextActions.assessmentDesc'),
        type: 'assessment',
        link: '/assessment',
        priority: 'high',
        estimatedTime: 20
      });
    } else {
      // User has completed assessment, suggest learning path
      actions.push({
        id: 'view-learning-path',
        title: t('dashboard:nextActions.viewLearningPath'),
        description: t('dashboard:nextActions.learningPathDesc'),
        type: 'learning_path',
        link: '/learning-path',
        priority: 'high'
      });

      // Suggest PBL scenarios
      actions.push({
        id: 'start-pbl',
        title: t('dashboard:nextActions.startPBL'),
        description: t('dashboard:nextActions.pblDesc'),
        type: 'pbl',
        link: '/pbl',
        priority: 'medium',
        estimatedTime: 30
      });
    }

    setNextActions(actions);
  };

  const getDomainName = (domainKey: string) => {
    return t(`dashboard:domains.${domainKey}`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

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
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('dashboard:welcome', { name: user?.name || user?.email.split('@')[0] })}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
            {t('dashboard:subtitle')}
          </p>
        </div>

        {/* Learning Path Quick Access - New prominent section */}
        {assessmentResult && (
          <div className="mb-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2 flex items-center">
                  🎯 {t('dashboard:learningPathQuickAccess')}
                </h2>
                <p className="text-white/90 mb-4">
                  {t('dashboard:learningPathDescription')}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/learning-path"
                    className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                  >
                    {t('dashboard:viewAllPaths')}
                    <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    href="/learning-path?filter=weak"
                    className="inline-flex items-center px-6 py-3 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition-colors"
                  >
                    {t('dashboard:focusOnWeakAreas')}
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block ml-6">
                <div className="bg-white/20 rounded-full p-6">
                  <svg className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Progress Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Literacy Progress */}
            {assessmentResult && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {t('dashboard:aiLiteracyProgress')}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(assessmentResult.domainScores).map(([domain, score]) => (
                    <div key={domain} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {getDomainName(domain)}
                        </h3>
                        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                          {score}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Link
                    href="/learning-path"
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {t('dashboard:viewDetailedProgress')} →
                  </Link>
                </div>
              </div>
            )}

            {/* Learning Statistics */}
            {learningProgress && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {t('dashboard:learningStatistics')}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {learningProgress.completedScenarios}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('dashboard:completedScenarios')}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">
                      {learningProgress.inProgressScenarios}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('dashboard:inProgress')}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {learningProgress.totalLearningHours}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('dashboard:learningHours')}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {learningProgress.currentStreak}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('dashboard:dayStreak')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activities */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('dashboard:recentActivities')}
              </h2>
              {recentActivities.length > 0 ? (
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start">
                      <span className="text-2xl mr-3">{activity.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {activity.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                      {activity.link && (
                        <Link
                          href={activity.link}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {t('common:view')} →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  {t('dashboard:noRecentActivities')}
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Next Actions */}
          <div className="space-y-6">
            {/* Next Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('dashboard:recommendedActions')}
              </h2>
              <div className="space-y-3">
                {nextActions.map((action) => (
                  <Link
                    key={action.id}
                    href={action.link}
                    className="block p-4 bg-gray-50 dark:bg-slate-700 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {action.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(action.priority)}`}>
                        {t(`dashboard:priority.${action.priority}`)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {action.description}
                    </p>
                    {action.estimatedTime && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        <svg className="inline h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {action.estimatedTime} {t('common:minutes')}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('dashboard:quickLinks')}
              </h2>
              <div className="space-y-2">
                <Link
                  href="/pbl"
                  className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  📚 {t('dashboard:explorePBL')}
                </Link>
                <Link
                  href="/relations"
                  className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  🔗 {t('dashboard:viewCompetencies')}
                </Link>
                <Link
                  href="/history"
                  className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  📊 {t('dashboard:viewHistory')}
                </Link>
                <Link
                  href="/ksa"
                  className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  🎯 {t('dashboard:exploreKSA')}
                </Link>
              </div>
            </div>

            {/* Learning Goals */}
            {user?.learningGoals && user.learningGoals.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {t('dashboard:yourGoals')}
                </h2>
                <div className="space-y-2">
                  {user.learningGoals.map((goal, index) => (
                    <div key={index} className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700 dark:text-gray-300">
                        {t(`onboarding:goals.${goal}.title`)}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/onboarding/goals"
                  className="block mt-3 text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {t('dashboard:updateGoals')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}