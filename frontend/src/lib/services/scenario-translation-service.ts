/**
 * Scenario Translation Service
 * Implements hybrid translation architecture:
 * - English: served from GCS
 * - Other languages: loaded from YAML files on demand
 */

import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { IScenario } from '@/types/unified-learning';

export interface TranslationContent {
  title?: string;
  description?: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

interface CacheEntry {
  content: TranslationContent;
  timestamp: number;
}

export class ScenarioTranslationService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private timeProvider: () => number = () => Date.now();

  /**
   * Load translation from YAML file
   * Returns null for English or if file doesn't exist
   */
  async loadTranslation(
    scenario: IScenario,
    language: string
  ): Promise<TranslationContent | null> {
    // English content is already in GCS
    if (language === 'en') {
      return null;
    }

    // Check cache first
    const cacheKey = `${scenario.sourceId}-${language}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.timeProvider() - cached.timestamp < this.CACHE_TTL) {
      return cached.content;
    }

    try {
      // Build file path based on scenario source reference
      const folderName = scenario.sourceMetadata?.folderName;
      if (!folderName) {
        return null;
      }

      const baseDir = process.cwd().endsWith('/frontend') 
        ? process.cwd() 
        : path.join(process.cwd(), 'frontend');
      
      const filePath = path.join(
        baseDir,
        'public',
        'assessment_data',
        String(folderName),
        `${folderName}_questions_${language}.yaml`
      );

      // Read and parse YAML
      const content = await fs.readFile(filePath, 'utf-8');
      const yamlData = yaml.load(content) as Record<string, unknown>;

      // Extract translation content based on scenario type
      let translationContent: TranslationContent;
      
      if (scenario.mode === 'assessment') {
        const config = (yamlData.assessment_config || yamlData.config || {}) as Record<string, unknown>;
        translationContent = {
          title: config.title as string,
          description: config.description as string,
          config: {
            totalQuestions: config.total_questions as number,
            timeLimit: config.time_limit_minutes as number,
            passingScore: config.passing_score as number
          }
        };
      } else {
        // Handle other source types if needed
        translationContent = yamlData;
      }

      // Update cache
      this.cache.set(cacheKey, {
        content: translationContent,
        timestamp: this.timeProvider()
      });

      return translationContent;
    } catch {
      // Return null for any error (file not found, parse error, etc.)
      return null;
    }
  }

  /**
   * Translate a scenario by merging translation content
   */
  async translateScenario(
    scenario: IScenario,
    language: string
  ): Promise<IScenario> {
    // Return original for English
    if (language === 'en') {
      return scenario;
    }

    const translation = await this.loadTranslation(scenario, language);
    
    if (!translation) {
      // Return original with translation failed flag
      return {
        ...scenario,
        metadata: {
          ...scenario.metadata,
          translationFailed: true
        }
      };
    }

    // Merge translation with original scenario
    return {
      ...scenario,
      title: typeof translation.title === 'string' 
        ? { [language]: translation.title } 
        : scenario.title,
      description: typeof translation.description === 'string' 
        ? { [language]: translation.description } 
        : scenario.description,
      metadata: {
        ...scenario.metadata,
        translatedFrom: 'yaml',
        ...(translation.config && { config: translation.config })
      }
    };
  }

  /**
   * Translate multiple scenarios in parallel
   */
  async translateMultipleScenarios(
    scenarios: IScenario[],
    language: string
  ): Promise<IScenario[]> {
    return Promise.all(
      scenarios.map(scenario => this.translateScenario(scenario, language))
    );
  }

  /**
   * Clear cache entries older than TTL
   */
  clearExpiredCache(): void {
    const now = this.timeProvider();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Set time provider for testing
   */
  setTimeProvider(provider: () => number): void {
    this.timeProvider = provider;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}