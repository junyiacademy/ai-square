import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPool } from '@/lib/db/get-pool';
import { z } from 'zod';

// 帳號封存 schema
const archiveAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  reason: z.string().optional(),
  confirmArchive: z.boolean()
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // 驗證輸入
    const validationResult = archiveAccountSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { password, reason, confirmArchive } = validationResult.data;

    if (!confirmArchive) {
      return NextResponse.json(
        { success: false, error: 'Please confirm account archival' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // 驗證密碼
    const { getUserWithPassword } = await import('@/lib/auth/password-utils');
    const userWithPassword = await getUserWithPassword(pool, session.user.email);
    
    if (!userWithPassword || !userWithPassword.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const bcrypt = await import('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, userWithPassword.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 400 }
      );
    }

    // 更新用戶狀態為已封存
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 封存帳號
      await client.query(
        `UPDATE users 
         SET account_status = 'archived',
             archived_at = CURRENT_TIMESTAMP,
             archive_reason = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [reason || 'User requested account deletion', session.user.id]
      );

      // 記錄此操作（審計日誌）
      await client.query(
        `INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [
          session.user.id,
          'account_archived',
          JSON.stringify({ reason }),
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          request.headers.get('user-agent')
        ]
      );

      await client.query('COMMIT');

      // 清除 session
      const response = NextResponse.json({
        success: true,
        message: 'Your account has been successfully deleted. We\'re sorry to see you go.'
      });

      // 清除所有認證相關的 cookies
      response.cookies.delete('session_token');
      response.cookies.delete('ai_square_session');
      response.cookies.delete('isLoggedIn');
      response.cookies.delete('sessionToken');
      response.cookies.delete('accessToken');
      response.cookies.delete('ai_square_refresh');

      return response;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Archive account error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}

// GET - 檢查帳號狀態
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT account_status, archived_at, archive_reason FROM users WHERE id = $1',
      [session.user.id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      accountStatus: rows[0].account_status,
      archivedAt: rows[0].archived_at,
      archiveReason: rows[0].archive_reason
    });

  } catch (error) {
    console.error('Get account status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get account status' },
      { status: 500 }
    );
  }
}