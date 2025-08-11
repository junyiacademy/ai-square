import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { z } from 'zod';
import crypto from 'crypto';
import { getPool } from '@/lib/db/get-pool';
import { updateUserPasswordHash } from '@/lib/auth/password-utils';
import { verificationTokens } from '@/lib/auth/verification-tokens';

// Input validation schema
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  preferredLanguage: z.string().optional().default('en'),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions')
});

// Generate verification token
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

import { emailService } from '@/lib/email/email-service';

// Send verification email
async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  
  console.log(`📧 Sending verification email to ${email}`);
  
  // 使用 email service 發送真實郵件
  const sent = await emailService.sendVerificationEmail(email, verificationUrl);
  
  if (!sent) {
    console.warn('⚠️ Failed to send verification email, but registration continues');
    console.log(`🔗 Verification URL (for manual access): ${verificationUrl}`);
  }
  
  return sent;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const { email, password, name, preferredLanguage } = validationResult.data;

    // Get user repository
    const userRepo = repositoryFactory.getUserRepository();
    
    // Check if user already exists
    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in database
    const newUser = await userRepo.create({
      email: email.toLowerCase(),
      name,
      preferredLanguage,
      learningPreferences: {
        goals: [],
        interests: [],
        learningStyle: 'visual'
      }
    });

    // Update user with password hash in the proper column
    const pool = getPool();
    await updateUserPasswordHash(pool, newUser.id, hashedPassword, 'student');

    // Generate email verification token
    const verificationToken = generateVerificationToken();
    verificationTokens.set(verificationToken, {
      email: newUser.email,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    // Send verification email
    await sendVerificationEmail(newUser.email, verificationToken);

    // Create session (simplified - in production use proper session management)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Set secure cookie
    const response = NextResponse.json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        preferredLanguage: newUser.preferredLanguage,
        emailVerified: false
      },
      sessionToken // For client-side storage if needed
    });

    // Set HTTP-only secure cookie
    response.cookies.set('ai_square_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Registration error:', error);
    
    // Check for specific database errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        return NextResponse.json(
          { success: false, error: 'This email is already registered' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again later.' },
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}