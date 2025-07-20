/**
 * Scenario Index Service
 * Provides fast lookups between YAML IDs and UUIDs for scenarios
 * Eliminates the need for O(n) searches through all scenarios
 */

import { IScenario } from '@/types/unified-learning';
import { cacheService } from '@/lib/cache/cache-service';

export interface ScenarioIndexEntry {
  yamlId: string;
  uuid: string;
  sourceType: 'pbl' | 'assessment' | 'discovery';
  title?: string;
  lastUpdated: string;
}

export interface ScenarioIndex {
  yamlToUuid: Map<string, ScenarioIndexEntry>;
  uuidToYaml: Map<string, ScenarioIndexEntry>;
  lastUpdated: string;
}

class ScenarioIndexService {
  private static instance: ScenarioIndexService;
  private readonly CACHE_KEY = 'scenario:index:v1';
  private readonly CACHE_TTL = 30 * 60; // 30 minutes
  private memoryIndex: ScenarioIndex | null = null;

  private constructor() {}

  static getInstance(): ScenarioIndexService {
    if (!ScenarioIndexService.instance) {
      ScenarioIndexService.instance = new ScenarioIndexService();
    }
    return ScenarioIndexService.instance;
  }

  /**
   * Build index from scenarios
   */
  async buildIndex(scenarios: IScenario[]): Promise<ScenarioIndex> {
    const yamlToUuid = new Map<string, ScenarioIndexEntry>();
    const uuidToYaml = new Map<string, ScenarioIndexEntry>();

    for (const scenario of scenarios) {
      const yamlId = scenario.sourceMetadata?.yamlId;
      if (yamlId) {
        const entry: ScenarioIndexEntry = {
          yamlId,
          uuid: scenario.id,
          sourceType: scenario.sourceType as 'pbl' | 'assessment' | 'discovery',
          title: scenario.title,
          lastUpdated: scenario.updatedAt || scenario.createdAt
        };

        yamlToUuid.set(yamlId, entry);
        uuidToYaml.set(scenario.id, entry);
      }
    }

    const index: ScenarioIndex = {
      yamlToUuid,
      uuidToYaml,
      lastUpdated: new Date().toISOString()
    };

    // Store in cache
    await this.saveToCache(index);
    this.memoryIndex = index;

    return index;
  }

  /**
   * Get UUID by YAML ID
   */
  async getUuidByYamlId(yamlId: string): Promise<string | null> {
    const index = await this.getIndex();
    const entry = index?.yamlToUuid.get(yamlId);
    return entry?.uuid || null;
  }

  /**
   * Get YAML ID by UUID
   */
  async getYamlIdByUuid(uuid: string): Promise<string | null> {
    const index = await this.getIndex();
    const entry = index?.uuidToYaml.get(uuid);
    return entry?.yamlId || null;
  }

  /**
   * Get full entry by YAML ID
   */
  async getEntryByYamlId(yamlId: string): Promise<ScenarioIndexEntry | null> {
    const index = await this.getIndex();
    return index?.yamlToUuid.get(yamlId) || null;
  }

  /**
   * Get full entry by UUID
   */
  async getEntryByUuid(uuid: string): Promise<ScenarioIndexEntry | null> {
    const index = await this.getIndex();
    return index?.uuidToYaml.get(uuid) || null;
  }

  /**
   * Batch lookup - get multiple UUIDs by YAML IDs
   */
  async getUuidsByYamlIds(yamlIds: string[]): Promise<Map<string, string>> {
    const index = await this.getIndex();
    const result = new Map<string, string>();

    if (index) {
      for (const yamlId of yamlIds) {
        const entry = index.yamlToUuid.get(yamlId);
        if (entry) {
          result.set(yamlId, entry.uuid);
        }
      }
    }

    return result;
  }

  /**
   * Get or build index
   */
  async getIndex(): Promise<ScenarioIndex | null> {
    // Check memory first
    if (this.memoryIndex) {
      return this.memoryIndex;
    }

    // Check cache
    const cached = await this.loadFromCache();
    if (cached) {
      this.memoryIndex = cached;
      return cached;
    }

    // Index needs to be built by calling buildIndex
    return null;
  }

  /**
   * Save index to cache
   */
  private async saveToCache(index: ScenarioIndex): Promise<void> {
    // Convert Maps to arrays for serialization
    const serializable = {
      yamlToUuid: Array.from(index.yamlToUuid.entries()),
      uuidToYaml: Array.from(index.uuidToYaml.entries()),
      lastUpdated: index.lastUpdated
    };

    await cacheService.set(this.CACHE_KEY, serializable, this.CACHE_TTL);
  }

  /**
   * Load index from cache
   */
  private async loadFromCache(): Promise<ScenarioIndex | null> {
    const cached = await cacheService.get(this.CACHE_KEY);
    if (!cached) return null;

    // Reconstruct Maps from arrays
    return {
      yamlToUuid: new Map(cached.yamlToUuid),
      uuidToYaml: new Map(cached.uuidToYaml),
      lastUpdated: cached.lastUpdated
    };
  }

  /**
   * Invalidate index cache
   */
  async invalidate(): Promise<void> {
    this.memoryIndex = null;
    await cacheService.delete(this.CACHE_KEY);
  }

  /**
   * Check if index exists
   */
  async exists(): Promise<boolean> {
    return this.memoryIndex !== null || await cacheService.has(this.CACHE_KEY);
  }
}

// Export singleton instance
export const scenarioIndexService = ScenarioIndexService.getInstance();