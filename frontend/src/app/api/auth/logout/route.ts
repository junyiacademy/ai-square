import { NextResponse } from 'next/server'
import { AuthManager } from '@/lib/auth/auth-manager'

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  })

  // Use centralized AuthManager to clear auth cookie
  AuthManager.clearAuthCookies(response)
  
  // Also clear any legacy cookies that might exist
  // These can be removed after all users have logged out once
  response.cookies.set('accessToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })
  
  response.cookies.set('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })
  
  response.cookies.set('user', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })
  
  response.cookies.set('ai_square_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })

  return response
}

export async function GET() {
  // Support GET for convenience (e.g., logout links)
  return POST()
}