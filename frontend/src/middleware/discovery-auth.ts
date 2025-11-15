import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

export async function checkDiscoveryAuth(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      // Redirect to login with return URL
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    return null; // Continue with request
  } catch {
    // Handle session service errors by treating as no session
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
}
