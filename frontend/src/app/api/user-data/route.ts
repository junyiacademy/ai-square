import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth/auth-utils';
import { gcsUserDataRepository } from '@/lib/implementations/gcs-v2/repositories/gcs-user-data-repository';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('x-session-token');
    console.log('[API] GET /api/user-data - session token:', sessionToken ? 'present' : 'missing');
    
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      console.log('[API] GET /api/user-data - authentication failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userData = await gcsUserDataRepository.getUserData(user.email);
    
    return NextResponse.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Failed to get user data:', error);
    return NextResponse.json(
      { error: 'Failed to get user data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('x-session-token');
    console.log('[API] POST /api/user-data - session token:', sessionToken ? 'present' : 'missing');
    
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      console.log('[API] POST /api/user-data - authentication failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { data } = body;

    const savedData = await gcsUserDataRepository.saveUserData(
      user.email,
      data,
      user.email
    );
    
    return NextResponse.json({
      success: true,
      data: savedData
    });
  } catch (error) {
    console.error('Failed to save user data:', error);
    return NextResponse.json(
      { error: 'Failed to save user data' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const success = await gcsUserDataRepository.deleteUserData(user.email);
    
    return NextResponse.json({
      success
    });
  } catch (error) {
    console.error('Failed to delete user data:', error);
    return NextResponse.json(
      { error: 'Failed to delete user data' },
      { status: 500 }
    );
  }
}