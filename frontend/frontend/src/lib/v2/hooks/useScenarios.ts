import { useState, useEffect } from 'react';
import { PBLServiceV2 } from '@/lib/services/v2/pbl-service-v2';
import { DiscoveryServiceV2 } from '@/lib/services/v2/discovery-service-v2';
import { AssessmentServiceV2 } from '@/lib/services/v2/assessment-service-v2';
import { ScenarioType } from '@/lib/types/pbl';

interface Scenario {
  id: string;
  type: ScenarioType;
  title: string;
  description: string;
  tasks?: any[];
  difficulty?: string;
  [key: string]: any;
}

export function useScenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load scenarios from all three services
      const [pblScenarios, discoveryScenarios, assessmentScenarios] = await Promise.all([
        loadPBLScenarios(),
        loadDiscoveryScenarios(),
        loadAssessmentScenarios(),
      ]);

      const allScenarios = [
        ...pblScenarios,
        ...discoveryScenarios,
        ...assessmentScenarios,
      ];

      setScenarios(allScenarios);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load scenarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPBLScenarios = async (): Promise<Scenario[]> => {
    try {
      const pblService = new PBLServiceV2();
      const scenarios = await pblService.getScenarios();
      return scenarios.map(s => ({ ...s, type: 'pbl' as ScenarioType }));
    } catch (err) {
      console.error('Failed to load PBL scenarios:', err);
      return [];
    }
  };

  const loadDiscoveryScenarios = async (): Promise<Scenario[]> => {
    try {
      const discoveryService = new DiscoveryServiceV2();
      const scenarios = await discoveryService.getScenarios();
      return scenarios.map(s => ({ ...s, type: 'discovery' as ScenarioType }));
    } catch (err) {
      console.error('Failed to load Discovery scenarios:', err);
      return [];
    }
  };

  const loadAssessmentScenarios = async (): Promise<Scenario[]> => {
    try {
      const assessmentService = new AssessmentServiceV2();
      const scenarios = await assessmentService.getScenarios();
      return scenarios.map(s => ({ ...s, type: 'assessment' as ScenarioType }));
    } catch (err) {
      console.error('Failed to load Assessment scenarios:', err);
      return [];
    }
  };

  return {
    scenarios,
    loading,
    error,
    refetch: loadScenarios,
  };
}