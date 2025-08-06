import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { emailService } from '@/lib/email/email-service';
import { getPool } from '@/lib/db/get-pool';

// 驗證 schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

// 密碼重設 token 儲存（生產環境應使用 Redis 或資料庫）
const resetTokens = new Map<string, { email: string; expiresAt: Date }>();

// 產生重設 token
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 驗證輸入
    const validationResult = forgotPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // 查找用戶
    const userRepo = repositoryFactory.getUserRepository();
    const user = await userRepo.findByEmail(email.toLowerCase());

    // 為了安全，不論用戶是否存在都返回相同訊息
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.',
      });
    }

    // 產生重設 token
    const resetToken = generateResetToken();
    resetTokens.set(resetToken, {
      email: user.email,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 小時後過期
    });

    // 儲存 token 到資料庫（用於持久化）
    const pool = getPool();
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET token = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP`,
      [user.id, resetToken, new Date(Date.now() + 60 * 60 * 1000)]
    );

    // 發送重設密碼郵件
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    await emailService.sendPasswordResetEmail(user.email, resetUrl);

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.',
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process password reset request.' },
      { status: 500 }
    );
  }
}

// 驗證重設 token
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Token is required' },
      { status: 400 }
    );
  }

  try {
    // 檢查記憶體中的 token
    const tokenData = resetTokens.get(token);
    
    if (!tokenData) {
      // 從資料庫查找
      const pool = getPool();
      const { rows } = await pool.query(
        `SELECT u.email, prt.expires_at 
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE prt.token = $1 AND prt.expires_at > CURRENT_TIMESTAMP`,
        [token]
      );

      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired token' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        email: rows[0].email,
      });
    }

    if (tokenData.expiresAt < new Date()) {
      resetTokens.delete(token);
      return NextResponse.json(
        { success: false, error: 'Token has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      email: tokenData.email,
    });

  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}