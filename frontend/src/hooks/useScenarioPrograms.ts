import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IProgram } from '@/types/unified-learning';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';

export interface UseScenarioProgramsReturn {
  programs: IProgram[];
  isStarting: boolean;
  startProgram: (programId: string | undefined, language: string, errorTranslation?: string) => Promise<void>;
}

/**
 * Custom hook to manage scenario programs
 */
export function useScenarioPrograms(scenarioId: string): UseScenarioProgramsReturn {
  const router = useRouter();
  const [programs, setPrograms] = useState<IProgram[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  // Fetch programs on mount
  useEffect(() => {
    let ignore = false;

    const fetchPrograms = async () => {
      try {
        const response = await authenticatedFetch(
          `/api/pbl/scenarios/${scenarioId}/programs`
        );

        if (ignore) return;

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.programs) {
            setPrograms(data.data.programs);
          } else {
            setPrograms(Array.isArray(data) ? data : []);
          }
        }
      } catch (error) {
        if (!ignore) {
          console.error('Error fetching programs:', error);
        }
      }
    };

    fetchPrograms();

    return () => {
      ignore = true;
    };
  }, [scenarioId]);

  const startProgram = async (
    programId: string | undefined,
    language: string,
    errorTranslation: string = 'Error starting program'
  ): Promise<void> => {
    setIsStarting(true);
    try {
      if (programId) {
        // Continue existing program
        const program = programs.find(p => p.id === programId);
        if (program) {
          const currentTaskIndex = program.currentTaskIndex || 0;
          const taskIds = (program.metadata?.taskIds as string[]) || [];
          const targetTaskId = taskIds[currentTaskIndex] || taskIds[0];

          if (!targetTaskId) {
            console.error('No task ID found for navigation in program:', program);
            alert(`${errorTranslation} - no tasks found`);
            return;
          }
          router.push(`/pbl/scenarios/${scenarioId}/programs/${programId}/tasks/${targetTaskId}`);
        }
      } else {
        // Create new program
        const response = await authenticatedFetch(
          `/api/pbl/scenarios/${scenarioId}/start`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language })
          }
        );

        if (!response.ok) {
          throw new Error('Failed to create program');
        }

        const data = await response.json();
        if (data.id) {
          const firstTaskId = data.tasks?.[0]?.id || data.taskIds?.[0];
          if (!firstTaskId) {
            console.error('No task ID found in created program:', data);
            alert(`${errorTranslation} - no tasks created`);
            return;
          }
          router.push(`/pbl/scenarios/${scenarioId}/programs/${data.id}/tasks/${firstTaskId}`);
        }
      }
    } catch (error) {
      console.error('Error starting program:', error);
      alert(
        `${errorTranslation}\n\nPlease try logging out and logging in again to refresh your session.`
      );
    } finally {
      setIsStarting(false);
    }
  };

  return { programs, isStarting, startProgram };
}
