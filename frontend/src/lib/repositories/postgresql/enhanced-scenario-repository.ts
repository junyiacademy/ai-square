/**
 * Enhanced Scenario Repository Implementation
 * Extends the base repository with advanced scenario-specific operations
 */

import { Pool } from 'pg';
import { EnhancedBaseRepository } from '../base/enhanced-base-repository';
import type {
  IScenario,
  ITaskTemplate
} from '@/types/unified-learning';
import type {
  LearningMode as DBLearningMode,
  ScenarioStatus as DBScenarioStatus,
  SourceType as DBSourceType,
  DifficultyLevel
} from '@/types/database';
import type {
  IExtendedScenarioRepository
} from '../interfaces/extended';
import { cacheInvalidationService } from '@/lib/cache/cache-invalidation-service';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import { TTL } from '@/lib/cache/cache-keys';

export class EnhancedScenarioRepository
  extends EnhancedBaseRepository<IScenario>
  implements IExtendedScenarioRepository {

  constructor(pool: Pool) {
    super(pool, 'scenarios', 'scenario');
  }

  // ========================================
  // Abstract method implementations
  // ========================================

  protected toEntity(row: Record<string, unknown>): IScenario {
    return {
      id: row.id as string,
      mode: row.mode as DBLearningMode,
      sourceType: row.source_type as DBSourceType,
      sourceId: row.source_id as string | undefined,
      sourcePath: row.source_path as string | undefined,
      sourceMetadata: (row.source_metadata as Record<string, unknown>) || {},
      status: row.status as DBScenarioStatus,
      version: '1.0.0', // default version
      title: row.title as Record<string, string>,
      description: row.description as Record<string, string>,
      objectives: (row.objectives as string[]) || [],
      taskTemplates: ((row.task_templates as Array<Record<string, unknown>>) || []).map(t => ({
        id: t.id as string,
        title: t.title as Record<string, string>,
        type: t.type as string,
        ...t
      } as ITaskTemplate)),
      taskCount: (row.task_templates as Array<unknown>)?.length || 0,
      estimatedMinutes: (row.estimated_time as number) || 60,
      difficulty: ((row.difficulty as string) || 'medium') as DifficultyLevel,
      prerequisites: (row.prerequisites as string[]) || [],
      metadata: (row.metadata as Record<string, unknown>) || {},
      resources: (row.resources as Array<Record<string, unknown>>) || [],
      aiModules: (row.ai_modules as Record<string, unknown>) || {},
      xpRewards: {},
      unlockRequirements: {},
      pblData: (row.pbl_data as Record<string, unknown>) || {},
      discoveryData: (row.discovery_data as Record<string, unknown>) || {},
      assessmentData: (row.assessment_data as Record<string, unknown>) || {},
      createdAt: (row.created_at as Date)?.toISOString() || new Date().toISOString(),
      updatedAt: (row.updated_at as Date)?.toISOString() || new Date().toISOString()
    };
  }

  protected toDatabase(entity: Partial<IScenario>): Record<string, unknown> {
    const dbRecord: Record<string, unknown> = {};

    if (entity.id !== undefined) dbRecord.id = entity.id;
    if (entity.mode !== undefined) dbRecord.mode = entity.mode as DBLearningMode;
    if (entity.sourceType !== undefined) dbRecord.source_type = entity.sourceType as DBSourceType;
    if (entity.sourceId !== undefined) dbRecord.source_id = entity.sourceId;
    if (entity.sourcePath !== undefined) dbRecord.source_path = entity.sourcePath;
    if (entity.sourceMetadata !== undefined) dbRecord.source_metadata = JSON.stringify(entity.sourceMetadata);
    if (entity.status !== undefined) dbRecord.status = entity.status as DBScenarioStatus;
    if (entity.title !== undefined) dbRecord.title = JSON.stringify(entity.title);
    if (entity.description !== undefined) dbRecord.description = JSON.stringify(entity.description);
    if (entity.objectives !== undefined) dbRecord.objectives = JSON.stringify(entity.objectives);
    if (entity.taskTemplates !== undefined) dbRecord.task_templates = JSON.stringify(entity.taskTemplates);
    if (entity.estimatedMinutes !== undefined) dbRecord.estimated_time = entity.estimatedMinutes;
    if (entity.difficulty !== undefined) dbRecord.difficulty = entity.difficulty;
    if (entity.prerequisites !== undefined) dbRecord.prerequisites = JSON.stringify(entity.prerequisites);
    if (entity.metadata !== undefined) dbRecord.metadata = JSON.stringify(entity.metadata);
    if (entity.resources !== undefined) dbRecord.resources = JSON.stringify(entity.resources);
    if (entity.aiModules !== undefined) dbRecord.ai_modules = JSON.stringify(entity.aiModules);
    // Note: rubric is not in IScenario interface
    if (entity.pblData !== undefined) dbRecord.pbl_data = JSON.stringify(entity.pblData);
    if (entity.discoveryData !== undefined) dbRecord.discovery_data = JSON.stringify(entity.discoveryData);
    if (entity.assessmentData !== undefined) dbRecord.assessment_data = JSON.stringify(entity.assessmentData);

    return dbRecord;
  }

  // ========================================
  // Extended Scenario Operations
  // ========================================

  async findWithStats(mode?: DBLearningMode): Promise<Array<IScenario & {
    programCount: number;
    activePrograms: number;
    completedPrograms: number;
  }>> {
    let query = `
      SELECT
        s.*,
        COUNT(DISTINCT p.id) as program_count,
        COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_programs,
        COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_programs
      FROM scenarios s
      LEFT JOIN programs p ON s.id = p.scenario_id
    `;

    const values: unknown[] = [];
    if (mode) {
      query += ' WHERE s.mode = $1';
      values.push(mode);
    }

    query += ' GROUP BY s.id ORDER BY s.created_at DESC';

    const { rows } = await this.getClient().query(query, values);

    return rows.map(row => ({
      ...this.toEntity(row),
      programCount: parseInt(row.program_count, 10),
      activePrograms: parseInt(row.active_programs, 10),
      completedPrograms: parseInt(row.completed_programs, 10)
    }));
  }

  async clone(id: string, options?: {
    title?: Record<string, string>;
    status?: string;
  }): Promise<IScenario> {
    return this.withTransaction(async () => {
      // Get original scenario
      const originalQuery = 'SELECT * FROM scenarios WHERE id = $1';
      const { rows: originalRows } = await this.getClient().query(originalQuery, [id]);

      if (originalRows.length === 0) {
        throw new Error(`Scenario ${id} not found`);
      }

      const original = this.toEntity(originalRows[0]);

      // Create clone
      const clone: Partial<IScenario> = {
        ...original,
        id: undefined, // Let DB generate new ID
        title: options?.title || {
          en: `${(original.title as Record<string, string>).en} (Copy)`
        },
        status: (options?.status || 'draft') as DBScenarioStatus,
        sourceMetadata: {
          ...(original.sourceMetadata || {}),
          clonedFrom: id,
          clonedAt: new Date().toISOString()
        }
      };

      // Insert clone
      const dbData = this.toDatabase(clone);
      delete dbData.id; // Ensure new ID is generated
      delete dbData.created_at;
      delete dbData.updated_at;

      const columns = Object.keys(dbData);
      const values = Object.values(dbData);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

      const insertQuery = `
        INSERT INTO scenarios (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

      const { rows } = await this.getClient().query(insertQuery, values);
      const cloned = this.toEntity(rows[0]);

      // Invalidate cache
      await cacheInvalidationService.invalidateScenario(cloned.id, cloned.mode);

      return cloned;
    });
  }

  async findOrphaned(): Promise<IScenario[]> {
    const query = `
      SELECT s.* FROM scenarios s
      LEFT JOIN programs p ON s.id = p.scenario_id
      WHERE p.id IS NULL
      ORDER BY s.created_at DESC
    `;

    const { rows } = await this.getClient().query(query);
    return rows.map(row => this.toEntity(row));
  }

  async deduplicateBySourceId(): Promise<{
    removed: number;
    kept: string[];
  }> {
    return this.withTransaction(async () => {
      // Find duplicates
      const findDuplicatesQuery = `
        WITH duplicates AS (
          SELECT
            id,
            source_id,
            ROW_NUMBER() OVER (
              PARTITION BY mode, source_id
              ORDER BY created_at DESC
            ) as rn
          FROM scenarios
          WHERE source_id IS NOT NULL
        )
        SELECT id, source_id FROM duplicates WHERE rn > 1
      `;

      const { rows: duplicates } = await this.getClient().query(findDuplicatesQuery);

      if (duplicates.length === 0) {
        return { removed: 0, kept: [] };
      }

      // Delete duplicates
      const idsToDelete = duplicates.map(d => d.id);
      const deleteResult = await this.deleteBulk(idsToDelete);

      // Get kept scenarios
      const keptQuery = `
        SELECT DISTINCT source_id FROM scenarios
        WHERE source_id IS NOT NULL
      `;
      const { rows: keptRows } = await this.getClient().query(keptQuery);

      return {
        removed: deleteResult.deleted,
        kept: keptRows.map(r => r.source_id)
      };
    });
  }

  // ========================================
  // Cascade Operations
  // ========================================

  async deleteWithCascade(id: string): Promise<{
    deleted: {
      scenario?: boolean;
      programs?: number;
      tasks?: number;
      evaluations?: number;
    };
  }> {
    // With CASCADE DELETE constraints, we just need to delete the scenario
    // The database will handle the cascade
    const query = 'DELETE FROM scenarios WHERE id = $1';
    const result = await this.getClient().query(query, [id]);

    // Invalidate all related caches
    await cacheInvalidationService.invalidateScenario(id);

    return {
      deleted: {
        scenario: (result.rowCount ?? 0) > 0,
        programs: -1, // Cascade handled by DB
        tasks: -1,    // Cascade handled by DB
        evaluations: -1 // Cascade handled by DB
      }
    };
  }

  async archive(id: string): Promise<boolean> {
    const query = `
      UPDATE scenarios
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;

    const { rows } = await this.getClient().query(query, [id]);

    if (rows.length > 0) {
      await cacheInvalidationService.invalidateScenario(id);
      return true;
    }

    return false;
  }

  async restore(id: string): Promise<boolean> {
    const query = `
      UPDATE scenarios
      SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'archived'
      RETURNING id
    `;

    const { rows } = await this.getClient().query(query, [id]);

    if (rows.length > 0) {
      await cacheInvalidationService.invalidateScenario(id);
      return true;
    }

    return false;
  }

  // ========================================
  // Status Operations
  // ========================================

  async updateStatusBulk(ids: string[], status: string): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
    const query = `
      UPDATE scenarios
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `;

    const result = await this.getClient().query(query, [status, ...ids]);

    // Invalidate cache for all updated scenarios
    for (const id of ids) {
      await cacheInvalidationService.invalidateScenario(id);
    }

    return result.rowCount ?? 0;
  }

  async findByStatus(status: string): Promise<IScenario[]> {
    const cacheKey = `scenarios:status:${status}`;

    // Try cache first
    const cached = await distributedCacheService.get<IScenario[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const query = 'SELECT * FROM scenarios WHERE status = $1 ORDER BY created_at DESC';
    const { rows } = await this.getClient().query(query, [status]);
    const scenarios = rows.map(row => this.toEntity(row));

    // Cache the result
    await distributedCacheService.set(cacheKey, scenarios, { ttl: TTL.SHORT });

    return scenarios;
  }

  async transitionStatus(id: string, fromStatus: string, toStatus: string): Promise<boolean> {
    const query = `
      UPDATE scenarios
      SET status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = $3
      RETURNING id
    `;

    const { rows } = await this.getClient().query(query, [id, toStatus, fromStatus]);

    if (rows.length > 0) {
      await cacheInvalidationService.invalidateScenario(id);
      return true;
    }

    return false;
  }
}
