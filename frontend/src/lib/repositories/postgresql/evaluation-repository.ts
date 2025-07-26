/**
 * PostgreSQL Evaluation Repository
 * 處理所有評估相關的資料庫操作
 * Updated for unified schema v2
 */

import { Pool } from 'pg';
import type { DBEvaluation } from '@/types/database';
import type { IEvaluation } from '@/types/unified-learning';
import { BaseEvaluationRepository } from '@/types/unified-learning';
import type { UpdateEvaluationDto } from '../interfaces';
import type { UserProgress, Achievement } from '@/lib/repositories/interfaces';

export class PostgreSQLEvaluationRepository extends BaseEvaluationRepository<IEvaluation> {
  constructor(private pool: Pool) {
    super();
  }

  /**
   * Convert database row to IEvaluation interface
   */
  private toEvaluation(row: DBEvaluation): IEvaluation {
    return {
      id: row.id,
      userId: row.user_id,
      programId: row.program_id || undefined,
      taskId: row.task_id || undefined,
      mode: row.mode,  // Include mode from database
      
      // Evaluation scope
      evaluationType: row.evaluation_type,
      evaluationSubtype: row.evaluation_subtype || undefined,
      
      // Scoring - PostgreSQL returns DECIMAL as string, convert to number
      score: typeof row.score === 'string' ? parseFloat(row.score) : row.score,
      maxScore: typeof row.max_score === 'string' ? parseFloat(row.max_score) : row.max_score,
      
      // Multi-dimensional scoring
      domainScores: row.domain_scores,
      
      // Feedback
      feedbackText: row.feedback_text || undefined,
      feedbackData: row.feedback_data,
      
      // AI analysis
      aiProvider: row.ai_provider || undefined,
      aiModel: row.ai_model || undefined,
      aiAnalysis: row.ai_analysis,
      
      // Time tracking - convert string to number if needed
      timeTakenSeconds: row.time_taken_seconds 
        ? (typeof row.time_taken_seconds === 'string' ? parseInt(row.time_taken_seconds) : row.time_taken_seconds)
        : undefined,
      
      // Timestamps
      createdAt: row.created_at,
      
      // Mode-specific data
      pblData: row.pbl_data,
      discoveryData: row.discovery_data,
      assessmentData: row.assessment_data,
      
      // Extensible metadata
      metadata: row.metadata
    };
  }

  async findById(id: string): Promise<IEvaluation | null> {
    const query = `
      SELECT * FROM evaluations WHERE id = $1
    `;

    const { rows } = await this.pool.query<DBEvaluation>(query, [id]);
    return rows[0] ? this.toEvaluation(rows[0]) : null;
  }

  async findByProgram(programId: string): Promise<IEvaluation[]> {
    const query = `
      SELECT * FROM evaluations 
      WHERE program_id = $1
      ORDER BY created_at DESC
    `;

    const { rows } = await this.pool.query<DBEvaluation>(query, [programId]);
    return rows.map(row => this.toEvaluation(row));
  }

  async findByTask(taskId: string): Promise<IEvaluation[]> {
    const query = `
      SELECT * FROM evaluations 
      WHERE task_id = $1
      ORDER BY created_at DESC
    `;

    const { rows } = await this.pool.query<DBEvaluation>(query, [taskId]);
    return rows.map(row => this.toEvaluation(row));
  }

  async findByUser(userId: string): Promise<IEvaluation[]> {
    const query = `
      SELECT * FROM evaluations 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const { rows } = await this.pool.query<DBEvaluation>(query, [userId]);
    return rows.map(row => this.toEvaluation(row));
  }

  async findByType(evaluationType: string, evaluationSubtype?: string): Promise<IEvaluation[]> {
    let query = `
      SELECT * FROM evaluations 
      WHERE evaluation_type = $1
    `;
    const params: unknown[] = [evaluationType];

    if (evaluationSubtype) {
      query += ` AND evaluation_subtype = $2`;
      params.push(evaluationSubtype);
    }

    query += ` ORDER BY created_at DESC`;

    const { rows } = await this.pool.query<DBEvaluation>(query, params);
    return rows.map(row => this.toEvaluation(row));
  }

  async create(evaluation: Omit<IEvaluation, 'id'>): Promise<IEvaluation> {
    const query = `
      INSERT INTO evaluations (
        user_id, program_id, task_id,
        evaluation_type, evaluation_subtype,
        score, max_score,
        domain_scores,
        feedback_text, feedback_data,
        ai_provider, ai_model, ai_analysis,
        time_taken_seconds,
        pbl_data, discovery_data, assessment_data,
        metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18
      )
      RETURNING *
    `;

    const { rows } = await this.pool.query<DBEvaluation>(query, [
      evaluation.userId,
      evaluation.programId || null,
      evaluation.taskId || null,
      evaluation.evaluationType,
      evaluation.evaluationSubtype || null,
      evaluation.score,
      evaluation.maxScore,
      JSON.stringify(evaluation.domainScores || {}),
      evaluation.feedbackText || null,
      JSON.stringify(evaluation.feedbackData || {}),
      evaluation.aiProvider || null,
      evaluation.aiModel || null,
      JSON.stringify(evaluation.aiAnalysis || {}),
      evaluation.timeTakenSeconds,
      JSON.stringify(evaluation.pblData || {}),
      JSON.stringify(evaluation.discoveryData || {}),
      JSON.stringify(evaluation.assessmentData || {}),
      JSON.stringify(evaluation.metadata || {})
    ]);

    return this.toEvaluation(rows[0]);
  }

  // Additional methods specific to PostgreSQL implementation

  async getLatestForTask(taskId: string): Promise<IEvaluation | null> {
    const query = `
      SELECT * FROM evaluations 
      WHERE task_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const { rows } = await this.pool.query<DBEvaluation>(query, [taskId]);
    return rows[0] ? this.toEvaluation(rows[0]) : null;
  }

