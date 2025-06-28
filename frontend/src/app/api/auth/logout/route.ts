import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  // Get the cookies instance
  const cookieStore = await cookies()
  
  // Create response
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  })
  
  // Clear JWT tokens
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
  
  // Clear legacy authentication cookies
  response.cookies.set('isLoggedIn', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })
  
  response.cookies.set('userRole', '', {
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
  
  // Clear Remember Me cookie
  response.cookies.set('rememberMe', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })
  
  // Also try to delete cookies using the cookies() API
  cookieStore.delete('accessToken')
  cookieStore.delete('refreshToken')
  cookieStore.delete('isLoggedIn')
  cookieStore.delete('userRole')
  cookieStore.delete('user')
  cookieStore.delete('rememberMe')
  
  return response
}