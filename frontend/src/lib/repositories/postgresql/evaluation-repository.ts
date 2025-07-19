/**
 * PostgreSQL Evaluation Repository
 * 處理所有評估相關的資料庫操作
 */

import { Pool } from 'pg';
import {
  IEvaluationRepository,
  Evaluation,
  CreateEvaluationDto,
  UserProgress,
  Achievement
} from '../interfaces';

export class PostgreSQLEvaluationRepository implements IEvaluationRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<Evaluation | null> {
    const query = `
      SELECT 
        id, user_id as "userId", program_id as "programId",
        task_id as "taskId", evaluation_type as "evaluationType",
        score, max_score as "maxScore", feedback,
        ai_analysis as "aiAnalysis", ksa_scores as "ksaScores",
        time_taken_seconds as "timeTakenSeconds",
        created_at as "createdAt", metadata
      FROM evaluations
      WHERE id = $1
    `;

    const { rows } = await this.pool.query(query, [id]);
    return rows[0] || null;
  }

  async findByProgram(programId: string): Promise<Evaluation[]> {
    const query = `
      SELECT 
        id, user_id as "userId", program_id as "programId",
        task_id as "taskId", evaluation_type as "evaluationType",
        score, max_score as "maxScore", feedback,
        ai_analysis as "aiAnalysis", ksa_scores as "ksaScores",
        time_taken_seconds as "timeTakenSeconds",
        created_at as "createdAt", metadata
      FROM evaluations
      WHERE program_id = $1
      ORDER BY created_at DESC
    `;

    const { rows } = await this.pool.query(query, [programId]);
    return rows;
  }

  async findByTask(taskId: string): Promise<Evaluation[]> {
    const query = `
      SELECT 
        id, user_id as "userId", program_id as "programId",
        task_id as "taskId", evaluation_type as "evaluationType",
        score, max_score as "maxScore", feedback,
        ai_analysis as "aiAnalysis", ksa_scores as "ksaScores",
        time_taken_seconds as "timeTakenSeconds",
        created_at as "createdAt", metadata
      FROM evaluations
      WHERE task_id = $1
      ORDER BY created_at DESC
    `;

    const { rows } = await this.pool.query(query, [taskId]);
    return rows;
  }

  async create(data: CreateEvaluationDto): Promise<Evaluation> {
    const query = `
      INSERT INTO evaluations (
        user_id, program_id, task_id, evaluation_type,
        score, max_score, feedback, ai_analysis,
        ksa_scores, time_taken_seconds, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        id, user_id as "userId", program_id as "programId",
        task_id as "taskId", evaluation_type as "evaluationType",
        score, max_score as "maxScore", feedback,
        ai_analysis as "aiAnalysis", ksa_scores as "ksaScores",
        time_taken_seconds as "timeTakenSeconds",
        created_at as "createdAt", metadata
    `;

    const { rows } = await this.pool.query(query, [
      data.userId,
      data.programId || null,
      data.taskId || null,
      data.evaluationType,
      data.score,
      data.maxScore,
      data.feedback || null,
      JSON.stringify(data.aiAnalysis || {}),
      JSON.stringify(data.ksaScores || {}),
      data.timeTakenSeconds,
      JSON.stringify(data.metadata || {})
    ]);

    return rows[0];
  }

  async getLatestForTask(taskId: string): Promise<Evaluation | null> {
    const query = `
      SELECT 
        id, user_id as "userId", program_id as "programId",
        task_id as "taskId", evaluation_type as "evaluationType",
        score, max_score as "maxScore", feedback,
        ai_analysis as "aiAnalysis", ksa_scores as "ksaScores",
        time_taken_seconds as "timeTakenSeconds",
        created_at as "createdAt", metadata
      FROM evaluations
      WHERE task_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const { rows } = await this.pool.query(query, [taskId]);
    return rows[0] || null;
  }

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
          a.id, a.code, a.achievement_type as type, 
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
        achievements
      };
    } finally {
      client.release();
    }
  }

  // Get evaluations with detailed information
  async getDetailedEvaluations(userId: string, limit: number = 10): Promise<any[]> {
    const query = `
      SELECT 
        e.id, e.user_id as "userId", e.program_id as "programId",
        e.task_id as "taskId", e.evaluation_type as "evaluationType",
        e.score, e.max_score as "maxScore", e.feedback,
        e.ai_analysis as "aiAnalysis", e.ksa_scores as "ksaScores",
        e.time_taken_seconds as "timeTakenSeconds",
        e.created_at as "createdAt", e.metadata,
        s.type as "scenarioType", s.difficulty_level as "difficultyLevel",
        t.type as "taskType", t.task_index as "taskIndex"
      FROM evaluations e
      LEFT JOIN programs p ON e.program_id = p.id
      LEFT JOIN scenarios s ON p.scenario_id = s.id
      LEFT JOIN tasks t ON e.task_id = t.id
      WHERE e.user_id = $1
      ORDER BY e.created_at DESC
      LIMIT $2
    `;

    const { rows } = await this.pool.query(query, [userId, limit]);
    return rows;
  }

  // Get KSA progress over time
  async getKSAProgress(userId: string): Promise<any> {
    const query = `
      SELECT 
        e.created_at as date,
        e.ksa_scores
      FROM evaluations e
      WHERE e.user_id = $1 
        AND e.ksa_scores IS NOT NULL
        AND e.ksa_scores != '{}'::jsonb
      ORDER BY e.created_at ASC
    `;

    const { rows } = await this.pool.query(query, [userId]);
    
    // Process KSA scores to track progress
    const progress: any = {
      knowledge: [],
      skills: [],
      attitudes: []
    };

    rows.forEach(row => {
      const scores = row.ksa_scores;
      progress.knowledge.push({
        date: row.date,
        score: scores.knowledge || 0
      });
      progress.skills.push({
        date: row.date,
        score: scores.skills || 0
      });
      progress.attitudes.push({
        date: row.date,
        score: scores.attitudes || 0
      });
    });

    return progress;
  }

  // Calculate user's strengths and weaknesses
  async getUserStrengthsWeaknesses(userId: string): Promise<any> {
    const query = `
      SELECT 
        jsonb_object_keys(ksa_scores) as ksa_type,
        AVG((ksa_scores->>jsonb_object_keys(ksa_scores))::float) as avg_score
      FROM evaluations
      WHERE user_id = $1 
        AND ksa_scores IS NOT NULL
      GROUP BY jsonb_object_keys(ksa_scores)
      ORDER BY avg_score DESC
    `;

    const { rows } = await this.pool.query(query, [userId]);
    
    return {
      strengths: rows.slice(0, 3).map(r => ({
        type: r.ksa_type,
        score: parseFloat(r.avg_score)
      })),
      weaknesses: rows.slice(-3).reverse().map(r => ({
        type: r.ksa_type,
        score: parseFloat(r.avg_score)
      }))
    };
  }

  // Track AI usage for evaluations
  async trackAIUsage(evaluationId: string, aiProvider: string, model: string, tokens: number, cost: number): Promise<void> {
    const query = `
      INSERT INTO ai_usage (
        user_id, feature, provider, model,
        prompt_tokens, completion_tokens, total_tokens,
        estimated_cost_usd, metadata
      )
      SELECT 
        e.user_id, 'evaluation', $2, $3, 
        $4, $4, $4 * 2, $5,
        jsonb_build_object('evaluation_id', $1)
      FROM evaluations e
      WHERE e.id = $1
    `;

    await this.pool.query(query, [evaluationId, aiProvider, model, tokens, cost]);
  }
}