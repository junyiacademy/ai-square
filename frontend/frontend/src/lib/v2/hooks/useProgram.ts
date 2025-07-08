import { useState, useEffect } from 'react';
import { PBLServiceV2 } from '@/lib/services/v2/pbl-service-v2';
import { DiscoveryServiceV2 } from '@/lib/services/v2/discovery-service-v2';
import { AssessmentServiceV2 } from '@/lib/services/v2/assessment-service-v2';
import { StorageFactory } from '@/lib/abstractions/implementations/storage-factory';

interface Program {
  id: string;
  scenarioId: string;
  type: 'pbl' | 'discovery' | 'assessment';
  status: 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  completedTasks?: number;
  totalTasks?: number;
  tasks?: any[];
  sessionNumber?: number;
  [key: string]: any;
}

export function useProgram(scenarioId: string, programId?: string) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (programId) {
      loadProgram();
    } else {
      loadPrograms();
    }
  }, [scenarioId, programId]);

  const getServiceAndType = async (scenarioId: string) => {
    // Try to determine the type from the scenario
    const services = [
      { service: new PBLServiceV2(), type: 'pbl' },
      { service: new DiscoveryServiceV2(), type: 'discovery' },
      { service: new AssessmentServiceV2(), type: 'assessment' },
    ];

    for (const { service, type } of services) {
      try {
        const scenarios = await service.getScenarios();
        if (scenarios.find(s => s.id === scenarioId)) {
          return { service, type };
        }
      } catch (err) {
        // Continue to next service
      }
    }

    throw new Error('Scenario not found');
  };

  const loadPrograms = async () => {
    try {
      setLoading(true);
      setError(null);

      const storage = StorageFactory.create();
      const userEmail = localStorage.getItem('userEmail') || 'anonymous';
      
      // Load programs from storage
      const programsData = await storage.list(`users/${userEmail}/scenarios/${scenarioId}/programs/`);
      
      const loadedPrograms: Program[] = [];
      for (const file of programsData) {
        try {
          const programData = await storage.read(file.name);
          if (programData) {
            loadedPrograms.push(JSON.parse(programData));
          }
        } catch (err) {
          console.error('Failed to load program:', err);
        }
      }

      // Sort by creation date
      loadedPrograms.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setPrograms(loadedPrograms);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load programs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProgram = async () => {
    if (!programId) return;

    try {
      setLoading(true);
      setError(null);

      const storage = StorageFactory.create();
      const userEmail = localStorage.getItem('userEmail') || 'anonymous';
      
      const programData = await storage.read(
        `users/${userEmail}/scenarios/${scenarioId}/programs/${programId}/metadata.json`
      );

      if (programData) {
        const program = JSON.parse(programData);
        
        // Load scenario details to get tasks
        const { service, type } = await getServiceAndType(scenarioId);
        const scenarios = await service.getScenarios();
        const scenario = scenarios.find(s => s.id === scenarioId);
        
        if (scenario) {
          program.tasks = scenario.tasks || [];
          program.type = type;
        }

        setProgram(program);
      }
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load program:', err);
    } finally {
      setLoading(false);
    }
  };

  const createProgram = async () => {
    try {
      const { service, type } = await getServiceAndType(scenarioId);
      const scenarios = await service.getScenarios();
      const scenario = scenarios.find(s => s.id === scenarioId);
      
      if (!scenario) throw new Error('Scenario not found');

      const storage = StorageFactory.create();
      const userEmail = localStorage.getItem('userEmail') || 'anonymous';
      const programId = `program_${Date.now()}`;
      
      const newProgram: Program = {
        id: programId,
        scenarioId,
        type: type as Program['type'],
        status: 'in-progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedTasks: 0,
        totalTasks: scenario.tasks?.length || 0,
        sessionNumber: programs.length + 1,
      };

      // Save program metadata
      await storage.write(
        `users/${userEmail}/scenarios/${scenarioId}/programs/${programId}/metadata.json`,
        JSON.stringify(newProgram, null, 2)
      );

      return newProgram;
    } catch (err) {
      console.error('Failed to create program:', err);
      throw err;
    }
  };

  const updateProgram = async (updates: Partial<Program>) => {
    if (!program || !programId) return;

    try {
      const storage = StorageFactory.create();
      const userEmail = localStorage.getItem('userEmail') || 'anonymous';
      
      const updatedProgram = {
        ...program,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await storage.write(
        `users/${userEmail}/scenarios/${scenarioId}/programs/${programId}/metadata.json`,
        JSON.stringify(updatedProgram, null, 2)
      );

      setProgram(updatedProgram);
      return updatedProgram;
    } catch (err) {
      console.error('Failed to update program:', err);
      throw err;
    }
  };

  return {
    programs,
    program,
    loading,
    error,
    createProgram,
    updateProgram,
    refetch: programId ? loadProgram : loadPrograms,
  };
}