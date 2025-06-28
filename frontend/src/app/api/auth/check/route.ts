import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  
  // Check if user is logged in from cookies
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
        }
      })
    } catch (error) {
      console.error('Error parsing user cookie:', error)
    }
  }
  
  return NextResponse.json({
    authenticated: false,
    user: null
  })
}