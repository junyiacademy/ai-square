'use client';

import React from 'react';

export function HistoryListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <div className="h-5 w-20 bg-gray-300 dark:bg-gray-600 rounded mr-2" />
                <div className="h-6 w-48 bg-gray-300 dark:bg-gray-600 rounded" />
              </div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                <div>
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div>
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            </div>
            <div className="h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {/* Stats Section */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div>
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-600 rounded mb-2" />
                <div className="h-8 w-16 bg-gray-300 dark:bg-gray-600 rounded mb-1" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-600 rounded" />
              </div>

              {/* Right Column */}
              <div>
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-600 rounded mb-2" />
                <div className="space-y-2">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div className="h-3 w-20 bg-gray-200 dark:bg-gray-600 rounded" />
                      <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2" />
                      <div className="h-3 w-10 bg-gray-200 dark:bg-gray-600 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-600 rounded mr-1" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded" />
            </div>
            <div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HistoryHeaderSkeleton() {
  return (
    <div className="mb-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-300 dark:bg-gray-600 rounded mb-2" />
      <div className="h-5 w-96 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

export function HistoryFiltersSkeleton() {
  return (
    <div className="mb-6 animate-pulse">
      <div className="flex space-x-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function HistoryPageSkeleton() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <HistoryHeaderSkeleton />
        <HistoryFiltersSkeleton />
        <HistoryListSkeleton />
      </div>
    </main>
  );
}
