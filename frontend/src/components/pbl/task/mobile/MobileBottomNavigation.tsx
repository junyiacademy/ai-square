'use client';

import { type TFunction } from 'i18next';

interface MobileBottomNavigationProps {
  currentView: 'progress' | 'task' | 'chat';
  onViewChange: (view: 'progress' | 'task' | 'chat') => void;
  t: TFunction;
}

export function MobileBottomNavigation({
  currentView,
  onViewChange,
  t
}: MobileBottomNavigationProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="flex justify-around">
        <button
          onClick={() => onViewChange('progress')}
          className={`flex-1 py-4 flex flex-col items-center justify-center transition-colors ${
            currentView === 'progress'
              ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <span className="text-xs font-medium">{t('pbl:learn.progress')}</span>
        </button>

        <button
          onClick={() => onViewChange('task')}
          className={`flex-1 py-4 flex flex-col items-center justify-center transition-colors ${
            currentView === 'task'
              ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-xs font-medium">{t('pbl:learn.taskInfo')}</span>
        </button>

        <button
          onClick={() => onViewChange('chat')}
          className={`flex-1 py-4 flex flex-col items-center justify-center transition-colors ${
            currentView === 'chat'
              ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs font-medium">{t('pbl:learn.chat')}</span>
        </button>
      </div>
    </div>
  );
}
