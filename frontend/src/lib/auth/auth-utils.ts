import { NextRequest } from 'next/server';
import { verifyAccessToken } from './jwt';
import type { TokenPayload } from './jwt';
import { verifySessionToken } from './session-token';

/**
 * Extract and verify access token from request
 */
export async function getAuthFromRequest(request: NextRequest): Promise<TokenPayload | null> {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = await verifyAccessToken(token);
    if (payload) {
      return payload;
    }
  }

  // Check cookies as fallback
  const cookieStore = request.cookies;
  const accessToken = cookieStore.get('accessToken')?.value;
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) {
      return payload;
    }
  }

  // Check for session token in header (more secure than query params)
  const sessionToken = request.headers.get('x-session-token');
  if (sessionToken) {
    console.log('[Auth] Verifying session token...');
    const sessionData = verifySessionToken(sessionToken);
    if (sessionData) {
      console.log('[Auth] Session token valid for user:', sessionData.email);
      // Convert session data to TokenPayload format
      return {
        userId: parseInt(sessionData.userId) || 0,
        email: sessionData.email,
        role: 'student', // Default role for session-based auth
        name: sessionData.email.split('@')[0]
      };
    } else {
      console.log('[Auth] Session token verification failed');
    }
  }

  // Fallback to legacy cookies if no token authentication succeeded
  const isLoggedIn = cookieStore.get('isLoggedIn')?.value;
  const userCookie = cookieStore.get('user')?.value;
  
  if (isLoggedIn === 'true' && userCookie) {
    try {
      const user = JSON.parse(userCookie);
      console.log('[Auth] Using legacy cookie auth for user:', user.email);
      return {
        userId: user.id || 0,
        email: user.email,
        role: user.role || 'student',
        name: user.name || user.email.split('@')[0]
      };
    } catch (error) {
      console.error('[Auth] Failed to parse user cookie:', error);
    }
  }

  return null;
}

/**
 * Check if user has required role
 */
export function hasRole(user: TokenPayload | null, requiredRole: string): boolean {
  if (!user) return false;
  return user.role === requiredRole;
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(user: TokenPayload | null, requiredRoles: string[]): boolean {
  if (!user) return false;
  return requiredRoles.includes(user.role);
}

/**
 * Mock user for testing
 */
export const mockUser: TokenPayload = {
  userId: 1,
  email: 'test@example.com',
  role: 'student',
  name: 'Test User'
};