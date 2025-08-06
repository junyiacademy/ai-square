import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { z } from 'zod';
import { getPool } from '@/lib/db/get-pool';
import { updateUserPasswordHash, getUserWithPassword } from '@/lib/auth/password-utils';

// 更新個人資料 schema
const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  preferredLanguage: z.enum(['en', 'zhTW', 'zhCN', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'ru', 'ar', 'hi', 'id', 'it']).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

// GET 取得個人資料
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userRepo = repositoryFactory.getUserRepository();
    const user = await userRepo.findById(session.user.id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        preferredLanguage: user.preferredLanguage || 'en',
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}

// PATCH 更新個人資料
export async function PATCH(request: NextRequest) {
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
    const validationResult = updateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, preferredLanguage, currentPassword, newPassword } = validationResult.data;
    const userRepo = repositoryFactory.getUserRepository();

    // 如果要更改密碼，先驗證當前密碼
    if (newPassword && currentPassword) {
      const pool = getPool();
      const userWithPassword = await getUserWithPassword(pool, session.user.email);
      
      if (!userWithPassword || !userWithPassword.passwordHash) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      const bcrypt = await import('bcryptjs');
      const isValidPassword = await bcrypt.compare(currentPassword, userWithPassword.passwordHash);
      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 400 }
        );
      }
    }

    // 準備更新資料
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (preferredLanguage !== undefined) updates.preferredLanguage = preferredLanguage;

    // 更新用戶資料
    const updatedUser = await userRepo.update(session.user.id, updates);
    
    // 如果需要更新密碼，單獨處理
    if (newPassword) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await updateUserPasswordHash(getPool(), session.user.id, hashedPassword, updatedUser.role);
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        preferredLanguage: updatedUser.preferredLanguage,
        emailVerified: updatedUser.emailVerified,
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}