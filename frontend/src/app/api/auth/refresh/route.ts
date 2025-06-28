import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyRefreshToken, createAccessToken } from '@/lib/auth/jwt'

// Mock user data - in production, this would come from a database
const MOCK_USERS = [
  {
    id: 1,
    email: 'student@example.com',
    role: 'student',
    name: 'Student User'
  },
  {
    id: 2,
    email: 'teacher@example.com',
    role: 'teacher',
    name: 'Teacher User'
  },
  {
    id: 3,
    email: 'admin@example.com',
    role: 'admin',
    name: 'Admin User'
  }
]

export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refreshToken')
    
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'No refresh token provided' },
        { status: 401 }
      )
    }
    
    // Verify refresh token
    const payload = await verifyRefreshToken(refreshToken.value)
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid refresh token' },
        { status: 401 }
      )
    }
    
    // Find user by ID
    const user = MOCK_USERS.find(u => u.id === payload.userId)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Create new access token
    const newAccessToken = await createAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    })
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Token refreshed successfully'
    })
    
    // Set new access token
    response.cookies.set('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15 // 15 minutes
    })
    
    // Update user cookie for backward compatibility
    response.cookies.set('user', JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
    
    return response
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}