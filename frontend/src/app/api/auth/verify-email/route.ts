import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getPool } from '@/lib/db/get-pool';
import { updateUserEmailVerified } from '@/lib/auth/password-utils';
import { emailService } from '@/lib/email/email-service';
import { verificationTokens } from '@/lib/auth/verification-tokens';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Verification token is required' },
      { status: 400 }
    );
  }

  const tokenData = verificationTokens.get(token);
  
  if (!tokenData) {
    return NextResponse.json(
      { success: false, error: 'Invalid verification token' },
      { status: 400 }
    );
  }

  if (tokenData.expiresAt < new Date()) {
    verificationTokens.delete(token);
    return NextResponse.json(
      { success: false, error: 'Verification token has expired' },
      { status: 400 }
    );
  }

  try {
    const userRepo = repositoryFactory.getUserRepository();
    const user = await userRepo.findByEmail(tokenData.email);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user's email verification status directly in database
    const pool = getPool();
    await updateUserEmailVerified(pool, user.id);

    // Clean up token
    verificationTokens.delete(token);

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.name);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully!'
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}

// Support OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}