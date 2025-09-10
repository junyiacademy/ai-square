/**
 * Unified Authentication System
 * 
 * This is the SINGLE source of truth for authentication across the entire application.
 * Use this in ALL contexts: Route Handlers, Server Components, and Middleware.
 * 
 * @example
 * // In Route Handlers
 * export async function GET(request: NextRequest) {
 *   const auth = await getUnifiedAuth(request);
 *   if (!auth) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   // Use auth.user.id, auth.user.email, etc.
 * }
 * 
 * // In Server Components (future implementation)
 * export default async function Page() {
 *   const auth = await getUnifiedAuth();
 *   // ...
 * }
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SecureSession } from './secure-session';

export interface UnifiedAuth {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Token validation regex - 64 character hex string
 */
const TOKEN_REGEX = /^[a-f0-9]{64}$/i;

/**
 * Get authentication from any context
 * 
 * @param request - NextRequest object (for Route Handlers) or undefined (for Server Components)
 * @returns Authentication data or null if not authenticated
 */
export async function getUnifiedAuth(request?: NextRequest): Promise<UnifiedAuth | null> {
  try {
    let sessionToken: string | undefined;

    if (request) {
      // Route Handler context - get from NextRequest
      sessionToken = extractTokenFromRequest(request);
    } else {
      // Server Component context - get from cookies() API
      sessionToken = await extractTokenFromCookies();
    }

    // Validate token format
    if (!sessionToken || !isValidTokenFormat(sessionToken)) {
      return null;
    }

    // Get session from secure store (using async for Redis support)
    const sessionData = await SecureSession.getSessionAsync(sessionToken);
    
    if (!sessionData) {
      return null;
    }

    // Return unified auth object
    return {
      user: {
        id: sessionData.userId,
        email: sessionData.email,
        role: sessionData.role
      }
    };
  } catch (error) {
    console.error('[UnifiedAuth] Error getting authentication:', error);
    return null;
  }
}

/**
 * Extract token from NextRequest (Route Handler context)
 */
function extractTokenFromRequest(request: NextRequest): string | undefined {
  // First try cookie
  const cookieToken = request.cookies.get('sessionToken')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // Fallback to header (for API-to-API calls)
  const headerToken = request.headers.get('x-session-token');
  if (headerToken) {
    return headerToken;
  }

  return undefined;
}

/**
 * Extract token from cookies() API (Server Component context)
 * Note: This is for future implementation when we move to Server Components
 */
async function extractTokenFromCookies(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('sessionToken')?.value;
  } catch {
    // If cookies() is not available (e.g., in Route Handlers), return undefined
    return undefined;
  }
}

/**
 * Validate token format
 */
function isValidTokenFormat(token: string): boolean {
  return TOKEN_REGEX.test(token);
}

/**
 * Helper to create a standard unauthorized response
 */
export function createUnauthorizedResponse(message = 'Authentication required'): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

/**
 * Helper to check if user has a specific role
 */
export function hasRole(auth: UnifiedAuth | null, role: string): boolean {
  return auth?.user.role === role;
}

/**
 * Helper to check if user has any of the specified roles
 */
export function hasAnyRole(auth: UnifiedAuth | null, roles: string[]): boolean {
  if (!auth) return false;
  return roles.includes(auth.user.role);
}

/**
 * Type guard to ensure authentication exists
 */
export function requireAuth(auth: UnifiedAuth | null): asserts auth is UnifiedAuth {
  if (!auth) {
    throw new Error('Authentication required');
  }
}