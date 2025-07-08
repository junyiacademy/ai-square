/**
 * V2 useScenarios Hook
 * Manages scenario listing and creation
 */

import { useState, useEffect, useCallback } from 'react';
import { Scenario, SourceContent } from '@/lib/v2/interfaces/base';

interface UseScenariosOptions {
  type?: 'pbl' | 'discovery' | 'assessment';
  status?: string;
  autoRefresh?: boolean;
}

interface UseScenariosReturn {
  scenarios: Scenario[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startScenario: (sourceContent: SourceContent | string, language?: string) => Promise<Scenario>;
  abandonScenario: (scenarioId: string) => Promise<void>;
}

export function useScenarios(options: UseScenariosOptions = {}): UseScenariosReturn {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScenarios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.type) params.append('type', options.type);
      if (options.status) params.append('status', options.status);

      const response = await fetch(`/api/v2/scenarios?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch scenarios');
      }

      const data = await response.json();
      setScenarios(data.scenarios || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [options.type, options.status]);

  // Initial fetch
  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  // Auto refresh
  useEffect(() => {
    if (!options.autoRefresh) return;

    const interval = setInterval(fetchScenarios, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [options.autoRefresh, fetchScenarios]);

  const startScenario = async (
    sourceContent: SourceContent | string,
    language = 'en'
  ): Promise<Scenario> => {
    try {
      setError(null);

      const body = typeof sourceContent === 'string'
        ? { sourceCode: sourceContent, language }
        : { sourceId: sourceContent.id, language };

      const response = await fetch('/api/v2/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start scenario');
      }

      const data = await response.json();
      
      // Refresh scenarios list
      await fetchScenarios();
      
      return data.scenario;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start scenario';
      setError(message);
      throw new Error(message);
    }
  };

  const abandonScenario = async (scenarioId: string): Promise<void> => {
    try {
      setError(null);

      const response = await fetch(`/api/v2/scenarios/${scenarioId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to abandon scenario');
      }

      // Refresh scenarios list
      await fetchScenarios();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to abandon scenario';
      setError(message);
      throw new Error(message);
    }
  };

  return {
    scenarios,
    loading,
    error,
    refresh: fetchScenarios,
    startScenario,
    abandonScenario
  };
}