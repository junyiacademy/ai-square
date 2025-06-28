import { useState, useEffect, useCallback } from 'react';
import { SessionData, ConversationTurn, StageResult } from '@/types/pbl';

interface PBLProgressData {
  sessionId?: string;
  scenarioId: string;
  currentStage: number;
  currentTaskId?: string;
  conversation: ConversationTurn[];
  stageAnalysis?: StageResult | null;
  lastSaved: string;
  timeSpent: number;
}

const STORAGE_KEY = 'pbl_progress_';

export function usePBLProgress(scenarioId: string) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Generate storage key based on scenarioId and userId
  const getStorageKey = useCallback(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return `${STORAGE_KEY}${scenarioId}_${user.id}`;
      }
    } catch (e) {
      console.error('Error getting user ID for storage key:', e);
    }
    return `${STORAGE_KEY}${scenarioId}_anonymous`;
  }, [scenarioId]);

  // Save progress to localStorage
  const saveProgress = useCallback((
    session: SessionData | null,
    conversation: ConversationTurn[],
    currentTaskId?: string,
    stageAnalysis?: StageResult | null,
    timeSpent?: number
  ) => {
    if (!session && conversation.length === 0) {
      console.log('No progress to save');
      return;
    }

    try {
      const progressData: PBLProgressData = {
        sessionId: session?.id,
        scenarioId,
        currentStage: session?.currentStage || 0,
        currentTaskId,
        conversation,
        stageAnalysis,
        lastSaved: new Date().toISOString(),
        timeSpent: timeSpent || 0
      };

      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(progressData));
      console.log('Progress saved to localStorage:', key);
    } catch (error) {
      console.error('Error saving progress to localStorage:', error);
    }
  }, [scenarioId, getStorageKey]);

  // Load progress from localStorage
  const loadProgress = useCallback((): PBLProgressData | null => {
    try {
      const key = getStorageKey();
      const savedData = localStorage.getItem(key);
      
      if (savedData) {
        const progressData = JSON.parse(savedData) as PBLProgressData;
        console.log('Progress loaded from localStorage:', progressData);
        
        // Check if the saved data is still valid (not too old)
        const lastSaved = new Date(progressData.lastSaved);
        const hoursSinceLastSave = (Date.now() - lastSaved.getTime()) / (1000 * 60 * 60);
        
        // If saved data is older than 24 hours, consider it stale
        if (hoursSinceLastSave > 24) {
          console.log('Saved progress is too old, ignoring');
          return null;
        }
        
        return progressData;
      }
    } catch (error) {
      console.error('Error loading progress from localStorage:', error);
    }
    
    return null;
  }, [getStorageKey]);

  // Clear progress from localStorage
  const clearProgress = useCallback(() => {
    try {
      const key = getStorageKey();
      localStorage.removeItem(key);
      console.log('Progress cleared from localStorage');
    } catch (error) {
      console.error('Error clearing progress from localStorage:', error);
    }
  }, [getStorageKey]);

  // Auto-save progress when window/tab is about to close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // This will be called when the page is about to unload
      // Note: We can't do async operations here, so we just use the last saved data
      const key = getStorageKey();
      const savedData = localStorage.getItem(key);
      if (savedData) {
        // Update the lastSaved timestamp
        try {
          const progressData = JSON.parse(savedData) as PBLProgressData;
          progressData.lastSaved = new Date().toISOString();
          localStorage.setItem(key, JSON.stringify(progressData));
        } catch (error) {
          console.error('Error updating lastSaved timestamp:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [getStorageKey]);

  // Check if there's saved progress for the current scenario
  const hasSavedProgress = useCallback((): boolean => {
    try {
      const key = getStorageKey();
      return !!localStorage.getItem(key);
    } catch (error) {
      console.error('Error checking saved progress:', error);
      return false;
    }
  }, [getStorageKey]);

  return {
    saveProgress,
    loadProgress,
    clearProgress,
    hasSavedProgress,
    isLoading
  };
}