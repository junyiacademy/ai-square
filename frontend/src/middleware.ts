import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthManager } from '@/lib/auth/auth-manager';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes and static files
  const isApiRoute = pathname.startsWith('/api/');
  const isStaticFile = pathname.includes('.');
  const isNextInternal = pathname.startsWith('/_next');
  
  if (isApiRoute || isStaticFile || isNextInternal) {
    return NextResponse.next();
  }
  
  // Special case: Allow access to fix-demo page without authentication
  if (pathname === '/admin/fix-demo') {
    return NextResponse.next();
  }
  
  // Check if the route is protected
  if (AuthManager.isProtectedRoute(pathname)) {
    // Check authentication using centralized AuthManager
    if (!AuthManager.isAuthenticated(request)) {
      return AuthManager.createLoginRedirect(request);
    }
  }
  
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};