  async getLatestForProgram(programId: string): Promise<IEvaluation | null> {
    const query = `
      SELECT * FROM evaluations 
      WHERE program_id = $1 AND task_id IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const { rows } = await this.pool.query<DBEvaluation>(query, [programId]);
    return rows[0] ? this.toEvaluation(rows[0]) : null;
  }

  // Get user progress statistics
  async getUserProgress(userId: string): Promise<UserProgress> {
    const client = await this.pool.connect();
    
    try {
      // Get program statistics
      const programStatsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM programs
        WHERE user_id = $1
      `;
      const { rows: [programStats] } = await client.query(programStatsQuery, [userId]);

      // Get task statistics
      const taskStatsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed,
          AVG(CASE WHEN t.status = 'completed' THEN t.score END) as avg_score,
          SUM(t.time_spent_seconds) as total_time
        FROM tasks t
        JOIN programs p ON t.program_id = p.id
        WHERE p.user_id = $1
      `;
      const { rows: [taskStats] } = await client.query(taskStatsQuery, [userId]);

      // Get total XP earned
      const xpQuery = `
        SELECT total_xp FROM users WHERE id = $1
      `;
      const { rows: [xpData] } = await client.query(xpQuery, [userId]);

      // Get achievements
      const achievementsQuery = `
        SELECT 
          a.id, a.code, a.name, a.description,
          a.xp_reward as "xpReward", ua.earned_at as "earnedAt"
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = $1
        ORDER BY ua.earned_at DESC
      `;
      const { rows: achievements } = await client.query(achievementsQuery, [userId]);

      return {
        totalPrograms: parseInt(programStats.total),
        completedPrograms: parseInt(programStats.completed),
        totalTasks: parseInt(taskStats.total),
        completedTasks: parseInt(taskStats.completed),
        totalXpEarned: xpData?.total_xp || 0,
        averageScore: parseFloat(taskStats.avg_score) || 0,
        timeSpentSeconds: parseInt(taskStats.total_time) || 0,
        achievements: achievements.map((a: { id: string; code: string; name: string; description: string; earned_at: Date }) => ({
          id: a.id,
          code: a.code,
          type: a.type,
          xpReward: a.xp_reward,
          earnedAt: new Date(a.earned_at)
        })) as Achievement[]
      };
    } finally {
      client.release();
    }
  }

  // Get evaluations with detailed information
  async getDetailedEvaluations(userId: string, limit: number = 10): Promise<Array<IEvaluation & {
    scenarioMode?: string;
    scenarioDifficulty?: string;
    taskType?: string;
    taskIndex?: number;
  }>> {
    const query = `
      SELECT 
        e.*,
        s.mode as scenario_mode,
        s.difficulty as scenario_difficulty,
        t.type as task_type,
        t.task_index
      FROM evaluations e
      LEFT JOIN programs p ON e.program_id = p.id
      LEFT JOIN scenarios s ON p.scenario_id = s.id
      LEFT JOIN tasks t ON e.task_id = t.id
      WHERE e.user_id = $1
      ORDER BY e.created_at DESC
      LIMIT $2
    `;

    const { rows } = await this.pool.query(query, [userId, limit]);
    return rows.map(row => ({
      ...this.toEvaluation(row),
      scenarioMode: row.scenario_mode,
      scenarioDifficulty: row.scenario_difficulty,
      taskType: row.task_type,
      taskIndex: row.task_index
    }));
  }

  // Get dimension scores progress over time
  async getDimensionProgress(userId: string, dimension?: string): Promise<Array<{
    date: string;
    scores: Record<string, number>;
  }>> {
    let query = `
      SELECT 
        created_at::date as date,
        domain_scores
      FROM evaluations
      WHERE user_id = $1 
        AND domain_scores IS NOT NULL
        AND domain_scores != '{}'::jsonb
    `;

    if (dimension) {
      query += ` AND domain_scores ? $2`;
    }

    query += ` ORDER BY created_at ASC`;

    const params = dimension ? [userId, dimension] : [userId];
    const { rows } = await this.pool.query(query, params);
    
    return rows.map(row => ({
      date: row.date,
      scores: row.domain_scores
    }));
  }

  // Calculate user's strengths and weaknesses
  async getUserStrengthsWeaknesses(userId: string): Promise<{
    strengths: Array<{ dimension: string; avgScore: number }>;
    weaknesses: Array<{ dimension: string; avgScore: number }>;
  }> {
    const query = `
      WITH dimension_averages AS (
        SELECT 
          jsonb_object_keys(domain_scores) as dimension,
          AVG((domain_scores->>jsonb_object_keys(domain_scores))::float) as avg_score
        FROM evaluations
        WHERE user_id = $1 
          AND domain_scores IS NOT NULL
        GROUP BY jsonb_object_keys(domain_scores)
      )
      SELECT dimension, avg_score
      FROM dimension_averages
      ORDER BY avg_score DESC
    `;

    const { rows } = await this.pool.query(query, [userId]);
    
    return {
      strengths: rows.slice(0, 3).map(r => ({
        dimension: r.dimension,
        avgScore: parseFloat(r.avg_score)
      })),
      weaknesses: rows.slice(-3).reverse().map(r => ({
        dimension: r.dimension,
        avgScore: parseFloat(r.avg_score)
      }))
    };
  }

  // Track AI usage for evaluations
  async trackAIUsage(evaluationId: string, usage: {
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }): Promise<void> {
    const query = `
      INSERT INTO ai_usage (
        user_id, program_id, task_id,
        feature, provider, model,
        prompt_tokens, completion_tokens, total_tokens,
        estimated_cost_usd, metadata
      )
      SELECT 
        e.user_id, e.program_id, e.task_id,
        'evaluation', $2, $3, $4, $5, $6, $7,
        jsonb_build_object('evaluation_id', $1)
      FROM evaluations e
      WHERE e.id = $1
    `;

    await this.pool.query(query, [
      evaluationId,
      usage.provider,
      usage.model,
      usage.promptTokens,
      usage.completionTokens,
      usage.totalTokens,
      usage.estimatedCostUsd
    ]);
  }

  // Get evaluations by date range
  async findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<IEvaluation[]> {
    const query = `
      SELECT * FROM evaluations 
      WHERE user_id = $1
        AND created_at >= $2
        AND created_at <= $3
      ORDER BY created_at DESC
    `;

    const { rows } = await this.pool.query<DBEvaluation>(query, [
      userId,
      startDate.toISOString(),
      endDate.toISOString()
    ]);
    return rows.map(row => this.toEvaluation(row));
  }

  // Update evaluation
  async update(id: string, data: UpdateEvaluationDto): Promise<IEvaluation> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.score !== undefined) {
      updates.push(`score = $${paramIndex}`);
      values.push(data.score);
      paramIndex++;
    }

    if (data.maxScore !== undefined) {
      updates.push(`max_score = $${paramIndex}`);
      values.push(data.maxScore);
      paramIndex++;
    }

    if (data.domainScores !== undefined) {
      updates.push(`domain_scores = $${paramIndex}`);
      values.push(data.domainScores);
      paramIndex++;
    }

    if (data.feedbackText !== undefined) {
      updates.push(`feedback_text = $${paramIndex}`);
      values.push(data.feedbackText);
      paramIndex++;
    }

    if (data.feedbackData !== undefined) {
      updates.push(`feedback_data = $${paramIndex}`);
      values.push(data.feedbackData);
      paramIndex++;
    }

    if (data.aiAnalysis !== undefined) {
      updates.push(`ai_analysis = $${paramIndex}`);
      values.push(data.aiAnalysis);
      paramIndex++;
    }

    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex}`);
      values.push(data.metadata);
      paramIndex++;
    }

    if (updates.length === 0) {
      const evaluation = await this.findById(id);
      if (!evaluation) {
        throw new Error('Evaluation not found');
      }
      return evaluation;
    }

    values.push(id);
    const query = `
      UPDATE evaluations
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const { rows } = await this.pool.query<DBEvaluation>(query, values);
    if (rows.length === 0) {
      throw new Error('Evaluation not found');
    }

    return this.toEvaluation(rows[0]);
  }

  // Get average scores by evaluation type
  async getAverageScoresByType(userId: string): Promise<Array<{
    evaluationType: string;
    evaluationSubtype?: string;
    avgScore: number;
    count: number;
  }>> {
    const query = `
      SELECT 
        evaluation_type,
        evaluation_subtype,
        AVG(score) as avg_score,
        COUNT(*) as count
      FROM evaluations
      WHERE user_id = $1
      GROUP BY evaluation_type, evaluation_subtype
      ORDER BY evaluation_type, evaluation_subtype
    `;

    const { rows } = await this.pool.query(query, [userId]);
    
    return rows.map(row => ({
      evaluationType: row.evaluation_type,
      evaluationSubtype: row.evaluation_subtype,
      avgScore: parseFloat(row.avg_score),
      count: parseInt(row.count)
    }));
  }
}