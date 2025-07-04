import { useState, useEffect } from 'react';
import type { UserData } from '@/lib/services/user-data-service';

// 共享的數據快取
let cachedData: UserData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 分鐘快取

export function useDiscoveryData() {
  const [data, setData] = useState<UserData | null>(cachedData);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 檢查快取是否有效
        if (cachedData && Date.now() - cacheTimestamp < CACHE_DURATION) {
          setData(cachedData);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        const { userDataService } = await import('@/lib/services/user-data-service');
        const userData = await userDataService.loadUserData();
        
        // 更新快取
        cachedData = userData;
        cacheTimestamp = Date.now();
        
        setData(userData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const refreshData = async () => {
    cachedData = null;
    cacheTimestamp = 0;
    const { userDataService } = await import('@/lib/services/user-data-service');
    const userData = await userDataService.loadUserData();
    cachedData = userData;
    cacheTimestamp = Date.now();
    setData(userData);
    return userData;
  };

  const toggleFavorite = async (pathId: string) => {
    try {
      const { userDataService } = await import('@/lib/services/user-data-service');
      const currentPaths = data?.savedPaths || [];
      const pathIndex = currentPaths.findIndex(p => p.id === pathId);
      
      if (pathIndex !== -1) {
        const updatedPaths = [...currentPaths];
        updatedPaths[pathIndex] = {
          ...updatedPaths[pathIndex],
          isFavorite: !updatedPaths[pathIndex].isFavorite
        };
        
        // Update local state immediately for better UX
        setData(prev => prev ? { ...prev, savedPaths: updatedPaths } : null);
        
        // Save to storage
        await userDataService.updateSavedPath(pathId, updatedPaths[pathIndex]);
        
        // Refresh cache
        await refreshData();
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Refresh to restore correct state
      await refreshData();
    }
  };

  const deletePath = async (pathId: string) => {
    try {
      const { userDataService } = await import('@/lib/services/user-data-service');
      
      // Update local state immediately
      setData(prev => prev ? {
        ...prev,
        savedPaths: prev.savedPaths.filter(p => p.id !== pathId)
      } : null);
      
      // Delete from storage
      await userDataService.deleteSavedPath(pathId);
      
      // Refresh cache
      await refreshData();
    } catch (error) {
      console.error('Failed to delete path:', error);
      // Refresh to restore correct state
      await refreshData();
    }
  };

  return { 
    data, 
    isLoading, 
    error,
    refreshData,
    toggleFavorite,
    deletePath,
    assessmentResults: data?.assessmentResults || null,
    achievements: data?.achievements || { badges: [], totalXp: 0, level: 1, completedTasks: [] },
    workspaceSessions: data?.workspaceSessions || [],
    savedPaths: data?.savedPaths || [],
    achievementCount: data?.achievements?.badges?.length || 0,
    workspaceCount: data?.workspaceSessions?.length || 0
  };
}