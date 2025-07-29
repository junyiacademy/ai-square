/**
 * PostgreSQL User Repository
 * 處理所有用戶相關的資料庫操作
 */

import { Pool } from 'pg';
import {
  IUserRepository,
  User,
  CreateUserDto,
  UpdateUserDto,
  FindUsersOptions,
  AssessmentSession,
  AssessmentResults,
  UserBadge,
  CreateAssessmentSessionDto,
  CreateBadgeDto,
  UserDataResponse,
  UserDataInput
} from '../interfaces';

export class PostgreSQLUserRepository implements IUserRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT 
        id, email, name, preferred_language as "preferredLanguage",
        level, total_xp as "totalXp", learning_preferences as "learningPreferences",
        onboarding_completed as "onboardingCompleted",
        created_at as "createdAt", updated_at as "updatedAt",
        last_active_at as "lastActiveAt", metadata
      FROM users
      WHERE id = $1
    `;

    const { rows } = await this.pool.query(query, [id]);
    return rows[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT 
        id, email, name, preferred_language as "preferredLanguage",
        level, total_xp as "totalXp", learning_preferences as "learningPreferences",
        onboarding_completed as "onboardingCompleted",
        created_at as "createdAt", updated_at as "updatedAt",
        last_active_at as "lastActiveAt", metadata
      FROM users
      WHERE LOWER(email) = LOWER($1)
    `;

    const { rows } = await this.pool.query(query, [email]);
    return rows[0] || null;
  }

  async create(data: CreateUserDto): Promise<User> {
    const query = `
      INSERT INTO users (
        email, name, preferred_language, learning_preferences
      ) VALUES ($1, $2, $3, $4)
      RETURNING 
        id, email, name, preferred_language as "preferredLanguage",
        level, total_xp as "totalXp", learning_preferences as "learningPreferences",
        onboarding_completed as "onboardingCompleted",
        created_at as "createdAt", updated_at as "updatedAt",
        last_active_at as "lastActiveAt", metadata
    `;

    const { rows } = await this.pool.query(query, [
      data.email.toLowerCase(),
      data.name,
      data.preferredLanguage || 'en',
      JSON.stringify(data.learningPreferences || {})
    ]);

    return rows[0];
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }

    if (data.preferredLanguage !== undefined) {
      updates.push(`preferred_language = $${paramCount++}`);
      values.push(data.preferredLanguage);
    }

    if (data.level !== undefined) {
      updates.push(`level = $${paramCount++}`);
      values.push(data.level);
    }

    if (data.totalXp !== undefined) {
      updates.push(`total_xp = $${paramCount++}`);
      values.push(data.totalXp);
    }

    if (data.learningPreferences !== undefined) {
      updates.push(`learning_preferences = $${paramCount++}`);
      values.push(JSON.stringify(data.learningPreferences));
    }

    if (data.onboardingCompleted !== undefined) {
      updates.push(`onboarding_completed = $${paramCount++}`);
      values.push(data.onboardingCompleted);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id, email, name, preferred_language as "preferredLanguage",
        level, total_xp as "totalXp", learning_preferences as "learningPreferences",
        onboarding_completed as "onboardingCompleted",
        created_at as "createdAt", updated_at as "updatedAt",
        last_active_at as "lastActiveAt", metadata
    `;

    const { rows } = await this.pool.query(query, values);
    
    if (!rows[0]) {
      throw new Error('User not found');
    }

    return rows[0];
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async findAll(options: FindUsersOptions = {}): Promise<User[]> {
    const {
      limit = 100,
      offset = 0,
      orderBy = 'created_at',
      order = 'DESC'
    } = options;

    const query = `
      SELECT 
        id, email, name, preferred_language as "preferredLanguage",
        level, total_xp as "totalXp", learning_preferences as "learningPreferences",
        onboarding_completed as "onboardingCompleted",
        created_at as "createdAt", updated_at as "updatedAt",
        last_active_at as "lastActiveAt", metadata
      FROM users
      ORDER BY ${orderBy} ${order}
      LIMIT $1 OFFSET $2
    `;

    const { rows } = await this.pool.query(query, [limit, offset]);
    return rows;
  }

  async updateLastActive(id: string): Promise<void> {
    const query = `
      UPDATE users
      SET last_active_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.pool.query(query, [id]);
  }

  async addAchievement(userId: string, achievementId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if achievement exists
      const achQuery = 'SELECT id, xp_reward FROM achievements WHERE id = $1';
      const { rows: achRows } = await client.query(achQuery, [achievementId]);
      
      if (!achRows[0]) {
        throw new Error('Achievement not found');
      }

      const xpReward = achRows[0].xp_reward;

      // Add user achievement
      const userAchQuery = `
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, achievement_id) DO NOTHING
      `;
      await client.query(userAchQuery, [userId, achievementId]);

      // Update user XP
      const updateXpQuery = `
        UPDATE users
        SET total_xp = total_xp + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      await client.query(updateXpQuery, [xpReward, userId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ========================================
  // Assessment System Methods (Updated for Unified Architecture)
  // ========================================

  async saveAssessmentSession(userId: string, session: CreateAssessmentSessionDto): Promise<AssessmentSession> {
    // In the unified architecture, assessment results are stored in evaluations table
    // This method is kept for backward compatibility but redirects to evaluations
    
    // First, find the assessment task for this user
    const taskQuery = `
      SELECT t.id 
      FROM tasks t
      JOIN programs p ON t.program_id = p.id
      WHERE p.user_id = $1 AND t.mode = 'assessment'
      ORDER BY t.created_at DESC
      LIMIT 1
    `;
    
    const { rows: taskRows } = await this.pool.query(taskQuery, [userId]);
    const taskId = taskRows[0]?.id || null;
    
    // Create evaluation record
    const evalQuery = `
      INSERT INTO evaluations (
        task_id, user_id, evaluation_type, score, feedback, criteria, metadata
      ) VALUES ($1, $2, 'summative', $3, $4, $5, $6)
      RETURNING 
        id, user_id as "userId", created_at as "createdAt",
        score as "overallScore", feedback, metadata
    `;
    
    const overallScore = (session.techScore + session.creativeScore + session.businessScore) / 3;
    const feedback = {
      techScore: session.techScore,
      creativeScore: session.creativeScore,
      businessScore: session.businessScore,
      answers: session.answers,
      generatedPaths: session.generatedPaths
    };
    
    const { rows } = await this.pool.query(evalQuery, [
      taskId,
      userId,
      overallScore,
      JSON.stringify(feedback),
      JSON.stringify({ domains: ['tech', 'creative', 'business'] }),
      JSON.stringify({ sessionKey: session.sessionKey })
    ]);
    
    // Transform to match legacy AssessmentSession interface
    return {
      id: rows[0].id,
      userId: rows[0].userId,
      sessionKey: session.sessionKey,
      techScore: session.techScore,
      creativeScore: session.creativeScore,
      businessScore: session.businessScore,
      answers: session.answers || {},
      generatedPaths: session.generatedPaths || [],
      createdAt: rows[0].createdAt,
      metadata: rows[0].metadata
    };
  }

  async getAssessmentSessions(_userId: string): Promise<AssessmentSession[]> {
    // TODO: Assessment 模組需要遷移到統一架構
    // 暫時返回空陣列避免阻擋 Discovery 開發
    return [];
  }

  async getLatestAssessmentResults(_userId: string): Promise<AssessmentResults | null> {
    // TODO: Assessment 模組需要遷移到統一架構
    // 暫時返回 null 避免阻擋 Discovery 開發
    return null;
  }

  // ========================================
  // Badge System Methods
  // ========================================

  async addBadge(userId: string, badge: CreateBadgeDto): Promise<UserBadge> {
    const query = `
      INSERT INTO user_badges (
        user_id, badge_id, name, description, image_url, category, xp_reward
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, badge_id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url,
        category = EXCLUDED.category,
        xp_reward = EXCLUDED.xp_reward
      RETURNING 
        id, user_id as "userId", badge_id as "badgeId", name, description,
        image_url as "imageUrl", category, xp_reward as "xpReward",
        unlocked_at as "unlockedAt", metadata
    `;

    const { rows } = await this.pool.query(query, [
      userId,
      badge.badgeId,
      badge.name,
      badge.description,
      badge.imageUrl,
      badge.category,
      badge.xpReward
    ]);

    return rows[0];
  }

  async getUserBadges(_userId: string): Promise<UserBadge[]> {
    // TODO: Badge 系統需要建立相關資料表
    // 暫時返回空陣列避免阻擋 Discovery 開發
    return [];
  }

  // ========================================
  // Complete User Data Operations (Legacy Compatibility)
  // ========================================

  async getUserData(userEmail: string): Promise<UserDataResponse | null> {
    // First, find or create user
    let user = await this.findByEmail(userEmail);
    if (!user) {
      // Auto-create user if doesn't exist (for backward compatibility)
      user = await this.create({
        email: userEmail,
        name: userEmail.split('@')[0] // Use email prefix as default name
      });
    }

    // Get assessment sessions
    const assessmentSessions = await this.getAssessmentSessions(user.id);
    
    // Get latest assessment results
    const latestResults = await this.getLatestAssessmentResults(user.id);
    
    // Get user badges
    const badges = await this.getUserBadges(user.id);
    
    // TODO: Achievement 系統需要建立相關資料表
    // 暫時返回空陣列避免阻擋 Discovery 開發
    const achievements: unknown[] = [];

    // Format response to match legacy UserData interface
    return {
      assessmentResults: latestResults,
      achievements: {
        badges,
        totalXp: user.totalXp,
        level: user.level,
        completedTasks: [], // TODO: Could derive from completed tasks
        achievements
      },
      assessmentSessions: assessmentSessions.map(session => ({
        ...session,
        results: {
          tech: session.techScore,
          creative: session.creativeScore,
          business: session.businessScore
        }
      })),
      lastUpdated: new Date().toISOString(),
      version: '3.0' // PostgreSQL version
    };
  }

  async saveUserData(userEmail: string, data: UserDataInput): Promise<UserDataResponse> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Find or create user
      let user = await this.findByEmail(userEmail);
      if (!user) {
        user = await this.create({
          email: userEmail,
          name: userEmail.split('@')[0]
        });
      }

      // Update user level and XP
      if (data.achievements) {
        await this.update(user.id, {
          level: data.achievements.level,
          totalXp: data.achievements.totalXp
        });
      }

      // Save assessment sessions
      if (data.assessmentSessions) {
        for (const session of data.assessmentSessions) {
          await this.saveAssessmentSession(user.id, {
            sessionKey: session.id,
            techScore: session.results.tech,
            creativeScore: session.results.creative,
            businessScore: session.results.business,
            answers: session.answers,
            generatedPaths: session.generatedPaths
          });
        }
      }

      // Save badges
      if (data.achievements?.badges) {
        for (const badge of data.achievements.badges) {
          await this.addBadge(user.id, {
            badgeId: badge.id,
            name: badge.name,
            description: badge.description,
            imageUrl: badge.imageUrl,
            category: badge.category,
            xpReward: badge.xpReward
          });
        }
      }

      await client.query('COMMIT');
      
      // Return updated user data
      return await this.getUserData(userEmail) as UserDataResponse;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteUserData(userEmail: string): Promise<boolean> {
    const user = await this.findByEmail(userEmail);
    if (!user) {
      return false;
    }

    // Delete user (cascade will handle related data)
    return await this.delete(user.id);
  }
}