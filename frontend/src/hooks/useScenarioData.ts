import { useState, useEffect } from "react";
import { IScenario } from "@/types/unified-learning";
import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";

export interface UseScenarioDataReturn {
  scenario: IScenario | null;
  loading: boolean;
}

/**
 * Custom hook to fetch and manage scenario data
 */
export function useScenarioData(
  scenarioId: string,
  language: string,
): UseScenarioDataReturn {
  const [scenario, setScenario] = useState<IScenario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const fetchScenario = async () => {
      try {
        setLoading(true);

        const response = await authenticatedFetch(
          `/api/pbl/scenarios/${scenarioId}?lang=${language}`,
        );

        if (ignore) return;

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Transform PBL API response to match expected format
            const scenarioData: IScenario = {
              ...result.data,
              objectives: result.data.learningObjectives || [],
              prerequisites: result.data.prerequisites || [],
              metadata: {
                difficulty: result.data.difficulty,
                estimatedDuration: result.data.estimatedDuration,
                prerequisites: result.data.prerequisites || [],
                targetDomains: result.data.targetDomains || [],
                tasks: result.data.tasks || [],
                ksaMapping: result.data.ksaMapping,
              },
            };
            setScenario(scenarioData);
          } else {
            console.error("Invalid PBL API response:", result);
          }
        } else {
          console.error(
            "Failed to fetch scenario:",
            response.status,
            response.statusText,
          );
        }
      } catch (error) {
        if (!ignore) {
          console.error("Error fetching scenario data:", error);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchScenario();

    return () => {
      ignore = true;
    };
  }, [scenarioId, language]);

  return { scenario, loading };
}
