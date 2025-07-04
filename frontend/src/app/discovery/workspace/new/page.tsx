'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon, FolderOpenIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function NewWorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathId = searchParams.get('pathId');
  const [showWarning, setShowWarning] = useState(false);
  const [activeWorkspaces, setActiveWorkspaces] = useState<any[]>([]);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAndCreateWorkspace = async () => {
      if (!pathId) {
        // No pathId provided, redirect to workspace list
        router.push('/discovery/workspace');
        return;
      }

      try {
        const { userDataService } = await import('@/lib/services/user-data-service');
        const userData = await userDataService.loadUserData();
        
        if (userData?.workspaceSessions) {
          // Check for active workspaces for this path
          const activeWorkspacesForPath = userData.workspaceSessions.filter(
            ws => ws.pathId === pathId && ws.status === 'active'
          );
          
          if (activeWorkspacesForPath.length > 0) {
            // Show warning instead of creating new workspace
            setActiveWorkspaces(activeWorkspacesForPath);
            setShowWarning(true);
            setIsChecking(false);
            return;
          }
        }
        
        // No active workspaces, create new one
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
        
        // Redirect to the new workspace
        router.replace(`/discovery/workspace/${newWorkspace.id}`);
      } catch (error) {
        console.error('Failed to create workspace:', error);
        router.push('/discovery/workspace');
      }
    };

    checkAndCreateWorkspace();
  }, [pathId, router]);

  const handleContinueExisting = (workspaceId: string) => {
    router.push(`/discovery/workspace/${workspaceId}`);
  };

  const handleCreateNew = async () => {
    try {
      const { userDataService } = await import('@/lib/services/user-data-service');
      
      // Create new workspace anyway
      const newWorkspace = {
        id: `ws_${Date.now()}`,
        pathId: pathId!,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        status: 'active' as const,
        completedTasks: [],
        totalXP: 0
      };
      
      await userDataService.addWorkspaceSession(newWorkspace);
      router.replace(`/discovery/workspace/${newWorkspace.id}`);
    } catch (error) {
      console.error('Failed to create workspace:', error);
      router.push('/discovery/workspace');
    }
  };

  if (showWarning) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mx-auto mb-4">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            你有未完成的工作區
          </h2>
          <p className="text-gray-600 text-center mb-6">
            此學習路徑還有 {activeWorkspaces.length} 個進行中的工作區，要繼續之前的進度嗎？
          </p>
          
          {/* Active workspaces list */}
          <div className="space-y-3 mb-6 max-h-40 overflow-y-auto">
            {activeWorkspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => handleContinueExisting(workspace.id)}
                className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FolderOpenIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        進行中 • {workspace.completedTasks.length} 個任務已完成
                      </p>
                      <p className="text-xs text-gray-500">
                        最後活動：{new Date(workspace.lastActiveAt).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                  </div>
                  <span className="text-purple-600 text-sm">繼續</span>
                </div>
              </button>
            ))}
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/discovery/workspace')}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              返回列表
            </button>
            <button
              onClick={handleCreateNew}
              className="flex-1 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>仍要創建新的</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">檢查工作區狀態...</p>
        </div>
      </div>
    );
  }

  return null;
}