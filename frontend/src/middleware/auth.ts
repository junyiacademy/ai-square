import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';

interface User {
  email: string;
  role: string;
  userId?: number;
  name?: string;
}

export async function checkAdminAuth(request: NextRequest): Promise<{ isValid: boolean; user?: User }> {
  // Try JWT first (new auth method)
  const accessToken = request.cookies.get('accessToken')?.value;
  
  if (accessToken) {
    try {
      // Verify JWT token
      const payload = await verifyAccessToken(accessToken);
      
      if (payload && payload.role === 'admin') {
        const user: User = {
          email: payload.email,
          role: payload.role,
          userId: payload.userId,
          name: payload.name
        };
        
        return { isValid: true, user };
      }
    } catch {
      // JWT verification failed, fall back to cookie auth
    }
  }
  
  // Fall back to cookie auth for backward compatibility
  const isLoggedIn = request.cookies.get('isLoggedIn')?.value === 'true';
  const userCookie = request.cookies.get('user')?.value;
  
  if (!isLoggedIn || !userCookie) {
    return { isValid: false };
  }
  
  try {
    const user = JSON.parse(userCookie) as User;
    if (user.role !== 'admin') {
      return { isValid: false };
    }
    
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