import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth/session-simple';

interface User {
  email: string;
  role: string;
  userId?: string;
  name?: string;
}

export async function checkAdminAuth(request: NextRequest): Promise<{ isValid: boolean; user?: User }> {
  // Use sessionToken only - no fallback to old cookies
  const sessionToken = request.cookies.get('sessionToken')?.value;
  
  if (!sessionToken) {
    return { isValid: false };
  }
  
  try {
    // Verify session token
    const sessionData = verifySessionToken(sessionToken);
    
    if (!sessionData) {
      return { isValid: false };
    }
    
    // For demo accounts, infer role from email
    let role = 'user';
    let name = 'User';
    
    if (sessionData.email === 'admin@example.com') {
      role = 'admin';
      name = 'Demo Admin';
    } else if (sessionData.email === 'teacher@example.com') {
      role = 'teacher';
      name = 'Demo Teacher';
    } else if (sessionData.email === 'student@example.com') {
      role = 'student';
      name = 'Demo Student';
    }
    
    // Only allow admin role
    if (role !== 'admin') {
      return { isValid: false };
    }
    
    const user: User = {
      email: sessionData.email,
      role: role,
      userId: sessionData.userId,
      name: name
    };
    
    return { isValid: true, user };
  } catch {
    return { isValid: false };
  }
}

type HandlerFunction = (request: NextRequest, context?: unknown) => Promise<NextResponse>;

export function withAdminAuth(handler: HandlerFunction) {
  return async (request: NextRequest, context?: unknown) => {
    const { isValid, user } = await checkAdminAuth(request);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Add user to request
    (request as NextRequest & { user: User }).user = user as User;
    
    return handler(request, context);
  };
}