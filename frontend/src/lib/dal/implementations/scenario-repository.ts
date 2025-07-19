/**
 * Scenario Repository Implementation
 * Handles all database operations for learning scenarios
 */

import { BaseRepositoryImpl } from './base-repository';
import {
  Scenario,
  ScenarioRepository,
  DatabaseConnection,
  QueryOptions,
  QueryResult,
  MultilingualContent,
} from '../interfaces';

export class ScenarioRepositoryImpl extends BaseRepositoryImpl<Scenario> implements ScenarioRepository {
  constructor(db: DatabaseConnection) {
    super(db, 'scenarios');
  }

  /**
   * Find scenarios by type (pbl, assessment, discovery)
   */
  async findByType(type: Scenario['type'], options?: QueryOptions): Promise<QueryResult<Scenario>> {
    const baseOptions: QueryOptions = {
      ...options,
      filters: {
        ...options?.filters,
        type,
      },
    };

    return this.findAll(baseOptions);
  }

  /**
   * Find all active scenarios
   */
  async findActive(options?: QueryOptions): Promise<QueryResult<Scenario>> {
    const baseOptions: QueryOptions = {
      ...options,
      filters: {
        ...options?.filters,
        status: 'active',
      },
      sort: options?.sort || { field: 'created_at', direction: 'desc' },
    };

    return this.findAll(baseOptions);
  }

  /**
   * Update a specific translation field
   */
  async updateTranslation(
    id: string,
    field: string,
    language: string,
    content: string
  ): Promise<Scenario> {
    // Use JSONB set operation to update nested translation
    const query = `
      UPDATE scenarios 
      SET 
        ${field} = jsonb_set(
          COALESCE(${field}, '{}'::jsonb),
          '{${language}}',
          to_jsonb($3::text)
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.queryOne<Scenario>(query, [id, field, content]);
    if (!result) {
      throw new Error(`Scenario with id ${id} not found`);
    }

    return result;
  }

  /**
   * Find scenarios by difficulty level
   */
  async findByDifficulty(
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    options?: QueryOptions
  ): Promise<QueryResult<Scenario>> {
    const baseOptions: QueryOptions = {
      ...options,
      filters: {
        ...options?.filters,
        difficulty_level: difficulty,
        status: 'active',
      },
    };

    return this.findAll(baseOptions);
  }

  /**
   * Find scenarios by KSA mapping
   */
  async findByKsaCode(ksaCode: string): Promise<Scenario[]> {
    const query = `
      SELECT s.* 
      FROM scenarios s
      JOIN scenario_ksa_mappings skm ON s.id = skm.scenario_id
      WHERE skm.ksa_code = $1 AND s.status = 'active'
      ORDER BY skm.is_primary DESC, s.created_at DESC
    `;

    return this.db.query<Scenario>(query, [ksaCode]);
  }

  /**
   * Find scenarios by target domain
   */
  async findByDomain(domain: string): Promise<Scenario[]> {
    const query = `
      SELECT * 
      FROM scenarios 
      WHERE $1 = ANY(target_domains) AND status = 'active'
      ORDER BY created_at DESC
    `;

    return this.db.query<Scenario>(query, [domain]);
  }

  /**
   * Get scenario with full details including KSA mappings
   */
  async getWithKsaMappings(id: string): Promise<Scenario & { ksa_details: any[] }> {
    const scenarioQuery = `SELECT * FROM scenarios WHERE id = $1`;
    const scenario = await this.db.queryOne<Scenario>(scenarioQuery, [id]);
    
    if (!scenario) {
      throw new Error(`Scenario with id ${id} not found`);
    }

    const ksaQuery = `
      SELECT kc.*, skm.is_primary, skm.weight
      FROM scenario_ksa_mappings skm
      JOIN ksa_competencies kc ON skm.ksa_code = kc.code
      WHERE skm.scenario_id = $1
      ORDER BY skm.is_primary DESC, kc.type, kc.code
    `;

    const ksaDetails = await this.db.query(ksaQuery, [id]);

    return {
      ...scenario,
      ksa_details: ksaDetails,
    };
  }

  /**
   * Search scenarios by title or description
   */
  async search(searchTerm: string, language: string = 'en'): Promise<Scenario[]> {
    const query = `
      SELECT * 
      FROM scenarios 
      WHERE 
        status = 'active' AND (
          title->>'${language}' ILIKE $1 OR
          description->>'${language}' ILIKE $1 OR
          title->>'en' ILIKE $1 OR
          description->>'en' ILIKE $1
        )
      ORDER BY 
        CASE 
          WHEN title->>'${language}' ILIKE $1 THEN 1
          WHEN description->>'${language}' ILIKE $1 THEN 2
          ELSE 3
        END,
        created_at DESC
      LIMIT 20
    `;

    return this.db.query<Scenario>(query, [`%${searchTerm}%`]);
  }

  /**
   * Get recommended scenarios for a user
   */
  async getRecommendations(userId: string, limit: number = 5): Promise<Scenario[]> {
    const query = `
      WITH user_competencies AS (
        -- Get user's practiced KSA codes
        SELECT DISTINCT ksa_code, current_level
        FROM user_skill_progression
        WHERE user_id = $1
      ),
      completed_scenarios AS (
        -- Get scenarios user has already completed
        SELECT DISTINCT scenario_id
        FROM programs
        WHERE user_id = $1 AND status = 'completed'
      )
      SELECT DISTINCT s.*,
        -- Calculate relevance score
        COUNT(DISTINCT skm.ksa_code) as matching_competencies,
        AVG(uc.current_level) as avg_user_level
      FROM scenarios s
      JOIN scenario_ksa_mappings skm ON s.id = skm.scenario_id
      LEFT JOIN user_competencies uc ON skm.ksa_code = uc.ksa_code
      WHERE 
        s.status = 'active'
        AND s.id NOT IN (SELECT scenario_id FROM completed_scenarios)
        AND (
          -- Match user's skill level
          (s.difficulty_level = 'beginner' AND COALESCE(AVG(uc.current_level), 0) < 3) OR
          (s.difficulty_level = 'intermediate' AND COALESCE(AVG(uc.current_level), 0) BETWEEN 3 AND 7) OR
          (s.difficulty_level = 'advanced' AND COALESCE(AVG(uc.current_level), 0) > 7) OR
          uc.current_level IS NULL -- New competencies
        )
      GROUP BY s.id
      ORDER BY 
        -- Prioritize scenarios that build on existing skills
        CASE WHEN COUNT(uc.ksa_code) > 0 THEN 0 ELSE 1 END,
        matching_competencies DESC,
        s.created_at DESC
      LIMIT $2
    `;

    return this.db.query<Scenario>(query, [userId, limit]);
  }

  /**
   * Update scenario metadata
   */
  async updateMetadata(id: string, metadata: Record<string, any>): Promise<Scenario> {
    const query = `
      UPDATE scenarios 
      SET 
        metadata = metadata || $2::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.queryOne<Scenario>(query, [id, JSON.stringify(metadata)]);
    if (!result) {
      throw new Error(`Scenario with id ${id} not found`);
    }

    return result;
  }

