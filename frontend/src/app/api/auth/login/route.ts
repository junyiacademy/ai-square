import { NextRequest, NextResponse } from 'next/server';
import { loginUser, autoLoginDev } from '@/lib/auth/simple-auth';

export async function POST(request: NextRequest) {
  try {
    // Try to parse body, but don't fail if empty (for auto-login)
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is OK for dev auto-login
    }
    
    const { email, password, rememberMe = false } = body;

    // Dev mode auto-login if no credentials provided
    if (process.env.NODE_ENV === 'development' && !email && !password) {
      console.log('[Login] Attempting dev auto-login...');
      const autoLogin = await autoLoginDev();
      
      if (autoLogin.success && autoLogin.token) {
        const response = NextResponse.json({
          success: true,
          user: autoLogin.user
        });
        
        // Set cookie for 30 days
        response.cookies.set('sessionToken', autoLogin.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60,
          path: '/'
        });
        
        return response;
      }
      
      // If auto-login fails, return error
      return NextResponse.json(
        { success: false, error: 'No dev user available for auto-login' },
        { status: 401 }
      );
    }

    // Normal login
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await loginUser(email, password);
    
    if (!result.success || !result.token) {
      return NextResponse.json(
        { success: false, error: result.error || 'Login failed' },
        { status: 401 }
      );
    }

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      user: result.user
    });

    // Set session cookie (7 days default, 30 days for remember me)
    response.cookies.set('sessionToken', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

// Support OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}