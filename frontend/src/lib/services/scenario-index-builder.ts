/**
 * Scenario Index Builder
 * Builds and maintains the scenario index for all sources
 */

import { scenarioIndexService } from './scenario-index-service';
import { IScenario } from '@/types/unified-learning';
import { SourceType } from '@/types/database';

class ScenarioIndexBuilder {
  private static instance: ScenarioIndexBuilder;
  private isBuilding = false;
  private lastBuildTime: Date | null = null;
  private readonly MIN_BUILD_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): ScenarioIndexBuilder {
    if (!ScenarioIndexBuilder.instance) {
      ScenarioIndexBuilder.instance = new ScenarioIndexBuilder();
    }
    return ScenarioIndexBuilder.instance;
  }

  /**
   * Build index for all scenario sources
   */
  async buildFullIndex(): Promise<void> {
    // Prevent concurrent builds
    if (this.isBuilding) {
      console.log('Index build already in progress, skipping...');
      return;
    }

    // Check if we recently built the index
    if (this.lastBuildTime && 
        Date.now() - this.lastBuildTime.getTime() < this.MIN_BUILD_INTERVAL) {
      console.log('Index was recently built, skipping...');
      return;
    }

    this.isBuilding = true;
    console.log('Building scenario index...');

    try {
      const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
      const scenarioRepo = repositoryFactory.getScenarioRepository();

      // Fetch all scenarios from all sources
      const [pblScenarios, assessmentScenarios, discoveryScenarios] = await Promise.all([
        scenarioRepo.findBySource('pbl'),
        scenarioRepo.findBySource('assessment'),
        scenarioRepo.findBySource('discovery')
      ]);

      // Combine all scenarios
      const allScenarios: IScenario[] = [
        ...pblScenarios,
        ...assessmentScenarios,
        ...discoveryScenarios
      ];

      console.log(`Building index for ${allScenarios.length} scenarios...`);

      // Build the index
      await scenarioIndexService.buildIndex(allScenarios);

      this.lastBuildTime = new Date();
      console.log('Scenario index built successfully');
    } catch (error) {
      console.error('Error building scenario index:', error);
      throw error;
    } finally {
      this.isBuilding = false;
    }
  }

  /**
   * Build index for a specific source type
   */
  async buildSourceIndex(sourceType: 'pbl' | 'assessment' | 'discovery'): Promise<void> {
    console.log(`Building index for ${sourceType} scenarios...`);

    try {
      const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
      const scenarioRepo = repositoryFactory.getScenarioRepository();

      // Fetch scenarios for the specific source
      const scenarios = await scenarioRepo.findBySource(sourceType);

      // Get existing index
      const existingIndex = await scenarioIndexService.getIndex();
      const allScenarios: IScenario[] = [];

      // If we have an existing index, preserve scenarios from other sources
      if (existingIndex) {
        for (const [uuid, entry] of existingIndex.uuidToYaml) {
          if (entry.sourceType !== sourceType) {
            // This is a simplified scenario object just for the index
            allScenarios.push({
              id: uuid,
              mode: 'pbl' as const, // Default mode
              status: 'active' as const,
              version: '1.0.0',
              sourceType: entry.sourceType as SourceType,
              sourceId: entry.yamlId,
              sourceMetadata: { yamlId: entry.yamlId },
              title: { en: entry.title || '' },
              description: { en: '' },
              objectives: [],
              taskTemplates: [],
              difficulty: 'intermediate' as const,
              estimatedMinutes: 60,
              prerequisites: [],
              taskCount: 0,
              xpRewards: {},
              unlockRequirements: {},
              pblData: {},
              discoveryData: {},
              assessmentData: {},
              aiModules: {},
              resources: [],
              createdAt: entry.lastUpdated,
              updatedAt: entry.lastUpdated,
              metadata: {}
            } as unknown as IScenario);
          }
        }
      }

      // Add the new scenarios
      allScenarios.push(...scenarios);

      // Rebuild the complete index
      await scenarioIndexService.buildIndex(allScenarios);

      console.log(`Index updated with ${scenarios.length} ${sourceType} scenarios`);
    } catch (error) {
      console.error(`Error building ${sourceType} index:`, error);
      throw error;
    }
  }

  /**
   * Ensure index exists, build if necessary
   */
  async ensureIndex(): Promise<void> {
    const exists = await scenarioIndexService.exists();
    if (!exists) {
      await this.buildFullIndex();
    }
  }

  /**
   * Get build status
   */
  getStatus(): { isBuilding: boolean; lastBuildTime: Date | null } {
    return {
      isBuilding: this.isBuilding,
      lastBuildTime: this.lastBuildTime
    };
  }
}

// Export singleton instance
export const scenarioIndexBuilder = ScenarioIndexBuilder.getInstance();