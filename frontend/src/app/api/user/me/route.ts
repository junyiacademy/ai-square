import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SecureSession } from '@/lib/auth/secure-session'
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

export async function GET() {
  try {
    const cookieStore = await cookies()
    
    // Check for session token in cookies
    const sessionToken = cookieStore.get('sessionToken')?.value
    
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Verify the session
    const sessionData = SecureSession.getSession(sessionToken)
    
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      )
    }
    
    // Get user from database
    const repository = getUserRepository()
    const user = await repository.findById(sessionData.userId)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Format response data
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      preferredLanguage: user.preferredLanguage,
      level: user.level,
      totalXp: user.totalXp,
      learningPreferences: user.learningPreferences,
      onboardingCompleted: user.onboardingCompleted,
      emailVerified: user.emailVerified,
      role: user.role || 'student',
      createdAt: user.createdAt.toISOString(),
      lastActiveAt: user.lastActiveAt?.toISOString()
    }
    
    return NextResponse.json({
      success: true,
      user: userData
    })
  } catch (error) {
    console.error('Error fetching user data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user data' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}