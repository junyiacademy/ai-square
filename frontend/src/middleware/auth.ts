import { NextRequest, NextResponse } from 'next/server';

export function checkAdminAuth(request: NextRequest): { isValid: boolean; user?: any } {
  // Get auth from cookies
  const isLoggedIn = request.cookies.get('isLoggedIn')?.value === 'true';
  const userCookie = request.cookies.get('user')?.value;
  
  if (!isLoggedIn || !userCookie) {
    return { isValid: false };
  }
  
  try {
    const user = JSON.parse(userCookie);
    if (user.role !== 'admin') {
      return { isValid: false };
    }
    
    return { isValid: true, user };
  } catch (error) {
    return { isValid: false };
  }
}

export function withAdminAuth(handler: Function) {
  return async (request: NextRequest, context?: any) => {
    const { isValid, user } = checkAdminAuth(request);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Add user to request
    (request as any).user = user;
    
    return handler(request, context);
  };
}