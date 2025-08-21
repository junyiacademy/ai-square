import { NextRequest, NextResponse } from 'next/server'
import { AuthManager } from '@/lib/auth/auth-manager'
import { verifyToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    // Use centralized AuthManager to check authentication
    const sessionToken = AuthManager.getSessionToken(request)
    
    if (!sessionToken) {
      return NextResponse.json({
        authenticated: false,
        user: null
      })
    }

    // Decode session token to get user info
    try {
      const decoded = JSON.parse(atob(sessionToken))
      
      return NextResponse.json({
        authenticated: true,
        user: {
          id: decoded.userId,
          email: decoded.email,
          // Other user data can be fetched from database if needed
        }
      })
    } catch {
      return NextResponse.json({
        authenticated: false,
        user: null
      })
    }
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({
      authenticated: false,
      user: null
    })
  }
}