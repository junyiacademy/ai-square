import { Pool } from "pg";

/**
 * Update user password hash in database
 * This is a utility function to avoid accessing repository internals
 */
export async function updateUserPasswordHash(
  pool: Pool,
  userId: string,
  passwordHash: string,
  role: string = "student",
): Promise<void> {
  const query = `
    UPDATE users
    SET password_hash = $1, role = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
  `;

  await pool.query(query, [passwordHash, role, userId]);
}

/**
 * Update user email verification status
 */
export async function updateUserEmailVerified(
  pool: Pool,
  userId: string,
): Promise<void> {
  const query = `
    UPDATE users
    SET email_verified = true, email_verified_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `;

  await pool.query(query, [userId]);
}

/**
 * Get user with password hash for authentication
 */
export async function getUserWithPassword(
  pool: Pool,
  email: string,
): Promise<{
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  role: string | null;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  preferredLanguage: string;
  metadata: Record<string, unknown>;
} | null> {
  const query = `
    SELECT
      id, email, name, password_hash as "passwordHash",
      role, email_verified as "emailVerified",
      onboarding_completed as "onboardingCompleted",
      preferred_language as "preferredLanguage",
      metadata
    FROM users
    WHERE LOWER(email) = LOWER($1)
  `;

  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
}
