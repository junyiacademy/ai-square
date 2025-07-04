'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { UserAchievements, WorkspaceSession } from '@/lib/services/user-data-service';

// Dynamic imports to avoid SSR issues
const ExplorationWorkspace = dynamic(
  () => import('@/components/discovery/ExplorationWorkspace'),
  { 
    ssr: false,
    loading: () => <div className="text-center py-8">載入中...</div>
  }
);

function WorkspaceDetailContent() {
  const { t } = useTranslation(['discovery', 'navigation']);
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  
  const [achievements, setAchievements] = useState<UserAchievements>({
    badges: [],
    totalXp: 0,
    level: 1,
    completedTasks: []
  });
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load workspace data
  useEffect(() => {
    const loadData = async () => {
      try {
        const { userDataService } = await import('@/lib/services/user-data-service');
        const userData = await userDataService.loadUserData();
        
        if (userData) {
          setAchievements(userData.achievements);
          
          // Find the specific workspace
          const workspace = userData.workspaceSessions.find(ws => ws.id === workspaceId);
          if (workspace) {
            setCurrentWorkspace(workspace);
          } else {
            console.error('Workspace not found:', workspaceId);
            router.push('/discovery/workspace');
          }
        }
      } catch (error) {
        console.error('Failed to load workspace data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [workspaceId, router]);

  const handleTaskComplete = async (taskId: string, xpGained: number, skillsGained: string[]) => {
    try {
      const { userDataService } = await import('@/lib/services/user-data-service');
      const newAchievements = { ...achievements };
      
      // Add XP and update level
      newAchievements.totalXp += xpGained;
      newAchievements.level = Math.floor(newAchievements.totalXp / 100) + 1;
      
      // Mark task as completed
      if (!newAchievements.completedTasks.includes(taskId)) {
        newAchievements.completedTasks.push(taskId);
      }
      
      // Award badges based on achievements
      const totalTasks = newAchievements.completedTasks.length;
      
      if (totalTasks >= 1 && !newAchievements.badges.includes('first_task')) {
        newAchievements.badges.push('first_task');
      }
      
      if (totalTasks >= 3 && !newAchievements.badges.includes('problem_solver')) {
        newAchievements.badges.push('problem_solver');
      }
      
      if (totalTasks >= 5 && !newAchievements.badges.includes('ai_collaborator')) {
        newAchievements.badges.push('ai_collaborator');
      }
      
      // Save achievements
      await userDataService.saveAchievements(newAchievements);
      setAchievements(newAchievements);
      
      // Update current workspace session
      if (currentWorkspace) {
        const updatedCompletedTasks = currentWorkspace.completedTasks.includes(taskId)
          ? currentWorkspace.completedTasks
          : [...currentWorkspace.completedTasks, taskId];
        
        // Check if all tasks are completed (assume 3 tasks per path for now)
        const isCompleted = updatedCompletedTasks.length >= 3;
        
        await userDataService.updateWorkspaceSession(workspaceId, {
          completedTasks: updatedCompletedTasks,
          totalXP: currentWorkspace.totalXP + xpGained,
          status: isCompleted ? 'completed' : 'active'
        });
        
        setCurrentWorkspace({
          ...currentWorkspace,
          lastActiveAt: new Date().toISOString(),
          completedTasks: updatedCompletedTasks,
          totalXP: currentWorkspace.totalXP + xpGained,
          status: isCompleted ? 'completed' : 'active'
        });
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
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

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">冒險基地不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <ExplorationWorkspace
        pathId={currentWorkspace.pathId}
        workspaceId={workspaceId}
        achievements={achievements}
        onTaskComplete={handleTaskComplete}
        onBackToPaths={() => router.push('/discovery/workspace')}
        onViewAchievements={() => router.push('/discovery/achievements')}
      />
    </div>
  );
}

export default function WorkspaceDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    }>
      <WorkspaceDetailContent />
    </Suspense>
  );
}