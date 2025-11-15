/**
 * useUserData Hook
 *
 * This hook provides access to user data stored in GCS
 * Automatically handles authentication and migration from localStorage
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserDataServiceClient, createUserDataServiceClient } from '@/lib/services/user-data-service-client';
import type {
  UserData,
  AssessmentResults,
  UserAchievements,
  AssessmentSession
} from '@/lib/types/user-data';

interface UseUserDataReturn {
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

  // Assessment operations
  addAssessmentSession: (session: AssessmentSession) => Promise<void>;
  updateAchievements: (updates: Partial<UserAchievements>) => Promise<void>;

  // Evaluation operations
  saveEvaluation: (type: string, id: string, data: Record<string, unknown>) => Promise<void>;
  loadEvaluation: (type: string, id: string) => Promise<Record<string, unknown> | null>;
  loadEvaluationsByType: (type: string) => Promise<Record<string, unknown>[]>;
  deleteEvaluation: (type: string, id: string) => Promise<void>;

  // Utility operations
  clearAllData: () => Promise<void>;
  migrateFromLocalStorage: () => Promise<boolean>;
}

export function useUserData(): UseUserDataReturn {
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
      if (!data && isLoggedIn) {
        console.log('No GCS data found, attempting migration...');
        try {
          const migrated = await service.migrateFromLocalStorage();
          if (migrated) {
            const migratedData = await service.loadUserData();
            setUserData(migratedData);
          }
        } catch (migrationError) {
          console.error('Migration failed:', migrationError);
          // Continue without migration - user data will be created fresh
        }
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  }, [getService, isLoggedIn]);

  // Auto-load when user changes
  useEffect(() => {
    if (isLoggedIn && user?.email) {
      // Use a ref to prevent dependency issues
      const loadData = async () => {
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
            try {
              const migrated = await service.migrateFromLocalStorage();
              if (migrated) {
                const migratedData = await service.loadUserData();
                setUserData(migratedData);
              }
            } catch (migrationError) {
              console.error('Migration failed:', migrationError);
            }
          }
        } catch (err) {
          console.error('Failed to load user data:', err);
          setError(err instanceof Error ? err.message : 'Failed to load user data');
        } finally {
          setIsLoading(false);
        }
      };

      loadData();
    } else {
      setUserData(null);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user?.email]); // Remove getService to break circular dependency

  // Wrap all service methods to handle errors and update local state
  const wrapServiceMethod = useCallback(<T extends unknown[], R>(
    method: (service: UserDataServiceClient, ...args: T) => Promise<R>
  ) => {
    return async (...args: T): Promise<R> => {
      const service = getService();
      if (!service) {
        console.warn('User not authenticated - skipping user data operation');
        throw new Error('User not authenticated');
      }

      try {
        const result = await method(service, ...args);

        // Don't reload data after operations - let components handle this
        // to avoid cascading API calls

        return result;
      } catch (err) {
        console.error('Service method error:', err);
        setError(err instanceof Error ? err.message : 'Operation failed');
        throw err;
      }
    };
  }, [getService]);

  // Service methods
  const saveUserData = useCallback(async (data: UserData): Promise<void> => {
    const service = getService();
    if (!service) {
      console.warn('User not authenticated - skipping user data operation');
      throw new Error('User not authenticated');
    }

    try {
      await service.saveUserData(data);
      // Update local state to avoid reload
      setUserData(data);
    } catch (err) {
      console.error('Service method error:', err);
      setError(err instanceof Error ? err.message : 'Operation failed');
      throw err;
    }
  }, [getService]);

  const saveAssessmentResults = wrapServiceMethod((service, results: AssessmentResults) =>
    service.saveAssessmentResults(results)
  );

  const saveAchievements = wrapServiceMethod((service, achievements: UserAchievements) =>
    service.saveAchievements(achievements)
  );

  const addAssessmentSession = wrapServiceMethod((service, session: AssessmentSession) =>
    service.addAssessmentSession(session)
  );

  const updateAchievements = wrapServiceMethod((service, updates: Partial<UserAchievements>) =>
    service.updateAchievements(updates)
  );

  // Evaluation methods
  const saveEvaluation = useCallback(async (type: string, id: string, data: Record<string, unknown>): Promise<void> => {
    const service = getService();
    if (!service) throw new Error('User not authenticated');

    try {
      await service.saveEvaluation(type, id, data);
    } catch (err) {
      console.error('Failed to save evaluation:', err);
      throw err;
    }
  }, [getService]);

  const loadEvaluation = useCallback(async (type: string, id: string): Promise<Record<string, unknown> | null> => {
    const service = getService();
    if (!service) return null;

    try {
      return await service.loadEvaluation(type, id);
    } catch (err) {
      console.error('Failed to load evaluation:', err);
      return null;
    }
  }, [getService]);

  const loadEvaluationsByType = useCallback(async (type: string): Promise<Record<string, unknown>[]> => {
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

    // Assessment operations
    addAssessmentSession,
    updateAchievements,

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

// For backward compatibility, also export as useUserDataV2
export { useUserData as useUserDataV2 };

// Re-export types for convenience
export type {
  UserData,
  AssessmentResults,
  UserAchievements,
  AssessmentSession
} from '@/lib/types/user-data';
