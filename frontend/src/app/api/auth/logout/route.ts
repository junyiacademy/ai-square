import { NextResponse } from 'next/server'
import { AuthManager } from '@/lib/auth/auth-manager'

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  })

  // Use centralized AuthManager to clear auth cookie
  AuthManager.clearAuthCookies(response)

  return response
}

export async function GET() {
  // Support GET for convenience (e.g., logout links)
  return POST()
}