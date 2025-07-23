import { NextRequest, NextResponse } from 'next/server'
import { createAccessToken, createRefreshToken } from '@/lib/auth/jwt'
import { createSessionToken } from '@/lib/auth/session-simple'
import { Pool } from 'pg'
import { PostgreSQLUserRepository } from '@/lib/repositories/postgresql'

// Lazy initialize database connection
let pool: Pool | null = null
let userRepo: PostgreSQLUserRepository | null = null

function getDbConnection() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    })
    userRepo = new PostgreSQLUserRepository(pool)
  }
  return { pool, userRepo: userRepo! }
}

// Mock users for testing (in production, these would be in the database with hashed passwords)
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
    password: 'password123',
    name: 'Test User',
    role: 'student',
  }
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, rememberMe = false } = body

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // For testing purposes, check against mock users
    // In production, this would query the database and verify hashed passwords
    const mockUser = MOCK_USERS.find(u => u.email === email && u.password === password)
    
    if (!mockUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Get database connection
    const { userRepo } = getDbConnection()

    // Try to find or create user in database
    let user = await userRepo.findByEmail(email)
    
    if (!user) {
      // Create user if doesn't exist (for testing purposes)
      user = await userRepo.create({
        email: mockUser.email,
        name: mockUser.name,
        preferredLanguage: 'en'
      })
    }

    // Create JWT tokens
    const userId = parseInt(user.id, 10)
    const accessToken = await createAccessToken({
      userId,
      email: user.email,
      role: mockUser.role,
      name: user.name || mockUser.name
    })
    
    const refreshToken = await createRefreshToken(userId, rememberMe)
    
    // Create session token
    const sessionToken = createSessionToken(user.id, user.email)

    // Update last active
    await userRepo.updateLastActive(user.id)

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: userId,
        email: user.email,
        name: user.name,
        role: mockUser.role
      }
    })

    // Set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }

    response.cookies.set('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60, // 1 hour
    })

    response.cookies.set('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7, // 30 days or 7 days
    })

    response.cookies.set('sessionToken', sessionToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24, // 24 hours
    })

    return response
  } catch (error) {
    console.error('Login API error:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Support OPTIONS request (CORS)
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