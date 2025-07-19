/**
 * PostgreSQL Scenario Repository
 * 處理所有場景相關的資料庫操作
 */

import { Pool } from 'pg';
import {
  IScenarioRepository,
  Scenario,
  CreateScenarioDto,
  UpdateScenarioDto,
  ScenarioType,
  ScenarioStatus
} from '../interfaces';

export class PostgreSQLScenarioRepository implements IScenarioRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<Scenario | null> {
    const query = `
      SELECT 
        id, type, status, version,
        difficulty_level as "difficultyLevel",
        estimated_minutes as "estimatedMinutes",
        prerequisites, xp_rewards as "xpRewards",
        unlock_requirements as "unlockRequirements",
        tasks, ai_modules as "aiModules", resources,
        metadata, created_at as "createdAt",
        updated_at as "updatedAt", published_at as "publishedAt"
      FROM scenarios
      WHERE id = $1
    `;

    const { rows } = await this.pool.query(query, [id]);
    return rows[0] || null;
  }

  async findByType(type: ScenarioType): Promise<Scenario[]> {
    const query = `
      SELECT 
        id, type, status, version,
        difficulty_level as "difficultyLevel",
        estimated_minutes as "estimatedMinutes",
        prerequisites, xp_rewards as "xpRewards",
        unlock_requirements as "unlockRequirements",
        tasks, ai_modules as "aiModules", resources,
        metadata, created_at as "createdAt",
        updated_at as "updatedAt", published_at as "publishedAt"
      FROM scenarios
      WHERE type = $1
      ORDER BY created_at DESC
    `;

    const { rows } = await this.pool.query(query, [type]);
    return rows;
  }

  async findActive(): Promise<Scenario[]> {
    const query = `
      SELECT 
        id, type, status, version,
        difficulty_level as "difficultyLevel",
        estimated_minutes as "estimatedMinutes",
        prerequisites, xp_rewards as "xpRewards",
        unlock_requirements as "unlockRequirements",
        tasks, ai_modules as "aiModules", resources,
        metadata, created_at as "createdAt",
        updated_at as "updatedAt", published_at as "publishedAt"
      FROM scenarios
      WHERE status = 'active'
      ORDER BY type, difficulty_level, created_at DESC
    `;

    const { rows } = await this.pool.query(query);
    return rows;
  }

  async create(data: CreateScenarioDto): Promise<Scenario> {
    const query = `
      INSERT INTO scenarios (
        type, difficulty_level, estimated_minutes,
        prerequisites, xp_rewards, tasks, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, type, status, version,
        difficulty_level as "difficultyLevel",
        estimated_minutes as "estimatedMinutes",
        prerequisites, xp_rewards as "xpRewards",
        unlock_requirements as "unlockRequirements",
        tasks, ai_modules as "aiModules", resources,
        metadata, created_at as "createdAt",
        updated_at as "updatedAt", published_at as "publishedAt"
    `;

    const { rows } = await this.pool.query(query, [
      data.type,
      data.difficultyLevel || 'intermediate',
      data.estimatedMinutes || 30,
      JSON.stringify(data.prerequisites || []),
      JSON.stringify(data.xpRewards || { completion: 100 }),
      JSON.stringify(data.tasks || []),
      JSON.stringify(data.metadata || {})
    ]);

    return rows[0];
  }

  async update(id: string, data: UpdateScenarioDto): Promise<Scenario> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
      
      // Set published_at when scenario becomes active
      if (data.status === 'active') {
        updates.push(`published_at = COALESCE(published_at, CURRENT_TIMESTAMP)`);
      }
    }

    if (data.difficultyLevel !== undefined) {
      updates.push(`difficulty_level = $${paramCount++}`);
      values.push(data.difficultyLevel);
    }

    if (data.estimatedMinutes !== undefined) {
      updates.push(`estimated_minutes = $${paramCount++}`);
      values.push(data.estimatedMinutes);
    }

    if (data.prerequisites !== undefined) {
      updates.push(`prerequisites = $${paramCount++}`);
      values.push(JSON.stringify(data.prerequisites));
    }

    if (data.xpRewards !== undefined) {
      updates.push(`xp_rewards = $${paramCount++}`);
      values.push(JSON.stringify(data.xpRewards));
    }

    if (data.tasks !== undefined) {
      updates.push(`tasks = $${paramCount++}`);
      values.push(JSON.stringify(data.tasks));
    }

    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(data.metadata));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE scenarios
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id, type, status, version,
        difficulty_level as "difficultyLevel",
        estimated_minutes as "estimatedMinutes",
        prerequisites, xp_rewards as "xpRewards",
        unlock_requirements as "unlockRequirements",
        tasks, ai_modules as "aiModules", resources,
        metadata, created_at as "createdAt",
        updated_at as "updatedAt", published_at as "publishedAt"
    `;

    const { rows } = await this.pool.query(query, values);
    
    if (!rows[0]) {
      throw new Error('Scenario not found');
    }

    return rows[0];
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
  async getScenariosWithStats(): Promise<any[]> {
    const query = `
      SELECT 
        s.id, s.type, s.status, s.version,
        s.difficulty_level as "difficultyLevel",
        s.estimated_minutes as "estimatedMinutes",
        s.created_at as "createdAt",
        s.published_at as "publishedAt",
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
    return rows;
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

  // Get scenarios by difficulty
  async findByDifficulty(difficulty: string): Promise<Scenario[]> {
    const query = `
      SELECT 
        id, type, status, version,
        difficulty_level as "difficultyLevel",
        estimated_minutes as "estimatedMinutes",
        prerequisites, xp_rewards as "xpRewards",
        unlock_requirements as "unlockRequirements",
        tasks, ai_modules as "aiModules", resources,
        metadata, created_at as "createdAt",
        updated_at as "updatedAt", published_at as "publishedAt"
      FROM scenarios
      WHERE difficulty_level = $1 AND status = 'active'
      ORDER BY type, created_at DESC
    `;

    const { rows } = await this.pool.query(query, [difficulty]);
    return rows;
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

  // Add domain mapping
  async addDomainMapping(scenarioId: string, domain: string, isPrimary: boolean = false): Promise<void> {
    const query = `
      INSERT INTO scenario_domains (scenario_id, domain, is_primary)
      VALUES ($1, $2, $3)
      ON CONFLICT (scenario_id, domain) 
      DO UPDATE SET is_primary = EXCLUDED.is_primary
    `;

    await this.pool.query(query, [scenarioId, domain, isPrimary]);
  }

  // Get scenarios by domain
  async findByDomain(domain: string): Promise<Scenario[]> {
    const query = `
      SELECT DISTINCT
        s.id, s.type, s.status, s.version,
        s.difficulty_level as "difficultyLevel",
        s.estimated_minutes as "estimatedMinutes",
        s.prerequisites, s.xp_rewards as "xpRewards",
        s.unlock_requirements as "unlockRequirements",
        s.tasks, s.ai_modules as "aiModules", s.resources,
        s.metadata, s.created_at as "createdAt",
        s.updated_at as "updatedAt", s.published_at as "publishedAt"
      FROM scenarios s
      JOIN scenario_domains sd ON s.id = sd.scenario_id
      WHERE sd.domain = $1 AND s.status = 'active'
      ORDER BY sd.is_primary DESC, s.created_at DESC
    `;

    const { rows } = await this.pool.query(query, [domain]);
    return rows;
  }
}