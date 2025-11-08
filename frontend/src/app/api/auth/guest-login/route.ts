/**
 * Guest Login API
 * Allows users to create temporary guest accounts without registration
 *
 * POST /api/auth/guest-login
 * Body: { nickname?: string }
 *
 * Features:
 * - Auto-generates unique guest email
 * - Creates user with student role
 * - Auto-verifies email (no verification required)
 * - Sets sessionToken cookie
 * - Returns user data
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/auth/simple-auth';

/**
 * Generate unique guest email
 * Format: guest-{timestamp}-{random}@temp.ai-square.com
 */
function generateGuestEmail(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(3).toString('hex'); // 6 hex characters
  return `guest-${timestamp}-${random}@temp.ai-square.com`;
}

/**
 * Generate random password for guest (user never sees this)
 * 64-character hex string for maximum entropy
 */
function generateGuestPassword(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get guest display name
 * Uses provided nickname or defaults to "訪客用戶"
 */
function getGuestName(nickname?: string): string {
  const trimmed = nickname?.trim();
  return trimmed || '訪客用戶';
}

/**
 * Create guest user in database
 * Uses metadata JSONB field to store isGuest flag (no schema migration needed)
 */
async function createGuestUser(email: string, name: string, passwordHash: string) {
  const db = getPool();

  const result = await db.query(
    `INSERT INTO users (
      id, email, password_hash, name, role, metadata, email_verified, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, 'student', $4, true, NOW(), NOW()
    ) RETURNING id, email, name, role, metadata, email_verified`,
    [email, passwordHash, name, JSON.stringify({ isGuest: true })]
  );

  return result.rows[0];
}

/**
 * Create session for guest user
 */
async function createGuestSession(userId: string, email: string, name: string): Promise<string> {
  const db = getPool();
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.query(
    `INSERT INTO sessions (
      token, user_id, email, role, expires_at, created_at, metadata
    ) VALUES (
      $1, $2, $3, 'student', $4, NOW(), $5
    )`,
    [sessionToken, userId, email, expiresAt, JSON.stringify({ name, isGuest: true })]
  );

  return sessionToken;
}

/**
 * POST /api/auth/guest-login
 * Create guest account and auto-login
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body (nickname is optional)
    let body: { nickname?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is OK
    }

    const { nickname } = body;

    // Generate guest credentials
    const email = generateGuestEmail();
    const password = generateGuestPassword();
    const passwordHash = await bcrypt.hash(password, 10);
    const name = getGuestName(nickname);

    // Create guest user
    const user = await createGuestUser(email, name, passwordHash);

    // Create session
    const sessionToken = await createGuestSession(user.id, user.email, user.name);

    // Create response
    // Note: PostgreSQL returns JSONB as object, but parse for safety
    const metadata = typeof user.metadata === 'string'
      ? JSON.parse(user.metadata)
      : user.metadata;

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isGuest: metadata?.isGuest || false,
      },
    });

    // Set session cookie (7 days)
    response.cookies.set('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Guest Login] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create guest account',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
