import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';

/**
 * Hybrid JSON/YAML loader with caching
 * Prioritizes JSON for performance, falls back to YAML
 */
class JsonYamlLoader<T = unknown> {
  private cache = new Map<string, T>();
  private loadPromises = new Map<string, Promise<T>>();
  
  /**
   * Load data from JSON or YAML file
   */
  async load(fileName: string, options?: { preferJson?: boolean; language?: string }): Promise<T> {
    // Create cache key that includes language
    const cacheKey = options?.language ? `${fileName}_${options.language}` : fileName;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    
    // Check if already loading
    const existingPromise = this.loadPromises.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }
    
    // Start loading
    const loadPromise = this.loadFromFile(fileName, options);
    this.loadPromises.set(cacheKey, loadPromise);
    
    try {
      const data = await loadPromise;
      this.cache.set(cacheKey, data);
      return data;
    } finally {
      this.loadPromises.delete(cacheKey);
    }
  }
  
  /**
   * Load from file system - tries JSON first, then YAML
   */
  private async loadFromFile(fileName: string, options?: { preferJson?: boolean, language?: string }): Promise<T> {
    const baseName = fileName.replace(/\.(json|yaml|yml)$/, '');
    const isRubrics = fileName.includes('ai_lit_domains') || fileName.includes('ksa_codes');
    const isPbl = fileName.includes('scenario') || fileName.includes('questions');
    
    // Determine directories
    const jsonDir = isRubrics ? 'rubrics_data_json' : isPbl ? 'pbl_data_json' : 'data';
    const yamlDir = isRubrics ? 'rubrics_data' : isPbl ? 'pbl_data' : 'data';
    
    // If language is specified and this is rubrics data, use language-specific file
    if (options?.language && isRubrics) {
      const langFileName = `${baseName}_${options.language}`;
      
      // Try JSON first (faster)
      if (options?.preferJson !== false) {
        try {
          const jsonPath = path.join(process.cwd(), 'public', jsonDir, baseName, `${langFileName}.json`);
          const jsonContent = await fs.readFile(jsonPath, 'utf-8');
          return JSON.parse(jsonContent) as T;
        } catch (error) {
          // JSON not found or invalid, try YAML
        }
      }
      
      // Fall back to YAML with language-specific file
      try {
        const yamlPath = path.join(process.cwd(), 'public', yamlDir, baseName, `${langFileName}.yaml`);
        const yamlContent = await fs.readFile(yamlPath, 'utf-8');
        return yaml.load(yamlContent) as T;
      } catch (error) {
        // Try .yml extension
        try {
          const ymlPath = path.join(process.cwd(), 'public', yamlDir, baseName, `${langFileName}.yml`);
          const ymlContent = await fs.readFile(ymlPath, 'utf-8');
          return yaml.load(ymlContent) as T;
        } catch (error) {
          // Language-specific file not found, fall back to default
          console.warn(`Language-specific file not found for ${langFileName}, falling back to default`);
        }
      }
    }
    
    // Try JSON first (faster) - for default files
    if (options?.preferJson !== false) {
      try {
        const jsonPath = path.join(process.cwd(), 'public', jsonDir, `${baseName}.json`);
        const jsonContent = await fs.readFile(jsonPath, 'utf-8');
        return JSON.parse(jsonContent) as T;
      } catch (error) {
        // JSON not found or invalid, try YAML
      }
    }
    
    // Fall back to YAML - default file
    try {
      const yamlPath = path.join(process.cwd(), 'public', yamlDir, `${baseName}.yaml`);
      const yamlContent = await fs.readFile(yamlPath, 'utf-8');
      return yaml.load(yamlContent) as T;
    } catch (error) {
      // Try .yml extension
      const ymlPath = path.join(process.cwd(), 'public', yamlDir, `${baseName}.yml`);
      const ymlContent = await fs.readFile(ymlPath, 'utf-8');
      return yaml.load(ymlContent) as T;
    }
  }
  
  /**
   * Load all files from a directory
   */
  async loadDirectory(dirName: string, options?: { preferJson?: boolean }): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const baseDir = path.join(process.cwd(), 'public', dirName);
    
    try {
      const files = await fs.readdir(baseDir);
      const dataFiles = files.filter(f => 
        f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml')
      );
      
      // Load all files in parallel
      await Promise.all(
        dataFiles.map(async (file) => {
          try {
            const data = await this.load(path.join(dirName, file), options);
            const key = file.replace(/\.(json|yaml|yml)$/, '');
            results.set(key, data);
          } catch (error) {
            console.error(`Failed to load ${file}:`, error);
          }
        })
      );
    } catch (error) {
      console.error(`Failed to read directory ${dirName}:`, error);
    }
    
    return results;
  }
  
  /**
   * Clear cache
   */
  clearCache(fileName?: string) {
    if (fileName) {
      this.cache.delete(fileName);
    } else {
      this.cache.clear();
    }
  }
  
  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
  
  /**
   * Preload files for production
   */
  async preload(fileNames: string[], options?: { preferJson?: boolean }): Promise<void> {
    await Promise.all(fileNames.map(fileName => this.load(fileName, options)));
  }
}

// Export singleton instance
export const jsonYamlLoader = new JsonYamlLoader();

// Auto-preload in production
if (process.env.NODE_ENV === 'production') {
  // Prefer JSON in production for performance
  jsonYamlLoader.preload([
    'ai_lit_domains',
    'ksa_codes'
  ], { preferJson: true }).catch(console.error);
}