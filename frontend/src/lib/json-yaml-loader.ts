/**
 * JSON/YAML Loader with fallback support
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface LoaderOptions {
  preferJson?: boolean;
  fallbackToYaml?: boolean;
}

export const jsonYamlLoader = {
  /**
   * Load data from JSON or YAML with fallback
   */
  async load<T = unknown>(
    filePath: string,
    options: LoaderOptions = { preferJson: true, fallbackToYaml: true }
  ): Promise<T | null> {
    const basePath = filePath.replace(/\.(json|yaml|yml)$/, '');
    
    if (options.preferJson) {
      // Try JSON first
      const jsonPath = `${basePath}.json`;
      const jsonData = await this.loadJson<T>(jsonPath);
      if (jsonData !== null) return jsonData;
      
      // Fallback to YAML if enabled
      if (options.fallbackToYaml) {
        const yamlData = await this.loadYaml<T>(`${basePath}.yaml`);
        if (yamlData !== null) return yamlData;
        
        // Try .yml extension
        return await this.loadYaml<T>(`${basePath}.yml`);
      }
    } else {
      // Try YAML first
      let yamlData = await this.loadYaml<T>(`${basePath}.yaml`);
      if (yamlData !== null) return yamlData;
      
      // Try .yml extension
      yamlData = await this.loadYaml<T>(`${basePath}.yml`);
      if (yamlData !== null) return yamlData;
      
      // Fallback to JSON
      return await this.loadJson<T>(`${basePath}.json`);
    }
    
    return null;
  },
  
  /**
   * Load JSON file
   */
  async loadJson<T = unknown>(filePath: string): Promise<T | null> {
    try {
      const fullPath = path.join(process.cwd(), 'public', filePath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to load JSON ${filePath}:`, error);
      return null;
    }
  },
  
  /**
   * Load YAML file
   */
  async loadYaml<T = unknown>(filePath: string): Promise<T | null> {
    try {
      const fullPath = path.join(process.cwd(), 'public', filePath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      return yaml.load(content) as T;
    } catch (error) {
      console.error(`Failed to load YAML ${filePath}:`, error);
      return null;
    }
  },
  
  /**
   * Check if file exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(process.cwd(), 'public', filePath);
      await fs.promises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
};