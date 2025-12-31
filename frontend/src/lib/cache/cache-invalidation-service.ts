/**
 * Cache Invalidation Service
 * Manages cache invalidation strategies and patterns
 */

import { distributedCacheService } from "./distributed-cache-service";
import { cacheKeys } from "./cache-keys";

export interface InvalidationRule {
  pattern: string | RegExp;
  cascade?: string[];
  ttl?: number;
}

export class CacheInvalidationService {
  private static instance: CacheInvalidationService;
  private invalidationRules: Map<string, InvalidationRule> = new Map();
  private invalidationQueue: Set<string> = new Set();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 100; // ms

  private constructor() {
    this.setupInvalidationRules();
  }

  static getInstance(): CacheInvalidationService {
    if (!CacheInvalidationService.instance) {
      CacheInvalidationService.instance = new CacheInvalidationService();
    }
    return CacheInvalidationService.instance;
  }

  /**
   * Setup invalidation rules for different entity types
   */
  private setupInvalidationRules() {
    // Scenario invalidation rules
    this.invalidationRules.set("scenario", {
      pattern: "scenario:*",
      cascade: ["scenarios:list:*", "scenarios:by-mode:*", "scenario:index:*"],
    });

    // Program invalidation rules
    this.invalidationRules.set("program", {
      pattern: "program:*",
      cascade: ["programs:user:*", "programs:scenario:*", "user:progress:*"],
    });

    // Task invalidation rules
    this.invalidationRules.set("task", {
      pattern: "task:*",
      cascade: ["tasks:program:*", "program:progress:*"],
    });

    // Evaluation invalidation rules
    this.invalidationRules.set("evaluation", {
      pattern: "evaluation:*",
      cascade: ["evaluations:user:*", "evaluations:task:*", "user:stats:*"],
    });

    // User invalidation rules
    this.invalidationRules.set("user", {
      pattern: "user:*",
      cascade: ["user:programs:*", "user:achievements:*", "user:progress:*"],
    });
  }

  /**
   * Invalidate cache for an entity
   */
  async invalidate(entityType: string, entityId?: string): Promise<void> {
    const rule = this.invalidationRules.get(entityType);
    if (!rule) {
      console.warn(`No invalidation rule found for entity type: ${entityType}`);
      return;
    }

    // Build specific cache key
    const baseKey = entityId ? `${entityType}:${entityId}` : entityType;

    // Add to invalidation queue
    this.invalidationQueue.add(baseKey);

    // Add cascade invalidations
    if (rule.cascade) {
      for (const cascadePattern of rule.cascade) {
        if (entityId && cascadePattern.includes("*")) {
          const cascadeKey = cascadePattern.replace("*", entityId);
          this.invalidationQueue.add(cascadeKey);
        } else {
          this.invalidationQueue.add(cascadePattern);
        }
      }
    }

    // Schedule batch invalidation
    this.scheduleBatchInvalidation();
  }

  /**
   * Schedule batch invalidation to reduce Redis calls
   */
  private scheduleBatchInvalidation() {
    if (this.batchTimer) {
      return; // Already scheduled
    }

    this.batchTimer = setTimeout(async () => {
      await this.processBatchInvalidation();
      this.batchTimer = null;
    }, this.BATCH_DELAY);
  }

  /**
   * Process batch invalidation
   */
  private async processBatchInvalidation() {
    if (this.invalidationQueue.size === 0) {
      return;
    }

    const keysToInvalidate = Array.from(this.invalidationQueue);
    this.invalidationQueue.clear();

    console.log(`[Cache] Invalidating ${keysToInvalidate.length} cache keys`);

    // Process invalidations in parallel
    const promises = keysToInvalidate.map(async (key) => {
      try {
        if (key.includes("*")) {
          // Pattern-based deletion
          await this.deleteByPattern(key);
        } else {
          // Direct deletion
          await distributedCacheService.delete(key);
        }
      } catch (error) {
        console.error(`[Cache] Failed to invalidate key ${key}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Delete cache entries by pattern
   */
  private async deleteByPattern(pattern: string): Promise<void> {
    // Convert simple wildcard to regex
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");

    // Note: This is a simplified implementation
    // In production, you'd use Redis SCAN command
    const keys = await distributedCacheService.getAllKeys();
    const keysToDelete = keys.filter((key) => regex.test(key));

    for (const key of keysToDelete) {
      await distributedCacheService.delete(key);
    }
  }

  /**
   * Invalidate all caches for a scenario update
   */
  async invalidateScenario(scenarioId: string, mode?: string): Promise<void> {
    await this.invalidate("scenario", scenarioId);

    // Also invalidate mode-specific caches
    if (mode) {
      await distributedCacheService.delete(cacheKeys.scenariosByMode(mode));
      await distributedCacheService.delete(`${mode}:scenarios:*`);
    }
  }

  /**
   * Invalidate all caches for a program update
   */
  async invalidateProgram(
    programId: string,
    userId?: string,
    scenarioId?: string,
  ): Promise<void> {
    await this.invalidate("program", programId);

    if (userId) {
      await distributedCacheService.delete(cacheKeys.userPrograms(userId));
    }

    if (scenarioId) {
      await distributedCacheService.delete(`programs:scenario:${scenarioId}`);
    }
  }

  /**
   * Invalidate all caches for a task update
   */
  async invalidateTask(taskId: string, programId?: string): Promise<void> {
    await this.invalidate("task", taskId);

    if (programId) {
      await distributedCacheService.delete(`tasks:program:${programId}`);
    }
  }

  /**
   * Smart cache warming based on access patterns
   */
  async warmCache(entityType: string, popularIds: string[]): Promise<void> {
    console.log(
      `[Cache] Warming cache for ${entityType} with ${popularIds.length} items`,
    );

    // This would be implemented based on actual repository methods
    // Example implementation would pre-load frequently accessed data
  }

  /**
   * Get cache invalidation statistics
   */
  getStats(): {
    rulesCount: number;
    queueSize: number;
    rules: string[];
  } {
    return {
      rulesCount: this.invalidationRules.size,
      queueSize: this.invalidationQueue.size,
      rules: Array.from(this.invalidationRules.keys()),
    };
  }

  /**
   * Clear all caches (use with caution)
   */
  async clearAll(): Promise<void> {
    console.warn("[Cache] Clearing all caches");
    await distributedCacheService.flushAll();
  }
}

// Export singleton instance
export const cacheInvalidationService = CacheInvalidationService.getInstance();
