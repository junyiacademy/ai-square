import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { emailService } from '@/lib/email/email-service';
import { getSession } from '@/lib/auth/session';
import { getPool } from '@/lib/db/get-pool';

// 驗證 schema
const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 驗證輸入
    const validationResult = resendVerificationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    let email: string;
    let userId: string;

    // 優先從 session 獲取用戶資訊
    const session = await getSession();
    if (session && session.user) {
      email = session.user.email;
      userId = session.user.id;
    } else if (validationResult.data.email) {
      // 如果沒有 session，使用提供的 email
      email = validationResult.data.email.toLowerCase();
      
      // 查找用戶
      const userRepo = repositoryFactory.getUserRepository();
      const user = await userRepo.findByEmail(email);
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }
      
      userId = user.id;
      
      // 檢查是否已驗證
      if (user.emailVerified) {
        return NextResponse.json(
          { success: false, error: 'Email is already verified' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Email is required when not logged in' },
        { status: 400 }
      );
    }

    // 產生新的驗證 token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // 儲存驗證 token 到資料庫
    const pool = getPool();
    await pool.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET token = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP`,
      [userId, verificationToken, new Date(Date.now() + 24 * 60 * 60 * 1000)] // 24 小時後過期
    );

    // 發送驗證郵件
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    await emailService.sendVerificationEmail(email, verificationUrl);

    return NextResponse.json({
      success: true,
      message: 'Verification email has been sent',
      email: email,
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}