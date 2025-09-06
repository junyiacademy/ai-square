import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { AuthManager } from '@/lib/auth/auth-manager';
import { SecureSession } from '@/lib/auth/secure-session';
import type { UserWithPassword } from '@/lib/repositories/interfaces/user-with-password';

// Input validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password format' },
        { status: 400 }
      );
    }

    const { email, password, rememberMe = false } = validationResult.data;

    // Get user repository
    const userRepo = repositoryFactory.getUserRepository();
    
    // Find user by email (with password hash)
    const user = await userRepo.findByEmail(email) as UserWithPassword | null;
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash || '');
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create secure session using Redis-backed storage
    const sessionToken = await SecureSession.createSessionAsync({
      userId: user.id,
      email: user.email,
      role: user.role || 'student'
    }, rememberMe);

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        emailVerified: !!user.emailVerifiedAt
      }
    });

    // Set secure httpOnly cookie
    AuthManager.setAuthCookie(response, sessionToken, rememberMe);

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}