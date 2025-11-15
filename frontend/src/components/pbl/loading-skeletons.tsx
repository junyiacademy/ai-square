import React from 'react';
import { LoadingSkeleton, LoadingCard } from '@/components/ui/loading-skeleton';

// Skeleton for PBL scenario cards in the list page
export const PBLScenarioCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
    <div className="p-6">
      <LoadingSkeleton className="h-6 w-3/4 mb-2" />
      <LoadingSkeleton className="h-4 w-full mb-4" />
      <div className="flex items-center gap-4 mb-4">
        <LoadingSkeleton className="h-4 w-20" />
        <LoadingSkeleton className="h-4 w-24" />
      </div>
      <LoadingSkeleton className="h-10 w-full" />
    </div>
  </div>
);

// Skeleton for PBL scenarios list page
export const PBLScenariosListSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <PBLScenarioCardSkeleton key={i} />
    ))}
  </div>
);

// Skeleton for scenario details page
export const PBLScenarioDetailsSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <LoadingSkeleton className="h-8 w-1/2 mb-4" />
      <LoadingSkeleton className="h-4 w-3/4 mb-2" />
      <LoadingSkeleton className="h-4 w-2/3" />
      <div className="flex gap-4 mt-6">
        <LoadingSkeleton className="h-5 w-24" />
        <LoadingSkeleton className="h-5 w-24" />
      </div>
    </div>

    {/* User Programs */}
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
      <LoadingSkeleton className="h-6 w-48 mb-4" />
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <LoadingSkeleton className="h-4 w-2/3 mb-2" />
            <LoadingSkeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>

    {/* Learning Objectives & Prerequisites */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <LoadingCard />
      <LoadingCard />
    </div>

    {/* Tasks */}
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <LoadingSkeleton className="h-6 w-32 mb-4" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border-l-4 border-gray-300 pl-4">
            <LoadingSkeleton className="h-5 w-3/4 mb-2" />
            <LoadingSkeleton className="h-4 w-full mb-1" />
            <LoadingSkeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>

    {/* Action Button */}
    <div className="flex justify-center">
      <LoadingSkeleton className="h-12 w-64" />
    </div>
  </div>
);

// Skeleton for task progress sidebar
export const PBLTaskProgressSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
    <LoadingSkeleton className="h-6 w-32 mb-4" />
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <LoadingSkeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1">
            <LoadingSkeleton className="h-4 w-full mb-1" />
            <LoadingSkeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Skeleton for learning page main content
export const PBLLearningContentSkeleton: React.FC = () => (
  <div className="flex gap-6">
    {/* Sidebar */}
    <div className="w-1/3">
      <PBLTaskProgressSkeleton />
    </div>

    {/* Main Content */}
    <div className="flex-1 space-y-6">
      {/* Task Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <LoadingSkeleton className="h-8 w-3/4 mb-4" />
        <LoadingSkeleton className="h-4 w-full mb-2" />
        <LoadingSkeleton className="h-4 w-full mb-2" />
        <LoadingSkeleton className="h-4 w-2/3" />
      </div>

      {/* Chat Interface */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <LoadingSkeleton className="h-6 w-32 mb-4" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-2xl ${i % 2 === 0 ? 'bg-gray-100' : 'bg-blue-100'} rounded-lg p-4`}>
                <LoadingSkeleton className="h-4 w-64 mb-2" />
                <LoadingSkeleton className="h-4 w-48" />
              </div>
            </div>
          ))}
        </div>
        <LoadingSkeleton className="h-12 w-full mt-4" />
      </div>
    </div>
  </div>
);

// Skeleton for completion page
export const PBLCompletionSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Summary Card */}
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <LoadingSkeleton className="h-8 w-48" />
        <LoadingSkeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center">
            <LoadingSkeleton className="h-12 w-24 mx-auto mb-2" />
            <LoadingSkeleton className="h-4 w-32 mx-auto" />
          </div>
        ))}
      </div>
    </div>

    {/* Tasks Evaluation */}
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <LoadingSkeleton className="h-6 w-48 mb-4" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <LoadingSkeleton className="h-5 w-2/3" />
              <LoadingSkeleton className="h-6 w-16" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <LoadingSkeleton className="h-4 w-32 mb-2" />
                <div className="space-y-2">
                  {[...Array(4)].map((_, j) => (
                    <LoadingSkeleton key={j} className="h-3 w-full" />
                  ))}
                </div>
              </div>
              <div>
                <LoadingSkeleton className="h-4 w-32 mb-2" />
                <div className="space-y-2">
                  {[...Array(3)].map((_, j) => (
                    <LoadingSkeleton key={j} className="h-3 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* AI Feedback */}
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6">
      <LoadingSkeleton className="h-6 w-48 mb-4" />
      <div className="space-y-3">
        <LoadingSkeleton className="h-4 w-full" />
        <LoadingSkeleton className="h-4 w-full" />
        <LoadingSkeleton className="h-4 w-3/4" />
      </div>
    </div>
  </div>
);
