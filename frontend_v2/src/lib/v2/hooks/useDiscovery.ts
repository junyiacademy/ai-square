/**
 * V2 useDiscovery Hook
 * Specialized hook for discovery scenarios with dynamic task generation
 */

import { useState, useCallback } from 'react';
import { Task, Program } from '@/lib/v2/interfaces/base';

interface UseDiscoveryReturn {
  loading: boolean;
  error: string | null;
  addDynamicTask: (
    programId: string,
    userRequest: string
  ) => Promise<Task>;
  branchExploration: (
    scenarioId: string,
    newDirection: string
  ) => Promise<Program>;
  getExplorationSummary: (scenarioId: string) => Promise<{
    career_explored: string;
    total_xp: number;
    tasks_completed: number;
    branches_explored: number;
    badges_earned: string[];
    insights: string[];
  }>;
}

export function useDiscovery(): UseDiscoveryReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addDynamicTask = useCallback(async (
    programId: string,
    userRequest: string
  ): Promise<Task> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v2/discovery/add-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId,
          userRequest
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add dynamic task');
      }

      const data = await response.json();
      return data.task;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add dynamic task';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const branchExploration = useCallback(async (
    scenarioId: string,
    newDirection: string
  ): Promise<Program> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v2/discovery/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId,
          newDirection
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create exploration branch');
      }

      const data = await response.json();
      return data.program;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create exploration branch';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getExplorationSummary = useCallback(async (scenarioId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v2/discovery/summary/${scenarioId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get exploration summary');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get exploration summary';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    addDynamicTask,
    branchExploration,
    getExplorationSummary
  };
}