/**
 * PBL YAML Loader
 * 繼承自 BaseYAMLLoader，專門處理 PBL Scenario YAML 檔案
 */

import { BaseYAMLLoader, YAMLLoaderOptions } from '@/lib/abstractions/base-yaml-loader';
import path from 'path';

export interface PBLScenarioInfo {
  id: string;
  title: string;
  title_zhTW?: string;
  title_es?: string;
  title_ja?: string;
  title_ko?: string;
  title_fr?: string;
  title_de?: string;
  title_ru?: string;
  title_it?: string;
  description: string;
  description_zhTW?: string;
  description_es?: string;
  description_ja?: string;
  description_ko?: string;
  description_fr?: string;
  description_de?: string;
  description_ru?: string;
  description_it?: string;
  difficulty: string;
  estimated_duration: number;
  target_domains: string[];
  target_audience?: string;
  prerequisites?: string[];
  learning_objectives?: string[];
}

export interface PBLProgram {
  id: string;
  title: string;
  title_zhTW?: string;
  tasks: PBLTask[];
}

export interface PBLTask {
  id: string;
  title: string;
  title_zhTW?: string;
  type: string;
  description?: string;
  objectives?: string[];
  estimated_time?: number;
  ksa_codes?: string[];
  ai_modules?: string[];
}

export interface KSAMapping {
  domain: string;
  competency: string;
  ksa_codes: {
    knowledge?: string[];
    skills?: string[];
    attitudes?: string[];
  };
}

export interface PBLYAMLData {
  scenario_info: PBLScenarioInfo;
  programs: PBLProgram[];
  ksa_mappings?: KSAMapping[];
  ai_modules?: Record<string, any>;
}

export class PBLYAMLLoader extends BaseYAMLLoader<PBLYAMLData> {
  protected readonly loaderName = 'PBLYAMLLoader';

  constructor() {
    super();
    // Override default base path for PBL data
    this.defaultOptions.basePath = path.join(process.cwd(), 'public', 'pbl_data', 'scenarios');
  }

  /**
   * Load PBL scenario YAML file
   */
  async loadScenario(
    scenarioId: string,
    language: string = 'en',
    options?: YAMLLoaderOptions
  ): Promise<PBLYAMLData | null> {
    // PBL scenarios are organized in subdirectories
    const fileName = path.join(scenarioId, `${scenarioId}_scenario`);
    const result = await this.load(fileName, language, options);

    if (result.success && result.data) {
      return result.data;
    }

    return null;
  }

  /**
   * Scan all available PBL scenario folders
   */
  async scanScenarios(): Promise<string[]> {
    const fs = await import('fs/promises');
    const scenariosDir = this.defaultOptions.basePath!;
    
    try {
      const items = await fs.readdir(scenariosDir, { withFileTypes: true });
      const scenarioFolders = items
        .filter(item => item.isDirectory())
        .map(item => item.name);

      // Validate each folder contains a scenario file
      const validScenarios: string[] = [];
      for (const folder of scenarioFolders) {
        const scenarioFile = path.join(scenariosDir, folder, `${folder}_scenario.yaml`);
        try {
          await fs.access(scenarioFile);
          validScenarios.push(folder);
        } catch {
          console.warn(`No scenario file found in ${folder}`);
        }
      }

      return validScenarios;
    } catch (error) {
      console.error('Error scanning PBL scenarios:', error);
      return [];
    }
  }

  /**
   * Get scenario metadata without loading full content
   */
  async getScenarioMetadata(scenarioId: string): Promise<PBLScenarioInfo | null> {
    const data = await this.loadScenario(scenarioId);
    return data?.scenario_info || null;
  }

  /**
   * Override to handle PBL-specific validation
   */
  protected async validateData(): Promise<{ valid: boolean; error?: string }> {
    // PBL-specific validation can be added here
    return { valid: true };
  }

  /**
   * Override to handle PBL-specific post-processing
   */
  protected async postProcess(data: PBLYAMLData): Promise<PBLYAMLData> {
    // Ensure all programs have IDs
    if (data.programs) {
      data.programs = data.programs.map((program, pIndex) => ({
        ...program,
        id: program.id || `program_${pIndex + 1}`,
        tasks: program.tasks?.map((task, tIndex) => ({
          ...task,
          id: task.id || `task_${pIndex + 1}_${tIndex + 1}`
        })) || []
      }));
    }

    // Ensure scenario_info has an ID
    if (data.scenario_info && !data.scenario_info.id) {
      // Extract ID from the file path or generate one
      data.scenario_info.id = 'pbl_scenario';
    }

    return data;
  }

  /**
   * Get translated field helper specific to PBL
   */
  getTranslatedField(data: any, fieldName: string, language: string): string {
    const suffix = language === 'en' ? '' : `_${language}`;
    const fieldWithSuffix = `${fieldName}${suffix}`;
    
    return data[fieldWithSuffix] || data[fieldName] || '';
  }

  /**
   * Extract all KSA codes used in a scenario
   */
  extractAllKSACodes(data: PBLYAMLData): string[] {
    const ksaCodes = new Set<string>();

    // From KSA mappings
    data.ksa_mappings?.forEach(mapping => {
      Object.values(mapping.ksa_codes).forEach(codes => {
        codes?.forEach(code => ksaCodes.add(code));
      });
    });

    // From tasks
    data.programs?.forEach(program => {
      program.tasks?.forEach(task => {
        task.ksa_codes?.forEach(code => ksaCodes.add(code));
      });
    });

    return Array.from(ksaCodes);
  }

  /**
   * Get all AI modules used in a scenario
   */
  extractAIModules(data: PBLYAMLData): string[] {
    const modules = new Set<string>();

    data.programs?.forEach(program => {
      program.tasks?.forEach(task => {
        task.ai_modules?.forEach(module => modules.add(module));
      });
    });

    return Array.from(modules);
  }
}

// Export singleton instance
export const pblYAMLLoader = new PBLYAMLLoader();