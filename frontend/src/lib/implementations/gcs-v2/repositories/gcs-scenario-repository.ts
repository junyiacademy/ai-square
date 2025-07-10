/**
 * GCS Scenario Repository 實作
 */

import { GCSRepositoryBase } from '../base/gcs-repository-base';
import { BaseScenarioRepository, IScenario } from '@/types/unified-learning';
import { GCS_CONFIG } from '@/lib/config/gcs.config';

export class GCSScenarioRepository<T extends IScenario = IScenario> 
  extends GCSRepositoryBase<T> 
  implements BaseScenarioRepository<T> {
  
  constructor() {
    super(GCS_CONFIG.paths.scenarios);
  }

  async create(scenario: Omit<T, 'id'>): Promise<T> {
    const newScenario = {
      ...scenario,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as T;
    
    return this.saveEntity(newScenario);
  }

  async findById(id: string): Promise<T | null> {
    return this.loadEntity(id);
  }

  async findBySource(sourceType: string, sourceId?: string): Promise<T[]> {
    // 列出所有 scenarios
    const allScenarios = await this.listAllEntities();
    
    // 過濾符合條件的 scenarios
    return allScenarios.filter(scenario => {
      if (scenario.sourceType !== sourceType) {
        return false;
      }
      
      if (sourceId && scenario.sourceRef.sourceId !== sourceId) {
        return false;
      }
      
      return true;
    });
  }

  async findAll(): Promise<T[]> {
    return this.listAllEntities();
  }

  async findByYamlPath(yamlPath: string): Promise<T | null> {
    const allScenarios = await this.listAllEntities();
    return allScenarios.find(scenario => 
      scenario.sourceRef?.metadata?.configPath === yamlPath
    ) || null;
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const updated = await this.updateEntity(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    
    if (!updated) {
      throw new Error(`Scenario not found: ${id}`);
    }
    
    return updated;
  }

  /**
   * 根據 YAML 路徑查找 Scenario
   */
  async findByYamlPath(path: string): Promise<T | null> {
    const allScenarios = await this.listAllEntities();
    
    return allScenarios.find(scenario => 
      scenario.sourceRef.type === 'yaml' && 
      scenario.sourceRef.path === path
    ) || null;
  }

  /**
   * 根據類型列出 Scenarios
   */
  async listByType(sourceType: 'pbl' | 'discovery' | 'assessment'): Promise<T[]> {
    const allScenarios = await this.listAllEntities();
    return allScenarios.filter(scenario => scenario.sourceType === sourceType);
  }

  /**
   * 刪除 Scenario
   */
  async delete(id: string): Promise<boolean> {
    return this.deleteEntity(id);
  }

  /**
   * 列出所有 Scenarios
   */
  async listAll(): Promise<T[]> {
    return this.listAllEntities();
  }
}