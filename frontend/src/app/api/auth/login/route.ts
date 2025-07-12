import { NextRequest, NextResponse } from 'next/server'
import { createAccessToken, createRefreshToken } from '@/lib/auth/jwt'
import { createSessionToken } from '@/lib/auth/session-token'
import { Storage } from '@google-cloud/storage'

// 假資料 - 測試用戶
const MOCK_USERS = [
  {
    id: 1,
    email: 'student@example.com',
    password: 'student123',
    name: 'Student User',
    role: 'student',
    hasCompletedAssessment: false,
    hasCompletedOnboarding: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    registrationSource: 'web',
    lastLogin: '2025-07-02T14:38:11.656Z',
    preferences: {
      language: 'en',
      theme: 'light'
    }
  },
  {
    id: 2, 
    email: 'teacher@example.com',
    password: 'teacher123',
    name: 'Teacher User',
    role: 'teacher',
    hasCompletedAssessment: true,
    hasCompletedOnboarding: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    registrationSource: 'web',
    lastLogin: '2025-07-02T07:28:38.521Z',
    preferences: {
      language: 'en',
      theme: 'light'
    },
    identity: 'teacher',
    lastUpdated: '2025-07-02T05:06:58.768Z',
    onboarding: {
      welcomeCompleted: true,
      identityCompleted: true,
      goalsCompleted: true,
      completedAt: '2025-07-02T07:27:10.190Z',
      welcomeCompletedAt: '2025-07-02T07:26:22.078Z',
      identityCompletedAt: '2025-07-02T07:27:06.257Z',
      goalsCompletedAt: '2025-07-02T07:27:10.190Z'
    },
    lastModified: '2025-07-02T07:28:29.241Z',
    interests: [
      'analyze-data',
      'create-content'
    ],
    learningGoals: [
      'analyze-data',
      'create-content'
    ],
    assessmentCompleted: true,
    assessmentCompletedAt: '2025-07-02T07:28:29.241Z',
    assessmentResult: {
      overallScore: 42,
      domainScores: {
        engaging_with_ai: 33,
        creating_with_ai: 67,
        managing_with_ai: 33,
        designing_with_ai: 33
      },
      totalQuestions: 12,
      correctAnswers: 5,
      timeSpentSeconds: 27,
      completedAt: '2025-07-02T07:28:25.904Z',
      level: 'beginner',
      recommendations: [
        'Focus on improving Engaging with AI: Understanding AI limitations, privacy concerns, and ethical considerations when interacting with AI systems',
        'Focus on improving Managing AI: Developing skills for AI-assisted decision making, workflow automation, and team collaboration'
      ]
    }
  },
  {
    id: 3,
    email: 'admin@example.com', 
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    hasCompletedAssessment: true,
    hasCompletedOnboarding: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    registrationSource: 'web',
    lastLogin: '2025-07-02T10:00:00.000Z',
    preferences: {
      language: 'en',
      theme: 'light'
    },
    identity: 'educator',
    onboarding: {
      welcomeCompleted: true,
      identityCompleted: true,
      goalsCompleted: true,
      completedAt: '2025-01-15T10:00:00.000Z'
    },
    interests: ['manage-ai', 'ethical-ai'],
    learningGoals: ['manage-ai', 'ethical-ai'],
    assessmentCompleted: true,
    assessmentResult: {
      overallScore: 92,
      domainScores: {
        engaging_with_ai: 100,
        creating_with_ai: 83,
        managing_with_ai: 100,
        designing_with_ai: 83
      },
      totalQuestions: 12,
      correctAnswers: 11,
      timeSpentSeconds: 180,
      completedAt: '2025-01-15T10:05:00.000Z',
      level: 'advanced'
    }
  },
  {
    id: 4,
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    role: 'student',
    hasCompletedAssessment: false,
    hasCompletedOnboarding: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    registrationSource: 'web',
    lastLogin: '2025-07-02T14:38:11.656Z',
    preferences: {
      language: 'en',
      theme: 'light'
    }
  }
]

// Initialize GCS
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ai-square-db';
const bucket = storage.bucket(BUCKET_NAME);

// Function to load user from GCS
async function loadUserFromGCS(email: string): Promise<{ email: string; password: string; role?: string; id?: string | number; name?: string } | null> {
  const sanitizedEmail = email.replace('@', '_at_').replace(/\./g, '_');
  const filePath = `user/${sanitizedEmail}/user_data.json`;
  const file = bucket.file(filePath);
  
  try {
    const [exists] = await file.exists();
    if (!exists) {
      return null;
    }
    
    const [contents] = await file.download();
    const userData = JSON.parse(contents.toString());
    console.log(`✅ User data loaded from GCS: ${filePath}`);
    
    // Update last login
    userData.lastLogin = new Date().toISOString();
    await file.save(JSON.stringify(userData, null, 2), {
      metadata: {
        contentType: 'application/json',
      },
    });
    
    return userData;
  } catch (error) {
    console.error('❌ Error loading user from GCS:', error);
    return null;
  }
}

// Function to save user to GCS
async function saveUserToGCS(userData: typeof MOCK_USERS[0]) {
  const sanitizedEmail = userData.email.replace('@', '_at_').replace(/\./g, '_');
  const filePath = `user/${sanitizedEmail}/user_data.json`;
  const file = bucket.file(filePath);
  
  const userDataToSave = {
    ...userData,
    lastLogin: new Date().toISOString()
  };
  
  try {
    await file.save(JSON.stringify(userDataToSave, null, 2), {
      metadata: {
        contentType: 'application/json',
      },
    });
    console.log(`✅ Mock user data saved to GCS: ${filePath}`);
  } catch (error) {
    console.error('❌ Error saving mock user to GCS:', error);
    // Don't throw - allow login to continue even if GCS fails
  }
}

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

    // 嘗試從 GCS 載入用戶
    let user = await loadUserFromGCS(email);
    let mockUser;
    
    // 如果 GCS 沒有找到，則從 MOCK_USERS 尋找
    if (!user) {
      mockUser = MOCK_USERS.find(u => u.email === email && u.password === password);
      if (mockUser) {
        // Save mock user to GCS for future logins
        await saveUserToGCS(mockUser);
        
        user = {
          ...mockUser,
          id: mockUser.id.toString() // Convert to string for consistency
        };
      }
    } else {
      // 驗證密碼（注意：實際應用中應該使用加密密碼）
      if (user.password !== password) {
        user = null;
      }
    }

    if (user) {
      // 成功登入，回傳用戶資訊 (不包含密碼)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: userPassword, ...userWithoutPassword } = user
      
      // Create JWT tokens
      const userId = typeof user.id === 'number' ? user.id : parseInt(user.id || '0', 10);
      const accessToken = await createAccessToken({
        userId,
        email: user.email,
        role: user.role || 'student',
        name: user.name || user.email
      })
      
      const refreshToken = await createRefreshToken(userId, rememberMe)
      
      // Create session token for frontend
      const sessionToken = createSessionToken(userId.toString(), user.email);
      
      // Create response with cookies
      const response = NextResponse.json({
        success: true,
        user: userWithoutPassword,
        message: 'Login successful',
        sessionToken // Include session token in response
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