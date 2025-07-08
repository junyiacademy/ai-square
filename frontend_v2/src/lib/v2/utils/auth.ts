/**
 * Authentication utilities for V2 API routes
 */

import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';

export interface AuthUser {
  email: string;
  id?: string;
  name?: string;
  role?: string;
}

/**
 * Get authenticated user from request
 * Returns null if not authenticated
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken');
  
  if (process.env.NODE_ENV === 'development') {
    // Development mode: use legacy cookies
    const userCookie = cookieStore.get('user');
    if (userCookie?.value) {
      try {
        const user = JSON.parse(userCookie.value);
        return {
          email: user.email,
          id: user.id,
          name: user.name,
          role: user.role
        };
      } catch (error) {
        console.error('Error parsing user cookie:', error);
      }
    }
  } else if (accessToken) {
    // Production mode: use JWT
    const payload = await verifyAccessToken(accessToken.value);
    if (payload) {
      return {
        email: payload.email,
        id: payload.userId,
        name: payload.name,
        role: payload.role
      };
    }
  }
  
  return null;
}

/**
 * Require authentication for API route
 * Throws error if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}