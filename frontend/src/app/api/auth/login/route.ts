import { NextRequest, NextResponse } from 'next/server'
import { createAccessToken, createRefreshToken } from '@/lib/auth/jwt'

// 假資料 - 測試用戶
const MOCK_USERS = [
  {
    id: 1,
    email: 'student@example.com',
    password: 'student123',
    role: 'student',
    name: 'Student User'
  },
  {
    id: 2, 
    email: 'teacher@example.com',
    password: 'teacher123',
    role: 'teacher',
    name: 'Teacher User'
  },
  {
    id: 3,
    email: 'admin@example.com', 
    password: 'admin123',
    role: 'admin',
    name: 'Admin User'
  }
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, rememberMe = false } = body

    // 基本驗證
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // 尋找用戶
    const user = MOCK_USERS.find(u => u.email === email && u.password === password)

    if (user) {
      // 成功登入，回傳用戶資訊 (不包含密碼)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: userPassword, ...userWithoutPassword } = user
      
      // Create JWT tokens
      const accessToken = await createAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      })
      
      const refreshToken = await createRefreshToken(user.id, rememberMe)
      
      // Create response with cookies
      const response = NextResponse.json({
        success: true,
        user: userWithoutPassword,
        message: 'Login successful'
      })
      
      // Determine cookie expiration based on Remember Me
      const refreshTokenMaxAge = rememberMe 
        ? 60 * 60 * 24 * 30  // 30 days if Remember Me is checked
        : 60 * 60 * 24 * 7   // 7 days otherwise
      
      // Set access token cookie (short-lived)
      response.cookies.set('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 15 // 15 minutes
      })
      
      // Set refresh token cookie (long-lived)
      response.cookies.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshTokenMaxAge,
        path: '/api/auth/refresh' // Only sent to refresh endpoint
      })
      
      // Keep backward compatibility cookies for now
      response.cookies.set('isLoggedIn', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshTokenMaxAge
      })
      
      response.cookies.set('user', JSON.stringify(userWithoutPassword), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshTokenMaxAge
      })
      
      // Store Remember Me preference
      response.cookies.set('rememberMe', rememberMe ? 'true' : 'false', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshTokenMaxAge
      })
      
      return response
    } else {
      // 登入失敗
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 支援 OPTIONS 請求 (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}