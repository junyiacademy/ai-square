import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';

export async function GET(request: NextRequest) {
  try {
    // Use unified authentication
    const auth = await getUnifiedAuth(request);
    
    if (!auth) {
      return NextResponse.json({
        authenticated: false,
        user: null
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        role: auth.user.role,
        name: auth.user.email // Use email as name if not available
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      authenticated: false,
      user: null
    });
  }
}

// Support OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}