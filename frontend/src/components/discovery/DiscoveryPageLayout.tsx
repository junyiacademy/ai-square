'use client';

import React from 'react';
import DiscoveryHeader from '@/components/discovery/DiscoveryHeader';
import { useDiscoveryData } from '@/hooks/useDiscoveryData';

interface DiscoveryPageLayoutProps {
  children: React.ReactNode;
  requiresAssessment?: boolean;
}

export default function DiscoveryPageLayout({ 
  children, 
  requiresAssessment = false 
}: DiscoveryPageLayoutProps) {
  const { isLoading, assessmentResults, achievementCount } = useDiscoveryData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  // 如果需要評估但尚未完成
  if (requiresAssessment && !assessmentResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <DiscoveryHeader 
          hasAssessmentResults={false}
          achievementCount={achievementCount}
          workspaceCount={0}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">需要先完成評估</h2>
            <p className="text-gray-600 mb-6">請先完成興趣評估，以獲得個人化的體驗。</p>
            <button
              onClick={() => window.location.href = '/discovery/evaluation'}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              開始評估
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <DiscoveryHeader 
        hasAssessmentResults={!!assessmentResults}
        achievementCount={achievementCount}
        workspaceCount={workspaceCount}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}