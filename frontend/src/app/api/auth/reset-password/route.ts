import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db/get-pool';
import { updateUserPasswordHash } from '@/lib/auth/password-utils';

// 重設密碼 schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 驗證輸入
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { token, password } = validationResult.data;
    const pool = getPool();

    // 查找有效的 token
    const { rows } = await pool.query(
      `SELECT prt.user_id, u.email, u.role
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 
       AND prt.expires_at > CURRENT_TIMESTAMP 
       AND prt.used_at IS NULL`,
      [token]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    const { user_id, email, role } = rows[0];

    // Hash 新密碼
    const hashedPassword = await bcrypt.hash(password, 10);

    // 開始交易
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 更新密碼
      await updateUserPasswordHash(pool, user_id, hashedPassword, role);

      // 標記 token 為已使用
      await client.query(
        'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = $1',
        [token]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Password has been reset successfully',
        email: email,
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}