import { useUserDataV2 } from './useUserDataV2';

export function useDiscoveryData() {
  const { 
    userData, 
    isLoading, 
    error, 
    loadUserData,
    togglePathFavorite,
    deleteSavedPath
  } = useUserDataV2();

  const refreshData = async () => {
    await loadUserData();
    return userData;
  };

  const toggleFavorite = async (pathId: string) => {
    try {
      await togglePathFavorite(pathId);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Refresh to restore correct state
      await refreshData();
    }
  };

  const deletePath = async (pathId: string) => {
    try {
      await deleteSavedPath(pathId);
    } catch (error) {
      console.error('Failed to delete path:', error);
      // Refresh to restore correct state
      await refreshData();
    }
  };

  return { 
    data: userData, 
    isLoading, 
    error: error ? new Error(error) : null,
    refreshData,
    toggleFavorite,
    deletePath,
    assessmentResults: userData?.assessmentResults || null,
    achievements: userData?.achievements || { badges: [], totalXp: 0, level: 1, completedTasks: [] },
    workspaceSessions: userData?.workspaceSessions || [],
    savedPaths: userData?.savedPaths || [],
    achievementCount: userData?.achievements?.badges?.length || 0,
    workspaceCount: userData?.workspaceSessions?.length || 0
  };
}