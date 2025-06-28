import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  // Get the cookies instance
  const cookieStore = cookies()
  
  // Create response
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  })
  
  // Clear authentication cookies by setting them with maxAge: 0
  // This ensures they are deleted from the browser
  response.cookies.set('isLoggedIn', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/' // Ensure cookie is cleared for all paths
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
  
  // Also try to delete cookies using the cookies() API
  // This helps ensure cookies are properly cleared
  cookieStore.delete('isLoggedIn')
  cookieStore.delete('userRole')
  cookieStore.delete('user')
  
  return response
}