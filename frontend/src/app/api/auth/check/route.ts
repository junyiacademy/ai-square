import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken, isTokenExpiringSoon } from '@/lib/auth/jwt'

export async function GET() {
  const cookieStore = await cookies()
  
  // First try JWT access token
  const accessToken = cookieStore.get('accessToken')
  
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken.value)
    
    if (payload) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          name: payload.name
        },
        tokenExpiringSoon: isTokenExpiringSoon(payload.exp)
      })
    }
  }
  
  // Fallback to legacy cookie check for backward compatibility
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