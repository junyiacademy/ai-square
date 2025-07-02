import { NextRequest } from 'next/server';
import { verifyAccessToken } from './jwt';
import type { TokenPayload } from './jwt';

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
  const accessToken = request.cookies.get('accessToken')?.value;
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) {
      return payload;
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