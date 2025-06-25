import { NextRequest, NextResponse } from 'next/server'

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
    const { email, password } = body

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
      
      // Create response with cookies
      const response = NextResponse.json({
        success: true,
        user: userWithoutPassword,
        message: 'Login successful'
      })
      
      // Set cookies for API authentication
      response.cookies.set('isLoggedIn', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })
      
      response.cookies.set('userRole', user.role, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
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