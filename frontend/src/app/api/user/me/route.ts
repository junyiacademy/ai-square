import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { getPool } from '@/lib/db/get-pool'
import { PostgreSQLUserRepository } from '@/lib/repositories/postgresql'

// Lazy initialize repository
let userRepo: PostgreSQLUserRepository | null = null

function getUserRepository() {
  if (!userRepo) {
    const pool = getPool()
    userRepo = new PostgreSQLUserRepository(pool)
  }
  return userRepo
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // Check Authorization header first (for API calls)
    const authHeader = request.headers.get('Authorization')
    const headerToken = authHeader?.replace('Bearer ', '')
    
    // Then check for access token in cookies
    const accessToken = cookieStore.get('accessToken')
    
    // Determine which token to use (header takes precedence)
    const tokenToVerify = headerToken || accessToken?.value
    
    if (!tokenToVerify) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Verify the token
    const payload = await verifyAccessToken(tokenToVerify)
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }
    
    // Get user from database
    const userRepo = getUserRepository()
    const user = await userRepo.findByEmail(payload.email)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        emailVerified: user.emailVerified,
        onboardingCompleted: user.onboardingCompleted,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })
    
  } catch (error) {
    console.error('Error in /api/user/me:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Support PUT for updating user profile
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // Check Authorization header first
    const authHeader = request.headers.get('Authorization')
    const headerToken = authHeader?.replace('Bearer ', '')
    
    // Then check for access token in cookies
    const accessToken = cookieStore.get('accessToken')
    
    // Determine which token to use
    const tokenToVerify = headerToken || accessToken?.value
    
    if (!tokenToVerify) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const payload = await verifyAccessToken(tokenToVerify)
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { name, preferredLanguage } = body
    
    // Get user repository
    const userRepo = getUserRepository()
    
    // Update user profile
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (preferredLanguage !== undefined) updates.preferredLanguage = preferredLanguage
    
    // Find user first
    const user = await userRepo.findByEmail(payload.email)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Update user
    await userRepo.update(user.id, updates)
    
    // Get updated user
    const updatedUser = await userRepo.findById(user.id)
    
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve updated user' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        preferredLanguage: updatedUser.preferredLanguage,
        emailVerified: updatedUser.emailVerified,
        onboardingCompleted: updatedUser.onboardingCompleted,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    })
    
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}