import { useState, useEffect } from 'react';
import { IScenario, IProgram } from '@/types/unified-learning';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';

export interface UseScenarioDataReturn {
  scenario: IScenario | null;
  userPrograms: IProgram[];
  loading: boolean;
}

/**
 * Hook to fetch scenario and user programs data
 */
export function useScenarioData(
  scenarioId: string,
  language: string
): UseScenarioDataReturn {
  const [scenario, setScenario] = useState<IScenario | null>(null);
  const [userPrograms, setUserPrograms] = useState<IProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch scenario details and programs in parallel
        const [scenarioResponse, programsResponse] = await Promise.all([
          authenticatedFetch(`/api/pbl/scenarios/${scenarioId}?lang=${language}`),
          authenticatedFetch(`/api/pbl/scenarios/${scenarioId}/programs`)
        ]);

        if (ignore) return;

        // Handle scenario response
        if (scenarioResponse.ok) {
          const response = await scenarioResponse.json();
          if (response.success && response.data) {
            // Transform PBL API response to match expected format
            const scenarioData = {
              ...response.data,
              objectives: response.data.learningObjectives || [],
              prerequisites: response.data.prerequisites || [], // Move prerequisites to top level
              metadata: {
                difficulty: response.data.difficulty,
                estimatedDuration: response.data.estimatedDuration,
                prerequisites: response.data.prerequisites || [], // Keep in metadata for compatibility
                targetDomains: response.data.targetDomains || [],
                tasks: response.data.tasks || [],
                ksaMapping: response.data.ksaMapping
              }
            };
            setScenario(scenarioData);
          } else {
            console.error('Invalid PBL API response:', response);
          }
        } else {
          console.error('Failed to fetch scenario:', scenarioResponse.status, scenarioResponse.statusText);
        }

        // Handle programs response
        if (programsResponse.ok) {
          const programsData = await programsResponse.json();
          console.log('Programs API response:', programsData);
          // Handle API response format: { success: true, data: { programs: [] } }
          if (programsData.success && programsData.data?.programs) {
            setUserPrograms(programsData.data.programs);
          } else {
            // Fallback for direct array format
            setUserPrograms(Array.isArray(programsData) ? programsData : []);
          }
        }
      } catch (error) {
        if (!ignore) {
          console.error('Error fetching scenario data:', error);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, [scenarioId, language]);

  return {
    scenario,
    userPrograms,
    loading
  };
}
