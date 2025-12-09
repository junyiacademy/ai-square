import { useState, useEffect } from 'react';
import { contentService } from '@/services/content-service';

export interface KsaMaps {
  kMap: Record<string, { summary: string; theme: string; explanation?: string }>;
  sMap: Record<string, { summary: string; theme: string; explanation?: string }>;
  aMap: Record<string, { summary: string; theme: string; explanation?: string }>;
}

export function useAssessmentData(language: string) {
  const [domainsData, setDomainsData] = useState<unknown[] | null>(null);
  const [ksaMaps, setKsaMaps] = useState<KsaMaps | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔄 Fetching relations tree data for language:', language);
        const data = await contentService.getRelationsTree(language);
        console.log('✅ Relations tree data loaded:', {
          domainsCount: data.domains?.length || 0,
          kMapKeys: Object.keys(data.kMap || {}).length,
          sMapKeys: Object.keys(data.sMap || {}).length,
          aMapKeys: Object.keys(data.aMap || {}).length
        });

        setDomainsData(data.domains);
        setKsaMaps({
          kMap: data.kMap as Record<string, { summary: string; theme: string; explanation?: string }>,
          sMap: data.sMap as Record<string, { summary: string; theme: string; explanation?: string }>,
          aMap: data.aMap as Record<string, { summary: string; theme: string; explanation?: string }>
        });
      } catch (error) {
        console.error('❌ Failed to fetch domains data:', error);
        console.log('🔄 Setting fallback empty data for KSA graph');
        setDomainsData([]);
        setKsaMaps({
          kMap: {},
          sMap: {},
          aMap: {}
        });
      }
    };
    fetchData();
  }, [language]);

  return { domainsData, ksaMaps };
}
