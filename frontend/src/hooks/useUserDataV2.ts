/**
 * useUserDataV2 Hook
 * 
 * This hook provides access to user data stored in GCS
 * Automatically handles authentication and migration from localStorage
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { UserDataServiceClient, createUserDataServiceClient } from '@/lib/services/user-data-service-client';
import type { 
  UserData, 
  AssessmentResults, 
  WorkspaceSession, 
  SavedPathData, 
  UserAchievements,
  AssessmentSession,
  TaskAnswer
} from '@/lib/services/user-data-service';

interface UseUserDataV2Return {
  // Data
  userData: UserData | null;
  isLoading: boolean;
  error: string | null;
  
  // Core operations
  loadUserData: () => Promise<void>;
  saveUserData: (data: UserData) => Promise<void>;
  
  // Specific operations
  saveAssessmentResults: (results: AssessmentResults) => Promise<void>;
  saveAchievements: (achievements: UserAchievements) => Promise<void>;
  saveWorkspaceSessions: (sessions: WorkspaceSession[]) => Promise<void>;
  savePaths: (paths: SavedPathData[]) => Promise<void>;
  
  // Session operations
  addWorkspaceSession: (session: WorkspaceSession) => Promise<void>;
  updateWorkspaceSession: (sessionId: string, updates: Partial<WorkspaceSession>) => Promise<void>;
  saveTaskAnswer: (sessionId: string, taskAnswer: TaskAnswer) => Promise<void>;
  getTaskAnswer: (sessionId: string, taskId: string) => Promise<TaskAnswer | null>;
  
  // Assessment operations
  addAssessmentSession: (session: AssessmentSession, paths: SavedPathData[]) => Promise<void>;
  updateAchievements: (updates: Partial<UserAchievements>) => Promise<void>;
  
  // Path operations
  togglePathFavorite: (pathId: string) => Promise<void>;
  updateSavedPath: (pathId: string, updates: SavedPathData) => Promise<void>;
  deleteSavedPath: (pathId: string) => Promise<void>;
  
  // Evaluation operations
  saveEvaluation: (type: string, id: string, data: any) => Promise<void>;
  loadEvaluation: (type: string, id: string) => Promise<any | null>;
  loadEvaluationsByType: (type: string) => Promise<any[]>;
  deleteEvaluation: (type: string, id: string) => Promise<void>;
  
  // Utility operations
  clearAllData: () => Promise<void>;
  migrateFromLocalStorage: () => Promise<boolean>;
}

export function useUserDataV2(): UseUserDataV2Return {
  const { user, isLoggedIn } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Keep reference to current service
  const serviceRef = useRef<UserDataServiceClient | null>(null);
  
  // Get or create service
  const getService = useCallback(() => {
    if (!user || !isLoggedIn) {
      return null;
    }
    
    // Create new service if doesn't exist (client service doesn't need userId)
    if (!serviceRef.current) {
      serviceRef.current = createUserDataServiceClient();
    }
    
    return serviceRef.current;
  }, [user, isLoggedIn]);
  
  // Load user data
  const loadUserData = useCallback(async () => {
    const service = getService();
    if (!service) {
      setUserData(null);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await service.loadUserData();
      setUserData(data);
      
      // If no data exists, try to migrate from localStorage
      if (!data) {
        console.log('No GCS data found, attempting migration...');
        const migrated = await service.migrateFromLocalStorage();
        if (migrated) {
          const migratedData = await service.loadUserData();
          setUserData(migratedData);
        }
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  }, [getService]);
  
  // Auto-load when user changes
  useEffect(() => {
    if (isLoggedIn && user) {
      loadUserData();
    } else {
      setUserData(null);
      setIsLoading(false);
    }
  }, [isLoggedIn, user, loadUserData]);
  
  // Wrap all service methods to handle errors and update local state
  const wrapServiceMethod = useCallback(<T extends any[], R>(
    method: (service: UserDataServiceClient, ...args: T) => Promise<R>
  ) => {
    return async (...args: T): Promise<R> => {
      const service = getService();
      if (!service) {
        throw new Error('User not authenticated');
      }
      
      try {
        const result = await method(service, ...args);
        
        // Reload user data after any modification
        await loadUserData();
        
        return result;
      } catch (err) {
        console.error('Service method error:', err);
        setError(err instanceof Error ? err.message : 'Operation failed');
        throw err;
      }
    };
  }, [getService, loadUserData]);
  
  // Service methods
  const saveUserData = wrapServiceMethod((service, data: UserData) => 
    service.saveUserData(data)
  );
  
  const saveAssessmentResults = wrapServiceMethod((service, results: AssessmentResults) => 
    service.saveAssessmentResults(results)
  );
  
  const saveAchievements = wrapServiceMethod((service, achievements: UserAchievements) => 
    service.saveAchievements(achievements)
  );
  
  const saveWorkspaceSessions = wrapServiceMethod((service, sessions: WorkspaceSession[]) => 
    service.saveWorkspaceSessions(sessions)
  );
  
  const savePaths = wrapServiceMethod((service, paths: SavedPathData[]) => 
    service.savePaths(paths)
  );
  
  const addWorkspaceSession = wrapServiceMethod((service, session: WorkspaceSession) => 
    service.addWorkspaceSession(session)
  );
  
  const updateWorkspaceSession = wrapServiceMethod((service, sessionId: string, updates: Partial<WorkspaceSession>) => 
    service.updateWorkspaceSession(sessionId, updates)
  );
  
  const saveTaskAnswer = wrapServiceMethod((service, sessionId: string, taskAnswer: TaskAnswer) => 
    service.saveTaskAnswer(sessionId, taskAnswer)
  );
  
  const getTaskAnswer = useCallback(async (sessionId: string, taskId: string): Promise<TaskAnswer | null> => {
    const service = getService();
    if (!service) return null;
    
    try {
      return await service.getTaskAnswer(sessionId, taskId);
    } catch (err) {
      console.error('Failed to get task answer:', err);
      return null;
    }
  }, [getService]);
  
  const addAssessmentSession = wrapServiceMethod((service, session: AssessmentSession, paths: SavedPathData[]) => 
    service.addAssessmentSession(session, paths)
  );
  
  const updateAchievements = wrapServiceMethod((service, updates: Partial<UserAchievements>) => 
    service.updateAchievements(updates)
  );
  
  const togglePathFavorite = wrapServiceMethod((service, pathId: string) => 
    service.togglePathFavorite(pathId)
  );
  
  const updateSavedPath = wrapServiceMethod((service, pathId: string, updates: SavedPathData) => 
    service.updateSavedPath(pathId, updates)
  );
  
  const deleteSavedPath = wrapServiceMethod((service, pathId: string) => 
    service.deleteSavedPath(pathId)
  );
  
  // Evaluation methods
  const saveEvaluation = useCallback(async (type: string, id: string, data: any): Promise<void> => {
    const service = getService();
    if (!service) throw new Error('User not authenticated');
    
    try {
      await service.saveEvaluation(type, id, data);
    } catch (err) {
      console.error('Failed to save evaluation:', err);
      throw err;
    }
  }, [getService]);
  
  const loadEvaluation = useCallback(async (type: string, id: string): Promise<any | null> => {
    const service = getService();
    if (!service) return null;
    
    try {
      return await service.loadEvaluation(type, id);
    } catch (err) {
      console.error('Failed to load evaluation:', err);
      return null;
    }
  }, [getService]);
  
  const loadEvaluationsByType = useCallback(async (type: string): Promise<any[]> => {
    const service = getService();
    if (!service) return [];
    
    try {
      return await service.loadEvaluationsByType(type);
    } catch (err) {
      console.error('Failed to load evaluations:', err);
      return [];
    }
  }, [getService]);
  
  const deleteEvaluation = useCallback(async (type: string, id: string): Promise<void> => {
    const service = getService();
    if (!service) throw new Error('User not authenticated');
    
    try {
      await service.deleteEvaluation(type, id);
    } catch (err) {
      console.error('Failed to delete evaluation:', err);
      throw err;
    }
  }, [getService]);
  
  const clearAllData = wrapServiceMethod((service) => 
    service.clearAllData()
  );
  
  const migrateFromLocalStorage = useCallback(async (): Promise<boolean> => {
    const service = getService();
    if (!service) return false;
    
    try {
      return await service.migrateFromLocalStorage();
    } catch (err) {
      console.error('Failed to migrate from localStorage:', err);
      return false;
    }
  }, [getService]);
  
  return {
    // Data
    userData,
    isLoading,
    error,
    
    // Core operations
    loadUserData,
    saveUserData,
    
    // Specific operations
    saveAssessmentResults,
    saveAchievements,
    saveWorkspaceSessions,
    savePaths,
    
    // Session operations
    addWorkspaceSession,
    updateWorkspaceSession,
    saveTaskAnswer,
    getTaskAnswer,
    
    // Assessment operations
    addAssessmentSession,
    updateAchievements,
    
    // Path operations
    togglePathFavorite,
    updateSavedPath,
    deleteSavedPath,
    
    // Evaluation operations
    saveEvaluation,
    loadEvaluation,
    loadEvaluationsByType,
    deleteEvaluation,
    
    // Utility operations
    clearAllData,
    migrateFromLocalStorage,
  };
}