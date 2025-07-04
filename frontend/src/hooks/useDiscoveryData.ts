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

  return { 
    data, 
    isLoading, 
    error,
    refreshData,
    assessmentResults: data?.assessmentResults || null,
    achievements: data?.achievements || { badges: [], totalXp: 0, level: 1, completedTasks: [] },
    workspaceSessions: data?.workspaceSessions || [],
    savedPaths: data?.savedPaths || [],
    achievementCount: data?.achievements?.badges?.length || 0,
    workspaceCount: data?.workspaceSessions?.length || 0
  };
}