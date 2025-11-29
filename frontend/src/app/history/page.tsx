'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HistoryPageSkeleton } from '@/components/ui/history-skeletons';
import { AssessmentCard, AssessmentHistoryItem as AssessmentCardItem } from '@/components/history/AssessmentCard';
import { useHistoryData, PBLSession, DiscoverySession } from '@/hooks/useHistoryData';
import {
  formatDate,
  formatDuration,
  getLevelColor,
  getStatusBadge,
  getScoreColor
} from '@/components/history/history-utils';

export default function UnifiedHistoryPage() {
  const { t } = useTranslation(['navigation', 'assessment', 'pbl']);
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'assessment' | 'pbl' | 'discovery'>('all');
  const { historyItems, loading } = useHistoryData();

  const filteredItems = historyItems.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  if (loading) {
    return <HistoryPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('navigation:history')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('navigation:historyDescription')}
          </p>
        </div>

        <div className="mb-6 flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          >
            {t('navigation:allTypes')}
          </button>
          <button
            onClick={() => setFilter('assessment')}
            className={`px-4 py-2 rounded-lg ${filter === 'assessment' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          >
            {t('assessment:title')}
          </button>
          <button
            onClick={() => setFilter('pbl')}
            className={`px-4 py-2 rounded-lg ${filter === 'pbl' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          >
            {t('pbl:title')}
          </button>
          <button
            onClick={() => setFilter('discovery')}
            className={`px-4 py-2 rounded-lg ${filter === 'discovery' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          >
            {t('navigation:discovery')}
          </button>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {t('navigation:noHistory')}
            </p>
            <div className="space-x-4">
              <Link href="/assessment" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                {t('navigation:startAssessment')}
              </Link>
              <span className="text-gray-400">|</span>
              <Link href="/pbl" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                {t('navigation:startPBL')}
              </Link>
              <span className="text-gray-400">|</span>
              <Link href="/discovery" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                {t('navigation:startDiscovery')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              if (item.type === 'assessment') {
                const assessment = item.data as AssessmentCardItem;
                return (
                  <AssessmentCard
                    key={`assessment-${assessment.assessment_id}`}
                    assessment={assessment}
                    formatDate={formatDate}
                    formatDuration={formatDuration}
                    getLevelColor={getLevelColor}
                    getScoreColor={getScoreColor}
                  />
                );
              } else if (item.type === 'pbl') {
                const session = item.data as PBLSession;
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
                          <p className="text-sm text-gray-500 dark:text-gray-400">Program ID: {session.id}</p>
                          {session.currentTaskTitle && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {t('pbl:currentTask', { ns: 'pbl' })}: {session.currentTaskTitle.split(' - ').slice(-1)[0]}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(session.status)}`}>
                          {t(`pbl:history.status.${session.status}`)}
                        </span>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('pbl:history.progress')}</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {session.progress.completedTasks}/{session.progress.totalTaskCount} {t('pbl:history.tasks')}
                        </p>
                        {session.averageScore !== undefined && (
                          <p className={`text-2xl font-bold mt-2 ${getScoreColor(session.averageScore)}`}>
                            {session.averageScore}%
                          </p>
                        )}
                      </div>

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
                          <p className="text-sm text-gray-500 dark:text-gray-400">Program ID: {session.programId}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Career: {session.careerType}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(session.status)}`}>
                          {session.status}
                        </span>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Progress</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {session.progress.completedTasks}/{session.progress.totalTaskCount} Tasks
                        </p>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                          <div
                            className="bg-emerald-600 h-2 rounded-full"
                            style={{ width: `${session.progress.percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Duration: {formatDuration(session.duration)}
                        </div>
                        {session.status === 'active' && (
                          <button
                            onClick={() => {
                              const taskId = session.currentTaskId || 'task-1';
                              router.push(`/discovery/scenarios/${session.scenarioId}/programs/${session.programId}/tasks/${taskId}`);
                            }}
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm font-medium"
                          >
                            Continue →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
