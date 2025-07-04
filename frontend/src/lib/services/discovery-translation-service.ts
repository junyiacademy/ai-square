/**
 * Discovery Translation Service - Using Vertex AI for translations
 * Phase 1: LocalStorage cache with Vertex AI translation
 */

import { SavedPathData, DynamicTask } from './user-data-service';

export interface TranslationCache {
  paths: Record<string, Record<string, TranslatedContent>>;
  tasks: Record<string, Record<string, TranslatedContent>>;
  usage: Record<string, Record<string, number>>;
}

export interface TranslatedContent {
  version: number;
  translatedAt: string;
  content: any;
}

export interface TranslationRequest {
  content: any;
  sourceLocale: string;
  targetLocale: string;
  fields?: string[];
}

export class DiscoveryTranslationService {
  private cacheKey = 'discovery_translation_cache';
  private memoryCache = new Map<string, any>();

  async translatePath(
    path: SavedPathData,
    targetLocale: string
  ): Promise<SavedPathData> {
    // 1. If source language matches target, return as-is
    if (path.sourceLanguage === targetLocale) {
      return path;
    }

    // 2. Check memory cache first
    const memoryCacheKey = `path:${path.id}:${targetLocale}`;
    if (this.memoryCache.has(memoryCacheKey)) {
      return this.memoryCache.get(memoryCacheKey);
    }

    // 3. Check localStorage cache
    const cache = this.loadCache();
    const cached = cache.paths?.[path.id]?.[targetLocale];
    
    if (cached && cached.version === (path.version || 1)) {
      const translatedPath = {
        ...path,
        ...cached.content
      };
      this.memoryCache.set(memoryCacheKey, translatedPath);
      return translatedPath;
    }

    // 4. Translate using Vertex AI
    const translatedContent = await this.translateWithVertexAI({
      content: {
        title: path.pathData?.title,
        subtitle: path.pathData?.subtitle,
        description: path.pathData?.description,
        skills: path.pathData?.skills,
        aiAssistants: path.pathData?.aiAssistants
      },
      sourceLocale: path.sourceLanguage || 'zh-TW',
      targetLocale,
      fields: ['title', 'subtitle', 'description', 'skills', 'aiAssistants']
    });

    // 5. Update cache
    this.updateCache('paths', path.id, targetLocale, {
      version: path.version || 1,
      translatedAt: new Date().toISOString(),
      content: translatedContent
    });

    // 6. Track usage
    this.trackUsage(targetLocale);

    // 7. Merge translated content
    const translatedPath = {
      ...path,
      pathData: {
        ...path.pathData,
        ...translatedContent
      }
    };

    this.memoryCache.set(memoryCacheKey, translatedPath);
    return translatedPath;
  }

  async translateTask(
    task: DynamicTask,
    targetLocale: string
  ): Promise<DynamicTask> {
    // 1. If source language matches target, return as-is
    if (task.sourceLanguage === targetLocale) {
      return task;
    }

    // 2. Check memory cache
    const memoryCacheKey = `task:${task.id}:${targetLocale}`;
    if (this.memoryCache.has(memoryCacheKey)) {
      return this.memoryCache.get(memoryCacheKey);
    }

    // 3. Check localStorage cache
    const cache = this.loadCache();
    const cached = cache.tasks?.[task.id]?.[targetLocale];
    
    if (cached) {
      const translatedTask = {
        ...task,
        ...cached.content
      };
      this.memoryCache.set(memoryCacheKey, translatedTask);
      return translatedTask;
    }

    // 4. Translate using Vertex AI
    const translatedContent = await this.translateWithVertexAI({
      content: {
        title: task.title,
        description: task.description,
        currentChallenge: task.storyContext?.currentChallenge
      },
      sourceLocale: task.sourceLanguage || 'zh-TW',
      targetLocale,
      fields: ['title', 'description', 'currentChallenge']
    });

    // 5. Update cache
    this.updateCache('tasks', task.id, targetLocale, {
      version: 1,
      translatedAt: new Date().toISOString(),
      content: translatedContent
    });

    // 6. Track usage
    this.trackUsage(targetLocale);

    // 7. Merge translated content
    const translatedTask = {
      ...task,
      title: translatedContent.title || task.title,
      description: translatedContent.description || task.description,
      storyContext: task.storyContext ? {
        ...task.storyContext,
        currentChallenge: translatedContent.currentChallenge || task.storyContext.currentChallenge
      } : undefined
    };

    this.memoryCache.set(memoryCacheKey, translatedTask);
    return translatedTask;
  }

