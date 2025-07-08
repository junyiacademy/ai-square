/**
 * V2 usePrograms Hook
 * Manages programs within a scenario
 */

import { useState, useEffect, useCallback } from 'react';
import { Program } from '@/lib/v2/interfaces/base';

interface UseProgramsOptions {
  scenarioId: string;
  autoActivate?: boolean;
}

interface UseProgramsReturn {
  programs: Program[];
  activeProgram: Program | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setActiveProgram: (program: Program) => void;
}

export function usePrograms(options: UseProgramsOptions): UseProgramsReturn {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [activeProgram, setActiveProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrograms = useCallback(async () => {
    if (!options.scenarioId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/v2/programs?scenarioId=${options.scenarioId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch programs');
      }

      const data = await response.json();
      setPrograms(data.programs || []);
      
      // Set active program
      const active = data.active || (options.autoActivate ? data.programs[0] : null);
      setActiveProgram(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [options.scenarioId, options.autoActivate]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  return {
    programs,
    activeProgram,
    loading,
    error,
    refresh: fetchPrograms,
    setActiveProgram
  };
}