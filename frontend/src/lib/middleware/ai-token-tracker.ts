/**
 * Per-User AI Token Budget Tracker
 *
 * Tracks each user's daily AI token usage stored in users.metadata JSON column.
 * Structure: { aiUsage: { date: "YYYY-MM-DD", tokensUsed: number, sessionsStarted: number } }
 *
 * Resets daily based on date comparison.
 */

import { getPool } from "@/lib/db/get-pool";

// Daily limits
export const DAILY_TOKEN_LIMIT = 200_000;
export const DAILY_SESSION_LIMIT = 5;

export interface UserAiUsage {
  date: string;
  tokensUsed: number;
  sessionsStarted: number;
}

export interface BudgetStatus {
  tokensUsed: number;
  tokensLimit: number;
  tokensRemaining: number;
  sessionsStarted: number;
  sessionsLimit: number;
  sessionsRemaining: number;
  resetAt: string;
  hasTokenBudget: boolean;
  hasSessionBudget: boolean;
}

/**
 * Get today's date string in YYYY-MM-DD format (UTC)
 */
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get reset time for next UTC midnight as ISO string
 */
function getResetAtTime(): string {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return tomorrow.toISOString();
}

/**
 * Fetch the current aiUsage from users.metadata for a given user.
 * Returns a fresh/reset record if the stored date differs from today.
 */
export async function getUserAiUsage(userId: string): Promise<UserAiUsage> {
  const pool = getPool();
  const today = getTodayDate();

  const { rows } = await pool.query(
    `SELECT metadata FROM users WHERE id = $1`,
    [userId]
  );

  if (rows.length === 0) {
    return { date: today, tokensUsed: 0, sessionsStarted: 0 };
  }

  const metadata = (rows[0].metadata as Record<string, unknown>) || {};
  const stored = metadata.aiUsage as UserAiUsage | undefined;

  // Reset if a new day
  if (!stored || stored.date !== today) {
    return { date: today, tokensUsed: 0, sessionsStarted: 0 };
  }

  return stored;
}

/**
 * Get budget status for a user.
 */
export async function getBudgetStatus(userId: string): Promise<BudgetStatus> {
  const usage = await getUserAiUsage(userId);
  const tokensRemaining = Math.max(0, DAILY_TOKEN_LIMIT - usage.tokensUsed);
  const sessionsRemaining = Math.max(
    0,
    DAILY_SESSION_LIMIT - usage.sessionsStarted
  );

  return {
    tokensUsed: usage.tokensUsed,
    tokensLimit: DAILY_TOKEN_LIMIT,
    tokensRemaining,
    sessionsStarted: usage.sessionsStarted,
    sessionsLimit: DAILY_SESSION_LIMIT,
    sessionsRemaining,
    resetAt: getResetAtTime(),
    hasTokenBudget: tokensRemaining > 0,
    hasSessionBudget: sessionsRemaining > 0,
  };
}

/**
 * Increment token usage for a user after an AI call.
 * Uses a simple read-modify-write with optimistic concurrency (no row lock needed
 * for approximate tracking).
 */
export async function recordTokenUsage(
  userId: string,
  tokensUsed: number
): Promise<void> {
  if (tokensUsed <= 0) return;

  const pool = getPool();
  const today = getTodayDate();

  // Atomic update using jsonb merge — reset if date changed
  await pool.query(
    `UPDATE users
     SET metadata = jsonb_set(
       COALESCE(metadata, '{}'::jsonb),
       '{aiUsage}',
       CASE
         WHEN (metadata->'aiUsage'->>'date') = $2
         THEN jsonb_build_object(
           'date', $2::text,
           'tokensUsed', COALESCE((metadata->'aiUsage'->>'tokensUsed')::int, 0) + $3,
           'sessionsStarted', COALESCE((metadata->'aiUsage'->>'sessionsStarted')::int, 0)
         )
         ELSE jsonb_build_object(
           'date', $2::text,
           'tokensUsed', $3::int,
           'sessionsStarted', 0
         )
       END
     ),
     updated_at = NOW()
     WHERE id = $1`,
    [userId, today, tokensUsed]
  );
}

/**
 * Increment session count for a user when a new Discovery program is started.
 * Returns false if the daily session limit has been exceeded.
 */
export async function checkAndIncrementSession(
  userId: string
): Promise<{ allowed: boolean; sessionsRemaining: number }> {
  const pool = getPool();
  const today = getTodayDate();

  // Use a transaction to avoid race conditions
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT metadata FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return { allowed: true, sessionsRemaining: DAILY_SESSION_LIMIT - 1 };
    }

    const metadata = (rows[0].metadata as Record<string, unknown>) || {};
    const stored = metadata.aiUsage as UserAiUsage | undefined;

    let current: UserAiUsage;
    if (!stored || stored.date !== today) {
      current = { date: today, tokensUsed: 0, sessionsStarted: 0 };
    } else {
      current = stored;
    }

    if (current.sessionsStarted >= DAILY_SESSION_LIMIT) {
      await client.query("ROLLBACK");
      return { allowed: false, sessionsRemaining: 0 };
    }

    const updated: UserAiUsage = {
      ...current,
      sessionsStarted: current.sessionsStarted + 1,
    };

    await client.query(
      `UPDATE users
       SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{aiUsage}', $2::jsonb),
           updated_at = NOW()
       WHERE id = $1`,
      [userId, JSON.stringify(updated)]
    );

    await client.query("COMMIT");
    return {
      allowed: true,
      sessionsRemaining: DAILY_SESSION_LIMIT - updated.sessionsStarted,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Check if user has remaining token budget without modifying anything.
 */
export async function hasTokenBudget(userId: string): Promise<boolean> {
  const usage = await getUserAiUsage(userId);
  return usage.tokensUsed < DAILY_TOKEN_LIMIT;
}
