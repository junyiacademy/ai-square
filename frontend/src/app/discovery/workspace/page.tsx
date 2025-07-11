'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import DiscoveryNavigation from '@/components/layout/DiscoveryNavigation';
import DiscoveryHeader from '@/components/discovery/DiscoveryHeader';
import type { UserAchievements, WorkspaceSession } from '@/lib/services/user-data-service';

// Dynamic imports to avoid SSR issues
const WorkspacesList = dynamic(
  () => import('@/components/discovery/WorkspacesList'),
  { 
    ssr: false,
    loading: () => <div className="text-center py-8">載入中...</div>
  }
);

function WorkspaceListContent() {
  const { t } = useTranslation(['discovery', 'navigation']);
  const router = useRouter();
  
  const [achievements, setAchievements] = useState<UserAchievements>({
    badges: [],
    totalXp: 0,
    level: 1,
    completedTasks: []
  });
  const [workspaceSessions, setWorkspaceSessions] = useState<WorkspaceSession[]>([]);
  const [hasAssessmentResults, setHasAssessmentResults] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const { userDataService } = await import('@/lib/services/user-data-service');
        const userData = await userDataService.loadUserData();
        if (userData) {
          setAchievements(userData.achievements);
          setWorkspaceSessions(userData.workspaceSessions);
          setHasAssessmentResults(!!userData.assessmentResults);
        }
      } catch (error) {
        console.error('Failed to load workspace data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Navigate to specific workspace
  const handleWorkspaceSelect = (workspaceId: string) => {
    router.push(`/discovery/workspace/${workspaceId}`);
  };

  // Navigate to new workspace creation
  const handleCreateWorkspace = (pathId: string) => {
    router.push(`/discovery/workspace/new?pathId=${pathId}`);
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Discovery Header with Navigation */}
      <DiscoveryHeader 
        hasAssessmentResults={hasAssessmentResults}
        workspaceCount={workspaceSessions.length}
        achievementCount={achievements.badges.length}
      />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Debug button to clear localStorage */}
        <div className="mb-4 text-center">
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear localStorage (Debug)
          </button>
        </div>
        
        <WorkspacesList
          workspaceSessions={workspaceSessions}
          onWorkspaceSelect={handleWorkspaceSelect}
          onCreateWorkspace={handleCreateWorkspace}
        />
      </div>

      {/* Navigation */}
      <DiscoveryNavigation />
    </div>
  );
}

export default function WorkspaceListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    }>
      <WorkspaceListContent />
    </Suspense>
  );
}