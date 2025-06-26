import { NextRequest, NextResponse } from 'next/server';

interface User {
  email: string;
  role: string;
}

export function checkAdminAuth(request: NextRequest): { isValid: boolean; user?: User } {
  // Get auth from cookies
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
    const { isValid, user } = checkAdminAuth(request);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Add user to request
    (request as NextRequest & { user: User }).user = user as User;
    
    return handler(request, context);
  };
}