  /**
   * Publish a draft scenario
   */
  async publish(id: string): Promise<Scenario> {
    const query = `
      UPDATE scenarios 
      SET 
        status = 'active',
        published_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'draft'
      RETURNING *
    `;

    const result = await this.db.queryOne<Scenario>(query, [id]);
    if (!result) {
      throw new Error(`Draft scenario with id ${id} not found`);
    }

    return result;
  }

  /**
   * Archive a scenario
   */
  async archive(id: string): Promise<Scenario> {
    const query = `
      UPDATE scenarios 
      SET 
        status = 'archived',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.queryOne<Scenario>(query, [id]);
    if (!result) {
      throw new Error(`Scenario with id ${id} not found`);
    }

    return result;
  }

  /**
   * Get scenario statistics
   */
  async getStatistics(id: string): Promise<{
    totalAttempts: number;
    uniqueUsers: number;
    completionRate: number;
    averageScore: number;
    averageTimeMinutes: number;
  }> {
    const query = `
      SELECT 
        COUNT(*)::int as total_attempts,
        COUNT(DISTINCT user_id)::int as unique_users,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / NULLIF(COUNT(*), 0) as completion_rate,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN total_score END), 0) as average_score,
        COALESCE(AVG(time_spent_seconds) / 60.0, 0) as average_time_minutes
      FROM programs
      WHERE scenario_id = $1
    `;

    const result = await this.db.queryOne<any>(query, [id]);
    
    return {
      totalAttempts: result.total_attempts,
      uniqueUsers: result.unique_users,
      completionRate: result.completion_rate || 0,
      averageScore: parseFloat(result.average_score),
      averageTimeMinutes: parseFloat(result.average_time_minutes),
    };
  }

  /**
   * Clone a scenario
   */
  async clone(id: string, newTitle: MultilingualContent): Promise<Scenario> {
    const original = await this.findById(id);
    if (!original) {
      throw new Error(`Scenario with id ${id} not found`);
    }

    // Create new scenario with copied data
    const cloned = await this.create({
      type: original.type,
      status: 'draft',
      version: '1.0.0',
      title: newTitle,
      description: original.description,
      objectives: original.objectives,
      difficulty_level: original.difficulty_level,
      estimated_minutes: original.estimated_minutes,
      prerequisites: original.prerequisites,
      target_domains: original.target_domains,
      xp_rewards: original.xp_rewards,
      unlock_requirements: original.unlock_requirements,
      tasks: original.tasks,
      ai_modules: original.ai_modules,
      resources: original.resources,
      metadata: {
        ...original.metadata,
        cloned_from: id,
        cloned_at: new Date().toISOString(),
      },
    });

    // Copy KSA mappings
    const copyKsaQuery = `
      INSERT INTO scenario_ksa_mappings (scenario_id, ksa_code, is_primary, weight)
      SELECT $1, ksa_code, is_primary, weight
      FROM scenario_ksa_mappings
      WHERE scenario_id = $2
    `;

    await this.db.execute(copyKsaQuery, [cloned.id, id]);

    return cloned;
  }
}