/**
 * Scenario Storage Service
 * Interface for accessing scenario data from storage (GCS)
 */

export interface IScenarioStorageService {
  list(): Promise<string[]>;
  getScenario(scenarioId: string): Promise<any>;
  getProgram(scenarioId: string, programId: string): Promise<any>;
  getTask(scenarioId: string, programId: string, taskId: string): Promise<any>;
  getEvaluation(scenarioId: string, programId: string, evaluationId: string): Promise<any>;
}

// Mock implementation for now - will be replaced with actual GCS implementation
class MockScenarioStorageService implements IScenarioStorageService {
  async list(): Promise<string[]> {
    // Return mock scenario IDs
    return ['ai-job-search', 'smart-home-assistant'];
  }

  async getScenario(scenarioId: string): Promise<any> {
    // Return mock scenario data
    return {
      id: scenarioId,
      title: `${scenarioId} Title`,
      description: `Description for ${scenarioId}`,
      difficulty: 'intermediate',
      estimated_duration: 60,
      target_domains: ['engaging_with_ai'],
      stages: []
    };
  }

  async getProgram(scenarioId: string, programId: string): Promise<any> {
    return {
      id: programId,
      scenarioId,
      status: 'active',
      userId: 'user123'
    };
  }

  async getTask(scenarioId: string, programId: string, taskId: string): Promise<any> {
    return {
      id: taskId,
      programId,
      status: 'pending'
    };
  }

  async getEvaluation(scenarioId: string, programId: string, evaluationId: string): Promise<any> {
    return {
      id: evaluationId,
      programId,
      score: 85
    };
  }
}

// Factory function to get storage service instance
export function getScenarioStorageService(): IScenarioStorageService {
  // TODO: Replace with actual GCS implementation when ready
  return new MockScenarioStorageService();
}