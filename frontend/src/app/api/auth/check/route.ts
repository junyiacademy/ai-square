import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken, isTokenExpiringSoon } from '@/lib/auth/jwt'

export async function GET() {
  const cookieStore = await cookies()
  
  // Development mode: Skip strict JWT verification
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // In development, skip JWT entirely and use legacy cookies
  if (!isDevelopment) {
    // Production mode: Use JWT access token
    const accessToken = cookieStore.get('accessToken')
    
    if (accessToken) {
      const payload = await verifyAccessToken(accessToken.value)
      
      if (payload) {
        const expiresIn = payload.exp - Math.floor(Date.now() / 1000) // 秒數
        return NextResponse.json({
          authenticated: true,
          user: {
            id: payload.userId,
            email: payload.email,
            role: payload.role,
            name: payload.name
          },
          tokenExpiringSoon: isTokenExpiringSoon(payload.exp),
          expiresIn: expiresIn > 0 ? expiresIn : 0
        })
      }
    }
  }
  
  // Fallback to legacy cookie check (primary method in development)
  const isLoggedIn = cookieStore.get('isLoggedIn')
  const userRole = cookieStore.get('userRole')
  const userCookie = cookieStore.get('user')
  
  if (isLoggedIn?.value === 'true' && userCookie?.value) {
    try {
      const user = JSON.parse(userCookie.value)
      return NextResponse.json({
        authenticated: true,
        user: {
          ...user,
          role: userRole?.value || user.role
        },
        tokenExpiringSoon: false // Legacy cookies don't expire soon
      })
    } catch (error) {
      console.error('Error parsing user cookie:', error)
    }
  }
  
  return NextResponse.json({
    authenticated: false,
    user: null,
    tokenExpiringSoon: false
  })
}