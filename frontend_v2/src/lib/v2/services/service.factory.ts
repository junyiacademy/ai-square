/**
 * Service Factory for V2
 * Creates appropriate service instances based on type
 */

import { IStorageService } from '@/lib/v2/abstractions/storage.interface';
import { IAIService } from '@/lib/v2/abstractions/ai.interface';
import { BaseLearningService } from './base.service';
import { PBLService } from './pbl.service';
import { DiscoveryService } from './discovery.service';
import { AssessmentService } from './assessment.service';

// Repository imports
import { ScenarioRepository } from '@/lib/v2/repositories/scenario.repository';
import { ProgramRepository } from '@/lib/v2/repositories/program.repository';
import { TaskRepository } from '@/lib/v2/repositories/task.repository';
import { LogRepository } from '@/lib/v2/repositories/log.repository';
import { EvaluationRepository } from '@/lib/v2/repositories/evaluation.repository';

export type ServiceType = 'pbl' | 'discovery' | 'assessment' | 'base';

export class ServiceFactory {
  private static instances = new Map<string, BaseLearningService>();

  /**
   * Get or create service instance
   */
  static async getService(
    type: ServiceType,
    storage: IStorageService,
    aiService?: IAIService
  ): Promise<BaseLearningService> {
    const key = `${type}-${aiService ? 'with-ai' : 'no-ai'}`;
    
    if (this.instances.has(key)) {
      return this.instances.get(key)!;
    }

    // Create repositories
    const repositories = {
      scenario: new ScenarioRepository(storage),
      program: new ProgramRepository(storage),
      task: new TaskRepository(storage),
      log: new LogRepository(storage),
      evaluation: new EvaluationRepository(storage)
    };

    // Create service based on type
    let service: BaseLearningService;
    
    switch (type) {
      case 'pbl':
        service = new PBLService(repositories, storage, aiService);
        break;
      
      case 'discovery':
        service = new DiscoveryService(repositories, storage, aiService);
        break;
      
      case 'assessment':
        service = new AssessmentService(repositories, storage, aiService);
        break;
      
      case 'base':
        // Return any of the services for base operations
        service = new PBLService(repositories, storage, aiService);
        break;
      
      default:
        throw new Error(`Unknown service type: ${type}`);
    }

    this.instances.set(key, service);
    return service;
  }

  /**
   * Clear cached instances (useful for testing)
   */
  static clear(): void {
    this.instances.clear();
  }

  /**
   * Get service by scenario type
   */
  static async getServiceByScenario(
    scenario: { type: 'pbl' | 'discovery' | 'assessment' },
    storage: IStorageService,
    aiService?: IAIService
  ): Promise<BaseLearningService> {
    return this.getService(scenario.type, storage, aiService);
  }

  /**
   * Get service by source content type
   */
  static async getServiceBySource(
    source: { type: 'pbl' | 'discovery' | 'assessment' },
    storage: IStorageService,
    aiService?: IAIService
  ): Promise<BaseLearningService> {
    return this.getService(source.type, storage, aiService);
  }

  /**
   * Create all services (for initialization)
   */
  static async createAllServices(
    storage: IStorageService,
    aiService?: IAIService
  ): Promise<{
    pbl: PBLService;
    discovery: DiscoveryService;
    assessment: AssessmentService;
  }> {
    const [pbl, discovery, assessment] = await Promise.all([
      this.getService('pbl', storage, aiService) as Promise<PBLService>,
      this.getService('discovery', storage, aiService) as Promise<DiscoveryService>,
      this.getService('assessment', storage, aiService) as Promise<AssessmentService>
    ]);

    return { pbl, discovery, assessment };
  }
}