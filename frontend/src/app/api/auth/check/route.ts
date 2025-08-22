import { NextRequest, NextResponse } from 'next/server'
import { AuthManager } from '@/lib/auth/auth-manager'

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
      // Handle URL-encoded tokens (cookies are often URL-encoded)
      const decodedToken = decodeURIComponent(sessionToken)
      const decoded = JSON.parse(atob(decodedToken))
      
      // For demo accounts, we can infer the role from email
      let role = 'user'
      let name = 'User'
      
      if (decoded.email === 'student@example.com') {
        role = 'student'
        name = 'Demo Student'
      } else if (decoded.email === 'teacher@example.com') {
        role = 'teacher'  
        name = 'Demo Teacher'
      } else if (decoded.email === 'admin@example.com') {
        role = 'admin'
        name = 'Demo Admin'
      }
      
      return NextResponse.json({
        authenticated: true,
        user: {
          id: decoded.userId,
          email: decoded.email,
          role: role,
          name: name
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