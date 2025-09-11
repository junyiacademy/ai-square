/**
 * PostgreSQL-based Session Storage
 * 
 * Persistent session storage using PostgreSQL
 * This replaces Redis/memory storage with database persistence
 */

import crypto from 'crypto';
import { Pool } from 'pg';

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: Date;
  expiresAt: Date;
}

// Session TTL in seconds
const DEFAULT_TTL = 24 * 60 * 60; // 24 hours
const REMEMBER_ME_TTL = 30 * 24 * 60 * 60; // 30 days

export class PostgresSession {
  private static pool: Pool | null = null;

  /**
   * Get database pool
   */
  private static async getPool(): Promise<Pool> {
    if (!this.pool) {
      const dbConfig: any = {
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

      // If no DATABASE_URL, use individual settings
      if (!dbConfig.connectionString) {
        dbConfig.host = process.env.DB_HOST || '127.0.0.1';
        dbConfig.port = parseInt(process.env.DB_PORT || '5432');
        dbConfig.database = process.env.DB_NAME || 'ai_square_db';
        dbConfig.user = process.env.DB_USER || 'postgres';
        dbConfig.password = process.env.DB_PASSWORD || 'postgres';
        delete dbConfig.connectionString;
      }

      this.pool = new Pool(dbConfig);
    }
    return this.pool;
  }

  /**
   * Generate a secure session token
   */
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new session
   */
  static async createSession(userData: {
    userId: string;
    email: string;
    role: string;
  }, rememberMe = false): Promise<string> {
    const token = this.generateToken();
    const now = new Date();
    const ttl = rememberMe ? REMEMBER_ME_TTL : DEFAULT_TTL;
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    try {
      const pool = await this.getPool();
      
      // Delete any existing sessions for this user (single session per user)
      await pool.query(
        'DELETE FROM sessions WHERE user_id = $1',
        [userData.userId]
      );

      // Insert new session
      await pool.query(
        `INSERT INTO sessions (token, user_id, email, role, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [token, userData.userId, userData.email, userData.role, now, expiresAt]
      );

      console.log('[PostgresSession] Session stored in database');
      return token;
    } catch (error) {
      console.error('[PostgresSession] Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Get session data from token
   */
  static async getSession(token: string): Promise<SessionData | null> {
    if (!token || !this.isValidTokenFormat(token)) {
      return null;
    }

    try {
      const pool = await this.getPool();
      
      // Get session and clean up expired ones
      const result = await pool.query(
        `SELECT user_id, email, role, created_at, expires_at 
         FROM sessions 
         WHERE token = $1 AND expires_at > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        userId: row.user_id,
        email: row.email,
        role: row.role,
        createdAt: row.created_at,
        expiresAt: row.expires_at
      };
    } catch (error) {
      console.error('[PostgresSession] Failed to get session:', error);
      return null;
    }
  }

  /**
   * Destroy a session
   */
  static async destroySession(token: string): Promise<void> {
    if (!token) return;

    try {
      const pool = await this.getPool();
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
      console.log('[PostgresSession] Session destroyed');
    } catch (error) {
      console.error('[PostgresSession] Failed to destroy session:', error);
    }
  }

  /**
   * Clean up expired sessions (can be called periodically)
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      const pool = await this.getPool();
      const result = await pool.query(
        'DELETE FROM sessions WHERE expires_at < NOW()'
      );
      if (result.rowCount && result.rowCount > 0) {
        console.log(`[PostgresSession] Cleaned up ${result.rowCount} expired sessions`);
      }
    } catch (error) {
      console.error('[PostgresSession] Failed to cleanup sessions:', error);
    }
  }

  /**
   * Validate token format
   */
  private static isValidTokenFormat(token: string): boolean {
    return /^[a-f0-9]{64}$/i.test(token);
  }

  /**
   * Close database connection
   */
  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}