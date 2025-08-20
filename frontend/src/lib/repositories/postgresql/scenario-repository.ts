/**
 * PostgreSQL Scenario Repository
 * 處理所有場景相關的資料庫操作
 * Updated for unified schema v2
 */

import { Pool } from 'pg';
import type { 
  DBScenario, 
  LearningMode, 
  ScenarioStatus, 
  DifficultyLevel,
  TaskType
} from '@/types/database';
import type { IScenario, ITaskTemplate } from '@/types/unified-learning';
import { BaseScenarioRepository } from '@/types/unified-learning';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import { cacheKeys, TTL } from '@/lib/cache/cache-keys';

export class PostgreSQLScenarioRepository extends BaseScenarioRepository<IScenario> {
  constructor(private pool: Pool) {
    super();
  }

  /**
   * Convert database row to IScenario interface
   */
  private toScenario(row: DBScenario): IScenario {
    return {
      id: row.id,
      mode: row.mode,
      status: row.status,
      version: row.version,
      
      // Source tracking
      sourceType: row.source_type,
      sourcePath: row.source_path || undefined,
      sourceId: row.source_id || undefined,
      sourceMetadata: row.source_metadata,
      
      // Basic info
      title: row.title,
      description: row.description,
      objectives: row.objectives,
      
      // Common attributes
      difficulty: row.difficulty,
      estimatedMinutes: row.estimated_minutes,
      prerequisites: row.prerequisites,
      
      // Task templates
      taskTemplates: (row.task_templates as Array<Record<string, unknown>> || []).map((t): ITaskTemplate => ({
        id: t.id as string,
        title: t.title as Record<string, string>,
        type: t.type as TaskType,
        description: t.description as Record<string, string> | undefined,
        ...t
      })),
      taskCount: (row.task_templates as Array<Record<string, unknown>> || []).length,
      
      // Rewards and progression
      xpRewards: row.xp_rewards,
      unlockRequirements: row.unlock_requirements,
      
      // Mode-specific data
      pblData: row.pbl_data,
      discoveryData: row.discovery_data,
      assessmentData: row.assessment_data,
      
      // Resources and AI
      aiModules: row.ai_modules,
      resources: row.resources,
      
      // Timestamps
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at || undefined,
      
      // Extensible metadata
      metadata: row.metadata
    };
  }

  async findById(id: string): Promise<IScenario | null> {
    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);
    const key = cacheKeys.scenarioById(id);
    if (!isTest) {
      const cached = await distributedCacheService.get<IScenario | null>(key);
      if (cached !== null) return cached;
    }

    const query = `
      SELECT * FROM scenarios WHERE id = $1
    `;

