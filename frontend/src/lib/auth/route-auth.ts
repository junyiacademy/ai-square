/**
 * Authentication utilities for Route Handlers
 * 
 * Use this instead of getServerSession in API routes
 * to properly extract authentication from NextRequest
 */

import { NextRequest } from 'next/server';
import { SecureSession } from './secure-session';

export interface RouteSession {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Get session from request in Route Handlers
 * This should be used in all API routes instead of getServerSession
 */
export async function getRouteSession(request: NextRequest): Promise<RouteSession | null> {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('sessionToken')?.value;
    
    if (!sessionToken) {
      // Try header as fallback (for API calls)
      const headerToken = request.headers.get('x-session-token');
      if (!headerToken) {
        return null;
      }
      
      const sessionData = SecureSession.getSession(headerToken);
      if (!sessionData) {
        return null;
      }
      
      return {
        user: {
          id: sessionData.userId,
          email: sessionData.email,
          role: sessionData.role
        }
      };
    }
    
    // Get session data from secure session store
    const sessionData = SecureSession.getSession(sessionToken);
    
    if (!sessionData) {
      return null;
    }
    
    // Return user data from session
    return {
      user: {
        id: sessionData.userId,
        email: sessionData.email,
        role: sessionData.role
      }
    };
  } catch (error) {
    console.error('[RouteAuth] Authentication error:', error);
    return null;
  }
}

/**
 * Helper to require authentication in routes
 */
export function requireAuth(session: RouteSession | null): asserts session is RouteSession {
  if (!session) {
    throw new Error('Authentication required');
  }
}