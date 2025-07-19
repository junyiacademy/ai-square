/**
 * Scenario Storage Service
 * Interface for accessing scenario data from storage (GCS)
 */

export interface IScenarioStorageService {
  list(): Promise<string[]>;
  getScenario(scenarioId: string): Promise<Record<string, unknown>>;
  getProgram(scenarioId: string, programId: string): Promise<Record<string, unknown>>;
  getTask(scenarioId: string, programId: string, taskId: string): Promise<Record<string, unknown>>;
  getEvaluation(scenarioId: string, programId: string, evaluationId: string): Promise<Record<string, unknown>>;
}

// Mock implementation for now - will be replaced with actual GCS implementation
class MockScenarioStorageService implements IScenarioStorageService {
  async list(): Promise<string[]> {
    // Return mock scenario IDs
    return ['ai-job-search', 'smart-home-assistant'];
  }

  async getScenario(scenarioId: string): Promise<Record<string, unknown>> {
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

  async getProgram(scenarioId: string, programId: string): Promise<Record<string, unknown>> {
    return {
      id: programId,
      scenarioId,
      status: 'active',
      userId: 'user123'
    };
  }

  async getTask(scenarioId: string, programId: string, taskId: string): Promise<Record<string, unknown>> {
    return {
      id: taskId,
      programId,
      status: 'pending'
    };
  }

  async getEvaluation(scenarioId: string, programId: string, evaluationId: string): Promise<Record<string, unknown>> {
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