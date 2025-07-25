import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/pbl',
  '/assessment', 
  '/discovery',
  '/admin',
  '/profile'
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/auth',
  '/api/auth',
  '/relations' // AI literacy visualization is public
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes and static files
  const isApiRoute = pathname.startsWith('/api/');
  const isStaticFile = pathname.includes('.');
  const isNextInternal = pathname.startsWith('/_next');
  
  if (isApiRoute || isStaticFile || isNextInternal) {
    return NextResponse.next();
  }
  
  // Check if the route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  
  // Check authentication for protected routes
  if (isProtectedRoute) {
    // Check for authentication cookies
    const isLoggedIn = request.cookies.get('isLoggedIn')?.value === 'true';
    const sessionToken = request.cookies.get('sessionToken')?.value;
    const accessToken = request.cookies.get('accessToken')?.value;
    
    // If not authenticated, redirect to login
    if (!isLoggedIn || !sessionToken || !accessToken) {
      const loginUrl = new URL('/login', request.url);
      // Add redirect parameter to return user after login
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
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