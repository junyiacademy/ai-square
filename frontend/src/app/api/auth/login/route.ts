import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAccessToken, createRefreshToken } from '@/lib/auth/jwt'
import { createSessionToken } from '@/lib/auth/session-simple'
import { getPool } from '@/lib/db/get-pool'
import { PostgreSQLUserRepository } from '@/lib/repositories/postgresql'
import { z } from 'zod'
import { getUserWithPassword } from '@/lib/auth/password-utils'
import { AuthManager } from '@/lib/auth/auth-manager'

// Input validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(', ')
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      )
    }

    const { email, password, rememberMe } = validationResult.data

    // Get database pool
    const pool = getPool()

    // Find user in database with password
    const user = await getUserWithPassword(pool, email.toLowerCase())
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash || '')
    
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Get user role (default to 'student')
    const userRole = user.role || 'student'

    // Get user repository for updating last active
    const userRepo = new PostgreSQLUserRepository(pool)

    // Create JWT tokens
    const accessToken = await createAccessToken({
      userId: 1, // TODO: Fix TokenPayload to use string for UUID
      email: user.email,
      role: userRole,
      name: user.name
    })
    
    const refreshToken = await createRefreshToken(user.id.toString(), rememberMe)
    
    // Create session token
    const sessionToken = createSessionToken(user.id, user.email, rememberMe)

    // Update last active
    try {
      await userRepo.updateLastActive(user.id)
    } catch {
      // Ignore error if column doesn't exist
      console.log('Warning: Could not update last active')
    }

    // Create response with tokens
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: userRole,
        preferredLanguage: user.preferredLanguage,
        emailVerified: user.emailVerified,
        onboardingCompleted: user.onboardingCompleted
      },
      accessToken,
      refreshToken,
      sessionToken
    })

    // Use centralized AuthManager for cookie management
    // This sets ONLY ONE cookie: sessionToken
    AuthManager.setAuthCookie(response, sessionToken, rememberMe)

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed'
      },
      { status: 500 }
    )
  }
}