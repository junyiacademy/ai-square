'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import DiscoveryPageLayout from '@/components/discovery/DiscoveryPageLayout';
import { useDiscoveryData } from '@/hooks/useDiscoveryData';

// Dynamic import to avoid SSR issues
const PathResults = dynamic(
  () => import('@/components/discovery/PathResults'),
  { 
    ssr: false,
    loading: () => <div className="text-center py-8">載入中...</div>
  }
);

export default function PathsPage() {
  const router = useRouter();
  const { assessmentResults, savedPaths, workspaceSessions } = useDiscoveryData();

  const handlePathSelect = async (pathId: string, workspaceId?: string) => {
    if (workspaceId) {
      // Navigate to specific workspace using new URL structure
      router.push(`/discovery/workspace/${workspaceId}`);
    } else {
      // Create new workspace and navigate to it
      try {
        const { userDataService } = await import('@/lib/services/user-data-service');
        const newWorkspace = {
          id: `ws_${Date.now()}`,
          pathId,
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          status: 'active' as const,
          completedTasks: [],
          totalXP: 0
        };
        
        await userDataService.addWorkspaceSession(newWorkspace);
        router.push(`/discovery/workspace/${newWorkspace.id}`);
      } catch (error) {
        console.error('Failed to create workspace:', error);
      }
    }
  };

  const handleBackToAssessment = () => {
    router.push('/discovery/evaluation');
  };

  return (
    <DiscoveryPageLayout requiresAssessment>
      <PathResults
        results={assessmentResults}
        onPathSelect={handlePathSelect}
        workspaceSessions={workspaceSessions}
        savedPaths={savedPaths}
        onRetakeAssessment={handleBackToAssessment}
      />
    </DiscoveryPageLayout>
  );
}