  private async translateWithVertexAI(request: TranslationRequest): Promise<any> {
    try {
      const response = await fetch('/api/discovery/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: request.content,
          sourceLocale: request.sourceLocale,
          targetLocale: request.targetLocale,
          fields: request.fields
        })
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.translatedContent;
    } catch (error) {
      console.error('Translation error:', error);
      // Return original content if translation fails
      return request.content;
    }
  }

  private loadCache(): TranslationCache {
    const stored = localStorage.getItem(this.cacheKey);
    return stored ? JSON.parse(stored) : { paths: {}, tasks: {}, usage: {} };
  }

  private updateCache(
    type: 'paths' | 'tasks',
    id: string,
    locale: string,
    translation: TranslatedContent
  ): void {
    const cache = this.loadCache();
    
    if (!cache[type][id]) {
      cache[type][id] = {};
    }
    cache[type][id][locale] = translation;
    
    // Clean up old cache entries (keep only last 100 items per type)
    const entries = Object.entries(cache[type]);
    if (entries.length > 100) {
      const sortedEntries = entries.sort((a, b) => {
        const aTime = Object.values(a[1])[0]?.translatedAt || '';
        const bTime = Object.values(b[1])[0]?.translatedAt || '';
        return bTime.localeCompare(aTime);
      });
      cache[type] = Object.fromEntries(sortedEntries.slice(0, 100));
    }
    
    localStorage.setItem(this.cacheKey, JSON.stringify(cache));
  }

  private trackUsage(locale: string): void {
    const cache = this.loadCache();
    const today = new Date().toISOString().split('T')[0];
    
    if (!cache.usage[today]) {
      cache.usage[today] = {};
    }
    
    cache.usage[today][locale] = (cache.usage[today][locale] || 0) + 1;
    
    // Clean up old usage data (keep only last 7 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    
    Object.keys(cache.usage).forEach(date => {
      if (date < cutoffDateStr) {
        delete cache.usage[date];
      }
    });
    
    localStorage.setItem(this.cacheKey, JSON.stringify(cache));
  }

  // Batch translation for multiple items
  async translatePaths(
    paths: SavedPathData[],
    targetLocale: string
  ): Promise<SavedPathData[]> {
    // Translate in parallel with concurrency limit
    const batchSize = 3;
    const results: SavedPathData[] = [];
    
    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      const translatedBatch = await Promise.all(
        batch.map(path => this.translatePath(path, targetLocale))
      );
      results.push(...translatedBatch);
    }
    
    return results;
  }

  // Get translation statistics
  getTranslationStats(): {
    totalTranslations: number;
    languageBreakdown: Record<string, number>;
    cacheSize: number;
  } {
    const cache = this.loadCache();
    const languageBreakdown: Record<string, number> = {};
    let totalTranslations = 0;
    
    Object.values(cache.usage).forEach(dayUsage => {
      Object.entries(dayUsage).forEach(([locale, count]) => {
        languageBreakdown[locale] = (languageBreakdown[locale] || 0) + count;
        totalTranslations += count;
      });
    });
    
    const cacheSize = new Blob([JSON.stringify(cache)]).size;
    
    return {
      totalTranslations,
      languageBreakdown,
      cacheSize
    };
  }

  // Clear translation cache
  clearCache(): void {
    localStorage.removeItem(this.cacheKey);
    this.memoryCache.clear();
  }

  // Preload translations for popular content
  async preloadTranslations(
    paths: SavedPathData[],
    targetLocale: string,
    limit: number = 5
  ): Promise<void> {
    const pathsToTranslate = paths
      .filter(p => p.sourceLanguage !== targetLocale)
      .slice(0, limit);
    
    await this.translatePaths(pathsToTranslate, targetLocale);
  }
}