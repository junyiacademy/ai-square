import { useUserData } from './useUserData';

export function useDiscoveryData() {
  const { 
    userData, 
    isLoading, 
    error, 
    loadUserData
  } = useUserData();

  const refreshData = async () => {
    await loadUserData();
    return userData;
  };

  return { 
    data: userData, 
    isLoading, 
    error: error ? new Error(error) : null,
    refreshData,
    assessmentResults: userData?.assessmentResults || null,
    achievements: userData?.achievements || { badges: [], totalXp: 0, level: 1, completedTasks: [] },
    achievementCount: userData?.achievements?.badges?.length || 0
  };
}