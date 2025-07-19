/**
 * PostgreSQL User Repository
 * 處理所有用戶相關的資料庫操作
 */

import { Pool, PoolClient } from 'pg';
import {
  IUserRepository,
  User,
  CreateUserDto,
  UpdateUserDto,
  FindUsersOptions
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
    const values: any[] = [];
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
    return result.rowCount > 0;
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
}