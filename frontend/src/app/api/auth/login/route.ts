import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAccessToken, createRefreshToken } from '@/lib/auth/jwt'
import { createSessionToken } from '@/lib/auth/session-simple'
import { getPool } from '@/lib/db/get-pool'
import { PostgreSQLUserRepository } from '@/lib/repositories/postgresql'
import { z } from 'zod'
import { getUserWithPassword, updateUserPasswordHash } from '@/lib/auth/password-utils'

// Lazy initialize repository
let userRepo: PostgreSQLUserRepository | null = null

function getUserRepository() {
  if (!userRepo) {
    const pool = getPool()
    userRepo = new PostgreSQLUserRepository(pool)
  }
  return userRepo
}

// Input validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
})

// Legacy mock users for backward compatibility (will be removed after migration)
const MOCK_USERS = [
  {
    email: 'student@example.com',
    password: 'student123',
    name: 'Student User',
    role: 'student',
  },
  {
    email: 'teacher@example.com',
    password: 'teacher123',
    name: 'Teacher User',
    role: 'teacher',
  },
  {
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
  },
  {
    email: 'test@example.com',
    password: 'test123',
    name: 'Test User',
    role: 'student',
  }
]

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
      // Get user repository for fallback
      const userRepo = getUserRepository()
      // Check against legacy mock users for backward compatibility
      const mockUser = MOCK_USERS.find(u => u.email === email && u.password === password)
      
      if (mockUser) {
        // Create user if it's a mock user (for testing purposes)
        const newUser = await userRepo.create({
          email: mockUser.email,
          name: mockUser.name,
          preferredLanguage: 'en'
        })
        
        // Store password hash and role directly in database columns
        await updateUserPasswordHash(pool, newUser.id, await bcrypt.hash(mockUser.password, 10), mockUser.role)
        
        // Create JWT tokens
        const accessToken = await createAccessToken({
          userId: 1, // TODO: Fix TokenPayload to use string for UUID
          email: newUser.email,
          role: mockUser.role,
          name: newUser.name || mockUser.name
        })
        
        const refreshToken = await createRefreshToken(newUser.id.toString(), rememberMe)
        const sessionToken = createSessionToken(newUser.id, newUser.email, rememberMe)

        // Update last active
        await userRepo.updateLastActive(newUser.id)

        // Create response with tokens
        const response = NextResponse.json({
          success: true,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: mockUser.role,
            preferredLanguage: newUser.preferredLanguage
          },
          accessToken,
          refreshToken,
          sessionToken
        })

        // Set HTTP-only secure cookies
        response.cookies.set('ai_square_session', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 30 days if remember me, else 7 days
          path: '/'
        })

        // Set cookies that middleware expects for mock users
        response.cookies.set('isLoggedIn', 'true', {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
          path: '/'
        })

        response.cookies.set('user', JSON.stringify({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: mockUser.role,
          preferredLanguage: newUser.preferredLanguage
        }), {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
          path: '/'
        })

        response.cookies.set('ai_square_refresh', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: rememberMe ? 90 * 24 * 60 * 60 : 30 * 24 * 60 * 60, // 90 days if remember me, else 30 days
          path: '/'
        })

        return response
      }
      
      // User not found
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password with bcrypt
    const passwordHash = user.passwordHash
    
    if (!passwordHash) {
      // No password set (shouldn't happen in production)
      return NextResponse.json(
        { success: false, error: 'Account not properly configured. Please reset your password.' },
        { status: 401 }
      )
    }

    const isValidPassword = await bcrypt.compare(password, passwordHash)
    
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if email is verified
    if (!user.emailVerified) {
      // Allow login but remind user to verify email
      console.log('⚠️ User logged in with unverified email:', email)
    }

    // Get user role (default to 'student')
    const userRole = user.role || 'student'

    // Get user repository for updating last active
    const userRepo = getUserRepository()

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

    // Update last active - commented out for production compatibility
    // TODO: Fix schema mismatch between environments
    try {
      await userRepo.updateLastActive(user.id)
    } catch {
      // Ignore error if column doesn't exist
      console.log('Warning: Could not update last active (schema mismatch)')
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

    // Set the main session token (ONLY ONE COOKIE FOR AUTH)
    response.cookies.set('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 days if remember me, else 24 hours
      path: '/'
    })
    
    // Keep ai_square_session for backward compatibility (will remove later)
    response.cookies.set('ai_square_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
      path: '/'
    })
    
    // Keep user info cookie for client-side access (not for auth)
    response.cookies.set('user', JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      role: userRole,
      preferredLanguage: user.preferredLanguage
    }), {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
      path: '/'
    })
    
    response.cookies.set('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
      path: '/'
    })

    response.cookies.set('ai_square_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 90 * 24 * 60 * 60 : 30 * 24 * 60 * 60, // 90 days if remember me, else 30 days
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    
    return NextResponse.json(
      { success: false, error: 'An error occurred during login. Please try again.' },
      { status: 500 }
    )
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
  })
}