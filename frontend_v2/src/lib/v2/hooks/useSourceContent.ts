/**
 * V2 useSourceContent Hook
 * Manages source content (PBL scenarios, Discovery careers, Assessment exams)
 */

import { useState, useEffect, useCallback } from 'react';
import { SourceContent } from '@/lib/v2/interfaces/base';

interface UseSourceContentOptions {
  type?: 'pbl' | 'discovery' | 'assessment';
  includeInactive?: boolean;
}

interface UseSourceContentReturn {
  sourceContent: SourceContent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  findByCode: (code: string) => SourceContent | undefined;
}

export function useSourceContent(
  options: UseSourceContentOptions = {}
): UseSourceContentReturn {
  const [sourceContent, setSourceContent] = useState<SourceContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSourceContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.type) params.append('type', options.type);
      if (options.includeInactive) params.append('includeInactive', 'true');

      const response = await fetch(`/api/v2/source-content?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch source content');
      }

      const data = await response.json();
      setSourceContent(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [options.type, options.includeInactive]);

  useEffect(() => {
    fetchSourceContent();
  }, [fetchSourceContent]);

  const findByCode = useCallback((code: string) => {
    return sourceContent.find(item => item.code === code);
  }, [sourceContent]);

  return {
    sourceContent,
    loading,
    error,
    refresh: fetchSourceContent,
    findByCode
  };
}