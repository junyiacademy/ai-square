import { Pool } from 'pg';
import { getPool } from '../db/get-pool';

interface TaskTemplate {
  id?: string;
  title?: Record<string, string>;
  type?: string;
  description?: Record<string, string>;
  content?: Record<string, unknown>;
  [key: string]: unknown;
}

interface QuestionTemplate {
  id?: string;
  question?: Record<string, string>;
  type?: string;
  options?: Array<Record<string, unknown>>;
  correctAnswer?: string | number;
  [key: string]: unknown;
}

interface ScenarioContent {
  pbl_data?: Record<string, unknown>;
  discovery_data?: Record<string, unknown>;
  assessment_data?: Record<string, unknown>;
  tasks?: TaskTemplate[];
  questions?: QuestionTemplate[];
  objectives?: Record<string, string[]> | string[];
  prerequisites?: string[];
  xpRewards?: Record<string, number>;
  resources?: Array<Record<string, unknown>>;
  aiModules?: Record<string, unknown>;
  taskTemplates?: TaskTemplate[];
}

export interface ScenarioEditor {
  id: string;
  scenario_id: string;
  mode: 'pbl' | 'discovery' | 'assessment';
  title: Record<string, string>;
  description: Record<string, string>;
  content: ScenarioContent;
  status?: string;
  tags?: string[];
  difficulty?: string;
  estimated_time?: number;
  yml_path?: string;
  yml_hash?: string;
  last_yml_sync?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export class ScenarioEditorRepository {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async findAll(): Promise<ScenarioEditor[]> {
    // Query from main scenarios table to get all existing scenarios
    const query = `
      SELECT
        id,
        id as scenario_id,
        mode,
        title,
        description,
        COALESCE(
          CASE
            WHEN pbl_data IS NOT NULL THEN json_build_object('pbl_data', pbl_data, 'tasks', task_templates)
            WHEN discovery_data IS NOT NULL THEN json_build_object('discovery_data', discovery_data, 'tasks', task_templates)
            WHEN assessment_data IS NOT NULL THEN json_build_object('assessment_data', assessment_data, 'questions', task_templates)
            ELSE json_build_object('tasks', task_templates)
          END,
          '{}'::json
        ) as content,
        status,
        tags,
        difficulty,
        estimated_time,
        NULL as yml_path,
        created_at,
        updated_at
      FROM scenarios
      WHERE mode IN ('pbl', 'discovery', 'assessment')
      ORDER BY mode, updated_at DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async findById(id: string): Promise<ScenarioEditor | null> {
    // First try scenarios_editor table (for new scenarios created in WYSIWYG)
    let query = `
      SELECT
        id,
        scenario_id,
        mode,
        title,
        description,
        content,
        status,
        tags,
        difficulty,
        estimated_time,
        yml_path,
        yml_hash,
        last_yml_sync,
        created_at,
        updated_at
      FROM scenarios_editor
      WHERE id = $1
    `;

    let result = await this.pool.query(query, [id]);

    // If not found, try main scenarios table
    if (result.rows.length === 0) {
      query = `
        SELECT
          id,
          id as scenario_id,
          mode,
          title,
          description,
          COALESCE(
            CASE
              WHEN pbl_data IS NOT NULL THEN json_build_object('pbl_data', pbl_data, 'tasks', task_templates, 'objectives', objectives)
              WHEN discovery_data IS NOT NULL THEN json_build_object('discovery_data', discovery_data, 'tasks', task_templates, 'objectives', objectives)
              WHEN assessment_data IS NOT NULL THEN json_build_object('assessment_data', assessment_data, 'questions', task_templates, 'objectives', objectives)
              ELSE json_build_object('tasks', task_templates, 'objectives', objectives)
            END,
            '{}'::json
          ) as content,
          status,
          tags,
          difficulty,
          estimated_time,
          NULL as yml_path,
          NULL as yml_hash,
          NULL as last_yml_sync,
          created_at,
          updated_at
        FROM scenarios
        WHERE id = $1
      `;
      result = await this.pool.query(query, [id]);
    }

    return result.rows[0] || null;
  }

  async findByScenarioId(scenarioId: string): Promise<ScenarioEditor | null> {
    const query = `
      SELECT
        id,
        scenario_id,
        mode,
        title,
        description,
        content,
        status,
        tags,
        difficulty,
        estimated_time,
        yml_path,
        yml_hash,
        last_yml_sync,
        created_at,
        updated_at
      FROM scenarios_editor
      WHERE scenario_id = $1
    `;

    const result = await this.pool.query(query, [scenarioId]);
    return result.rows[0] || null;
  }

  async create(data: Partial<ScenarioEditor>): Promise<ScenarioEditor> {
    const query = `
      INSERT INTO scenarios_editor (
        scenario_id,
        mode,
        title,
        description,
        content,
        status,
        tags,
        difficulty,
        estimated_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      data.scenario_id,
      data.mode || 'pbl',
      JSON.stringify(data.title || { en: '', zh: '' }),
      JSON.stringify(data.description || { en: '', zh: '' }),
      JSON.stringify(data.content || {}),
      data.status || 'draft',
      data.tags || [],
      data.difficulty,
      data.estimated_time
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async update(id: string, data: Partial<ScenarioEditor>): Promise<ScenarioEditor> {
    // First check if this scenario exists in scenarios_editor
    const checkQuery = `SELECT id FROM scenarios_editor WHERE id = $1`;
    const checkResult = await this.pool.query(checkQuery, [id]);
    const isInEditorTable = checkResult.rows.length > 0;

    const updateFields: string[] = [];
    const values: (string | number | boolean | Record<string, unknown> | unknown[] | null)[] = [];
    let paramCount = 1;

    if (isInEditorTable) {
      // Update scenarios_editor table
      if (data.scenario_id !== undefined) {
        updateFields.push(`scenario_id = $${paramCount++}`);
        values.push(data.scenario_id);
      }
      if (data.mode !== undefined) {
        updateFields.push(`mode = $${paramCount++}`);
        values.push(data.mode);
      }
      if (data.title !== undefined) {
        updateFields.push(`title = $${paramCount++}`);
        values.push(JSON.stringify(data.title));
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(JSON.stringify(data.description));
      }
      if (data.content !== undefined) {
        updateFields.push(`content = $${paramCount++}`);
        values.push(JSON.stringify(data.content));
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(data.status);
      }
      if (data.tags !== undefined) {
        updateFields.push(`tags = $${paramCount++}`);
        values.push(data.tags);
      }
      if (data.difficulty !== undefined) {
        updateFields.push(`difficulty = $${paramCount++}`);
        values.push(data.difficulty);
      }
      if (data.estimated_time !== undefined) {
        updateFields.push(`estimated_time = $${paramCount++}`);
        values.push(data.estimated_time);
      }

      values.push(id);

      const query = `
        UPDATE scenarios_editor
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } else {
      // Update main scenarios table
      if (data.mode !== undefined) {
        updateFields.push(`mode = $${paramCount++}`);
        values.push(data.mode);
      }
      if (data.title !== undefined) {
        updateFields.push(`title = $${paramCount++}`);
        values.push(JSON.stringify(data.title));
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(JSON.stringify(data.description));
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(data.status);
      }
      if (data.tags !== undefined) {
        updateFields.push(`tags = $${paramCount++}`);
        values.push(data.tags);
      }
      if (data.difficulty !== undefined) {
        updateFields.push(`difficulty = $${paramCount++}`);
        values.push(data.difficulty);
      }
      if (data.estimated_time !== undefined) {
        updateFields.push(`estimated_time = $${paramCount++}`);
        values.push(data.estimated_time);
      }

      // Handle content update for main scenarios table
      if (data.content) {
        const content = data.content;
        if (content.pbl_data) {
          updateFields.push(`pbl_data = $${paramCount++}`);
          values.push(JSON.stringify(content.pbl_data));
        }
        if (content.discovery_data) {
          updateFields.push(`discovery_data = $${paramCount++}`);
          values.push(JSON.stringify(content.discovery_data));
        }
        if (content.assessment_data) {
          updateFields.push(`assessment_data = $${paramCount++}`);
          values.push(JSON.stringify(content.assessment_data));
        }
        if (content.tasks) {
          updateFields.push(`task_templates = $${paramCount++}`);
          values.push(JSON.stringify(content.tasks));
        }
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE scenarios
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING
          id,
          id as scenario_id,
          mode,
          title,
          description,
          COALESCE(
            CASE
              WHEN pbl_data IS NOT NULL THEN json_build_object('pbl_data', pbl_data, 'tasks', task_templates, 'objectives', objectives)
              WHEN discovery_data IS NOT NULL THEN json_build_object('discovery_data', discovery_data, 'tasks', task_templates, 'objectives', objectives)
              WHEN assessment_data IS NOT NULL THEN json_build_object('assessment_data', assessment_data, 'questions', task_templates, 'objectives', objectives)
              ELSE json_build_object('tasks', task_templates, 'objectives', objectives)
            END,
            '{}'::json
          ) as content,
          status,
          tags,
          difficulty,
          estimated_time,
          NULL as yml_path,
          created_at,
          updated_at
      `;

      const result = await this.pool.query(query, values);
      return result.rows[0];
    }
  }

  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM scenarios_editor WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async exportToYml(id: string): Promise<string> {
    const query = `SELECT export_scenario_to_yml($1) as yml`;
    const result = await this.pool.query(query, [id]);
    return result.rows[0]?.yml || '';
  }
}