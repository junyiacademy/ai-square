/**
 * Simple and Reliable Authentication System
 *
 * ONE SOURCE OF TRUTH: PostgreSQL
 * - No Redis, no memory fallback, no complexity
 * - Sessions stored directly in PostgreSQL
 * - Dev mode auto-login for better DX
 */

import crypto from "crypto";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  name: string;
  createdAt: Date;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
  isGuest?: boolean;
}

// Singleton pool
let pool: Pool | null = null;

/**
 * Get database pool (singleton)
 */
export function getPool(): Pool {
  if (!pool) {
    const dbConfig: {
      connectionString?: string;
      max: number;
      idleTimeoutMillis: number;
      connectionTimeoutMillis: number;
      host?: string;
      port?: number;
      database?: string;
      user?: string;
      password?: string;
    } = {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    // If no DATABASE_URL, use individual settings
    if (!dbConfig.connectionString) {
      dbConfig.host = process.env.DB_HOST || "127.0.0.1";
      dbConfig.port = parseInt(process.env.DB_PORT || "5432");
      dbConfig.database = process.env.DB_NAME || "ai_square_db";
      dbConfig.user = process.env.DB_USER || "postgres";
      dbConfig.password = process.env.DB_PASSWORD || "postgres";
      delete dbConfig.connectionString;
    }

    pool = new Pool(dbConfig);
  }
  return pool;
}

/**
 * Generate secure token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create session in database
 */
export async function createSession(
  userData: {
    userId: string;
    email: string;
    role: string;
    name: string;
  },
  rememberMe = false,
): Promise<string> {
  const token = generateToken();
  const now = new Date();
  // 30 days for remember me, 7 days default (better dev experience)
  const ttl = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
  const expiresAt = new Date(now.getTime() + ttl * 1000);

  const db = getPool();

  try {
    // Delete old sessions for this user
    await db.query("DELETE FROM sessions WHERE user_id = $1", [
      userData.userId,
    ]);

    // Create new session
    await db.query(
      `INSERT INTO sessions (token, user_id, email, role, created_at, expires_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        token,
        userData.userId,
        userData.email,
        userData.role,
        now,
        expiresAt,
        JSON.stringify({ name: userData.name }),
      ],
    );

    // Update last_login_at for user
    try {
      await db.query(
        "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1",
        [userData.userId],
      );
    } catch (updateError) {
      // Log but don't fail - last_login_at is tracking data, not critical
      console.warn("Failed to update last_login_at:", updateError);
    }

    console.log("[Auth] Session created in PostgreSQL");
    return token;
  } catch (error) {
    console.error("[Auth] Failed to create session:", error);
    throw error;
  }
}

/**
 * Get session from database
 */
export async function getSession(token: string): Promise<SessionData | null> {
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    return null;
  }

  const db = getPool();

  try {
    const result = await db.query(
      `SELECT user_id, email, role, created_at, expires_at, metadata
       FROM sessions
       WHERE token = $1 AND expires_at > NOW()`,
      [token],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const metadata = row.metadata || {};

    return {
      userId: row.user_id,
      email: row.email,
      role: row.role,
      name: metadata.name || row.email.split("@")[0],
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      metadata,
      isGuest: metadata.isGuest || false,
    };
  } catch (error) {
    console.error("[Auth] Failed to get session:", error);
    return null;
  }
}

/**
 * Destroy session
 */
export async function destroySession(token: string): Promise<void> {
  if (!token) return;

  const db = getPool();

  try {
    await db.query("DELETE FROM sessions WHERE token = $1", [token]);
    console.log("[Auth] Session destroyed");
  } catch (error) {
    console.error("[Auth] Failed to destroy session:", error);
  }
}

/**
 * Login user
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<{
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  token?: string;
  error?: string;
}> {
  const db = getPool();

  try {
    // Get user
    const result = await db.query(
      "SELECT id, email, name, role, password_hash FROM users WHERE LOWER(email) = LOWER($1)",
      [email],
    );

    if (result.rows.length === 0) {
      return { success: false, error: "Invalid credentials" };
    }

    const user = result.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return { success: false, error: "Invalid credentials" };
    }

    // Create session
    const token = await createSession(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      true,
    ); // Always remember for better DX

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    };
  } catch (error) {
    console.error("[Auth] Login error:", error);
    return { success: false, error: "Login failed" };
  }
}

/**
 * Dev mode auto-login
 */
export async function autoLoginDev(): Promise<{
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  token?: string;
}> {
  if (process.env.NODE_ENV !== "development") {
    return { success: false };
  }

  const db = getPool();

  try {
    // Get first user (or specific dev user)
    const result = await db.query(
      `SELECT id, email, name, role FROM users
       WHERE email = 'student@example.com'
       OR email = 'test@example.com'
       LIMIT 1`,
    );

    if (result.rows.length === 0) {
      console.log("[Auth] No dev user found for auto-login");
      return { success: false };
    }

    const user = result.rows[0];

    // Create session
    const token = await createSession(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      true,
    );

    console.log("[Auth] Auto-login successful:", user.email);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    };
  } catch (error) {
    console.error("[Auth] Auto-login error:", error);
    return { success: false };
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupSessions(): Promise<void> {
  const db = getPool();

  try {
    const result = await db.query(
      "DELETE FROM sessions WHERE expires_at < NOW()",
    );
    if (result.rowCount && result.rowCount > 0) {
      console.log(`[Auth] Cleaned up ${result.rowCount} expired sessions`);
    }
  } catch (error) {
    console.error("[Auth] Cleanup error:", error);
  }
}