    const { rows } = await this.pool.query<DBScenario>(query, [id]);
    const result = rows[0] ? this.toScenario(rows[0]) : null;
    if (result && !isTest) {
      await distributedCacheService.set(key, result, { ttl: TTL.STATIC_24H });
    }
    return result;
  }

  async findBySource(sourceType: string, sourceId?: string): Promise<IScenario[]> {
    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);
    const key = cacheKeys.scenariosBySource(sourceType, sourceId);
    if (!isTest) {
      const cached = await distributedCacheService.get<IScenario[]>(key);
      if (cached !== null) return cached;
    }

    let query = `
      SELECT * FROM scenarios 
      WHERE source_type = $1
    `;
    const params: unknown[] = [sourceType];

    if (sourceId) {
      query += ` AND source_id = $2`;
      params.push(sourceId);
    }

    query += ` ORDER BY created_at DESC`;

    const { rows } = await this.pool.query<DBScenario>(query, params);
    const list = rows.map(row => this.toScenario(row));
    if (!isTest) {
      await distributedCacheService.set(key, list, { ttl: TTL.STATIC_24H });
    }
    return list;
  }

  async create(scenario: Omit<IScenario, 'id'>): Promise<IScenario> {
    const query = `
      INSERT INTO scenarios (
        id, mode, status, version,
        source_type, source_path, source_id, source_metadata,
        title, description, objectives,
        difficulty, estimated_minutes, prerequisites,
        task_templates, xp_rewards, unlock_requirements,
        pbl_data, discovery_data, assessment_data,
        ai_modules, resources, metadata,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const { rows } = await this.pool.query<DBScenario>(query, [
      scenario.mode,
      scenario.status || 'draft',
      scenario.version || '1.0.0',
      scenario.sourceType,
      scenario.sourcePath || null,
      scenario.sourceId || null,
      JSON.stringify(scenario.sourceMetadata || {}),
      JSON.stringify(scenario.title || {}),
      JSON.stringify(scenario.description || {}),
      JSON.stringify(scenario.objectives || []),
      scenario.difficulty,
      scenario.estimatedMinutes,
      Array.isArray(scenario.prerequisites) ? scenario.prerequisites : 
        (typeof scenario.prerequisites === 'string' && (scenario.prerequisites as string).startsWith('[') 
          ? JSON.parse(scenario.prerequisites as string) : []),
      JSON.stringify(scenario.taskTemplates || []),
      JSON.stringify(scenario.xpRewards || {}),
      JSON.stringify(scenario.unlockRequirements || {}),
      JSON.stringify(scenario.pblData || {}),
      JSON.stringify(scenario.discoveryData || {}),
      JSON.stringify(scenario.assessmentData || {}),
      JSON.stringify(scenario.aiModules || {}),
      JSON.stringify(scenario.resources || []),
      JSON.stringify(scenario.metadata || {})
    ]);

    const created = this.toScenario(rows[0]);
    // Invalidate related caches
    await distributedCacheService.delete(cacheKeys.scenariosBySource(created.sourceType, created.sourceId));
    return created;
  }

  async update(id: string, updates: Partial<IScenario>): Promise<IScenario> {
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    // Status update
    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(updates.status);
      
      // Set published_at when scenario becomes active
      if (updates.status === 'active') {
        updateFields.push(`published_at = COALESCE(published_at, CURRENT_TIMESTAMP)`);
      }
    }

    // Source tracking updates
    if (updates.sourceType !== undefined) {
      updateFields.push(`source_type = $${paramCount++}`);
      values.push(updates.sourceType);
    }
    if (updates.sourcePath !== undefined) {
      updateFields.push(`source_path = $${paramCount++}`);
      values.push(updates.sourcePath);
    }
    if (updates.sourceId !== undefined) {
      updateFields.push(`source_id = $${paramCount++}`);
      values.push(updates.sourceId);
    }
    if (updates.sourceMetadata !== undefined) {
      updateFields.push(`source_metadata = $${paramCount++}`);
      values.push(JSON.stringify(updates.sourceMetadata));
    }

    // Basic info updates
    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramCount++}`);
      values.push(JSON.stringify(updates.title));
    }
    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(JSON.stringify(updates.description));
    }
    if (updates.objectives !== undefined) {
      updateFields.push(`objectives = $${paramCount++}`);
      values.push(JSON.stringify(updates.objectives));
    }

    // Common attributes
    if (updates.difficulty !== undefined) {
      updateFields.push(`difficulty = $${paramCount++}`);
      values.push(updates.difficulty);
    }
    if (updates.estimatedMinutes !== undefined) {
      updateFields.push(`estimated_minutes = $${paramCount++}`);
      values.push(updates.estimatedMinutes);
    }
    if (updates.prerequisites !== undefined) {
      updateFields.push(`prerequisites = $${paramCount++}`);
      values.push(Array.isArray(updates.prerequisites) ? updates.prerequisites : []);
    }

    // Task templates
    if (updates.taskTemplates !== undefined) {
      updateFields.push(`task_templates = $${paramCount++}`);
      values.push(JSON.stringify(updates.taskTemplates));
    }

    // Rewards and progression
    if (updates.xpRewards !== undefined) {
      updateFields.push(`xp_rewards = $${paramCount++}`);
      values.push(JSON.stringify(updates.xpRewards));
    }
    if (updates.unlockRequirements !== undefined) {
      updateFields.push(`unlock_requirements = $${paramCount++}`);
      values.push(JSON.stringify(updates.unlockRequirements));
    }

    // Mode-specific data
    if (updates.pblData !== undefined) {
      updateFields.push(`pbl_data = $${paramCount++}`);
      values.push(JSON.stringify(updates.pblData));
    }
    if (updates.discoveryData !== undefined) {
      updateFields.push(`discovery_data = $${paramCount++}`);
      values.push(JSON.stringify(updates.discoveryData));
    }
    if (updates.assessmentData !== undefined) {
      updateFields.push(`assessment_data = $${paramCount++}`);
      values.push(JSON.stringify(updates.assessmentData));
    }

    // Resources and AI
    if (updates.aiModules !== undefined) {
      updateFields.push(`ai_modules = $${paramCount++}`);
      values.push(JSON.stringify(updates.aiModules));
    }
    if (updates.resources !== undefined) {
      updateFields.push(`resources = $${paramCount++}`);
      values.push(JSON.stringify(updates.resources));
    }

    // Metadata
    if (updates.metadata !== undefined) {
      updateFields.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const query = `
      UPDATE scenarios
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const { rows } = await this.pool.query<DBScenario>(query, values);
    if (!rows[0]) {
      throw new Error('Scenario not found');
    }
    const updated = this.toScenario(rows[0]);
    // Invalidate caches
    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);
    if (!isTest) {
      await distributedCacheService.delete(cacheKeys.scenarioById(id));
      await distributedCacheService.delete(cacheKeys.scenariosBySource(updated.sourceType, updated.sourceId));
    }
    return updated;
  }

  // Additional methods specific to PostgreSQL implementation

  async findByMode(mode: LearningMode, includeArchived = false): Promise<IScenario[]> {
    let query = `
      SELECT * FROM scenarios 
      WHERE mode = $1
    `;
    const params: unknown[] = [mode];

    if (!includeArchived) {
      query += ` AND status = 'active'`;
    }

    query += ` ORDER BY created_at DESC`;

    const { rows } = await this.pool.query<DBScenario>(query, params);
    return rows.map(row => this.toScenario(row));
  }

  async findActive(): Promise<IScenario[]> {
    const query = `
      SELECT * FROM scenarios 
      WHERE status = 'active'
      ORDER BY mode, difficulty, created_at DESC
    `;

    const { rows } = await this.pool.query<DBScenario>(query);
    return rows.map(row => this.toScenario(row));
  }

  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM scenarios WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    
    // Clear related caches
    await distributedCacheService.delete(cacheKeys.scenarioById(id));
    
    return (result.rowCount ?? 0) > 0;
  }

  async findByDifficulty(difficulty: DifficultyLevel): Promise<IScenario[]> {
    const query = `
      SELECT * FROM scenarios 
      WHERE difficulty = $1 AND status = 'active'
      ORDER BY mode, created_at DESC
    `;

    const { rows } = await this.pool.query<DBScenario>(query, [difficulty]);
    return rows.map(row => this.toScenario(row));
  }

  async updateStatus(id: string, status: ScenarioStatus): Promise<void> {
    const query = `
      UPDATE scenarios
      SET status = $1,
          ${status === 'active' ? 'published_at = COALESCE(published_at, CURRENT_TIMESTAMP),' : ''}
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.pool.query(query, [status, id]);
  }

  // Get scenarios with usage statistics
  async getScenariosWithStats(): Promise<Array<IScenario & { 
    totalPrograms?: number; 
    completedPrograms?: number;
    uniqueUsers?: number;
    averageScore?: number;
    averageTimeSpent?: number;
  }>> {
    const query = `
      SELECT 
        s.*,
        COUNT(DISTINCT p.id) as "totalPrograms",
        COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as "completedPrograms",
        COUNT(DISTINCT p.user_id) as "uniqueUsers",
        AVG(p.total_score) as "averageScore",
        AVG(p.time_spent_seconds) as "averageTimeSpent"
      FROM scenarios s
      LEFT JOIN programs p ON s.id = p.scenario_id
      GROUP BY s.id
      ORDER BY "totalPrograms" DESC
    `;

    const { rows } = await this.pool.query(query);
    return rows.map(row => ({
      ...this.toScenario(row),
      totalPrograms: Number(row.totalPrograms),
      completedPrograms: Number(row.completedPrograms),
      uniqueUsers: Number(row.uniqueUsers),
      averageScore: row.averageScore ? Number(row.averageScore) : undefined,
      averageTimeSpent: row.averageTimeSpent ? Number(row.averageTimeSpent) : undefined
    }));
  }

  // Get scenario completion rate
  async getCompletionRate(scenarioId: string): Promise<number> {
    const query = `
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / 
        NULLIF(COUNT(*), 0) as completion_rate
      FROM programs
      WHERE scenario_id = $1
    `;

    const { rows } = await this.pool.query(query, [scenarioId]);
    return rows[0]?.completion_rate || 0;
  }

  // Check if user meets prerequisites
  async checkPrerequisites(scenarioId: string, userId: string): Promise<boolean> {
    const query = `
      WITH scenario_prereqs AS (
        SELECT prerequisites
        FROM scenarios
        WHERE id = $1
      ),
      user_completed AS (
        SELECT s.id
        FROM programs p
        JOIN scenarios s ON p.scenario_id = s.id
        WHERE p.user_id = $2 AND p.status = 'completed'
      )
      SELECT 
        CASE 
          WHEN sp.prerequisites = '[]'::jsonb THEN true
          ELSE (
            SELECT bool_and(uc.id IS NOT NULL)
            FROM jsonb_array_elements_text(sp.prerequisites) prereq
            LEFT JOIN user_completed uc ON uc.id = prereq::uuid
          )
        END as meets_prerequisites
      FROM scenario_prereqs sp
    `;

    const { rows } = await this.pool.query(query, [scenarioId, userId]);
    return rows[0]?.meets_prerequisites || false;
  }

  // Domain-related methods

  async addDomainMapping(scenarioId: string, domainId: string, isPrimary: boolean = false): Promise<void> {
    const query = `
      INSERT INTO scenario_domains (scenario_id, domain_id, is_primary)
      VALUES ($1, $2, $3)
      ON CONFLICT (scenario_id, domain_id) 
      DO UPDATE SET is_primary = EXCLUDED.is_primary
    `;

    await this.pool.query(query, [scenarioId, domainId, isPrimary]);
  }

  async findByDomain(domainId: string): Promise<IScenario[]> {
    const query = `
      SELECT DISTINCT s.*
      FROM scenarios s
      JOIN scenario_domains sd ON s.id = sd.scenario_id
      WHERE sd.domain_id = $1 AND s.status = 'active'
      ORDER BY sd.is_primary DESC, s.created_at DESC
    `;

    const { rows } = await this.pool.query<DBScenario>(query, [domainId]);
    return rows.map(row => this.toScenario(row));
  }

  /**
   * Find all scenarios with optional pagination
   */
  async findAll(options?: { limit?: number; offset?: number }): Promise<IScenario[]> {
    let query = 'SELECT * FROM scenarios ORDER BY created_at DESC';
    const values: Array<string | number> = [];

    if (options?.limit) {
      query += ` LIMIT $1`;
      values.push(options.limit);
      if (options.offset) {
        query += ` OFFSET $2`;
        values.push(options.offset);
      }
    }

    const { rows } = await this.pool.query<DBScenario>(query, values);
    return rows.map(row => this.toScenario(row));
  }

  /**
   * Find scenario by source path
   */
  async findBySourcePath(sourcePath: string): Promise<IScenario | null> {
    const query = 'SELECT * FROM scenarios WHERE source_path = $1 LIMIT 1';
    const { rows } = await this.pool.query<DBScenario>(query, [sourcePath]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return this.toScenario(rows[0]);
  }
}