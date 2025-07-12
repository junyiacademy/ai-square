'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';
import DiscoveryPageLayout from '@/components/discovery/DiscoveryPageLayout';
import { useDiscoveryData } from '@/hooks/useDiscoveryData';
import { DiscoveryService } from '@/lib/services/discovery-service';
// Remove unused import

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
  const { i18n } = useTranslation();
  const { assessmentResults, savedPaths, workspaceSessions, toggleFavorite, deletePath } = useDiscoveryData();
  const [isGenerating, setIsGenerating] = React.useState(false);

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

  const handleGenerateCustomPath = async (preferences: {
    preference?: string;
    learningStyle?: string;
    customPrompt?: string;
    [key: string]: unknown;
  }) => {
    if (!assessmentResults) {
      console.error('請先完成評估');
      alert('請先完成評估');
      return;
    }

    setIsGenerating(true);
    try {
      // Call AI generation API
      const response = await fetch('/api/discovery/generate-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'current-user', // TODO: Get from auth context
          assessmentResults,
          userPrompt: preferences.customPrompt,
          preferences: {
            type: preferences.preference,
            learningStyle: preferences.learningStyle
          },
          locale: i18n.language,
          requestId: `req_${Date.now()}`
        })
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const { path } = await response.json();
      
      // Save the generated path
      const discoveryService = new DiscoveryService();
      await discoveryService.saveUserPath('current-user', path);
      
      // Create workspace and navigate
      const { userDataService } = await import('@/lib/services/user-data-service');
      const newWorkspace = {
        id: `ws_${Date.now()}`,
        pathId: path.id,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        status: 'active' as const,
        completedTasks: [],
        totalXP: 0
      };
      
      await userDataService.addWorkspaceSession(newWorkspace);
      
      console.log('Successfully generated personalized path!');
      router.push(`/discovery/workspace/${newWorkspace.id}`);
    } catch (error) {
      console.error('Path generation error:', error);
      alert('生成路徑失敗，請稍後再試');
    } finally {
      setIsGenerating(false);
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
        onToggleFavorite={toggleFavorite}
        onDeletePath={deletePath}
        onRetakeAssessment={handleBackToAssessment}
        onGenerateCustomPath={handleGenerateCustomPath}
        isGenerating={isGenerating}
      />
    </DiscoveryPageLayout>
  );
}