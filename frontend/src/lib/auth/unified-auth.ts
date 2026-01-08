/**
 * Unified Authentication System - SIMPLIFIED VERSION
 *
 * This is the SINGLE source of truth for authentication.
 * Now uses PostgreSQL directly for session storage - no Redis, no memory fallback.
 * Sessions persist across server restarts.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "./simple-auth";

export interface UnifiedAuth {
  user: {
    id: string;
    email: string;
    role: string;
    name?: string;
    isGuest?: boolean;
  };
}

/**
 * Get authentication from any context
 *
 * @param request - NextRequest object (for Route Handlers) or undefined (for Server Components)
 * @returns Authentication data or null if not authenticated
 */
export async function getUnifiedAuth(
  request?: NextRequest,
): Promise<UnifiedAuth | null> {
  try {
    let sessionToken: string | undefined;

    if (request) {
      // Route Handler context - get from NextRequest
      sessionToken = extractTokenFromRequest(request);
    } else {
      // Server Component context - get from cookies() API
      sessionToken = await extractTokenFromCookies();
    }

    if (!sessionToken) {
      return null;
    }

    // Get session from PostgreSQL
    const sessionData = await getSession(sessionToken);

    if (!sessionData) {
      return null;
    }

    // Return unified auth object
    return {
      user: {
        id: sessionData.userId,
        email: sessionData.email,
        role: sessionData.role,
        name: sessionData.name,
        isGuest: sessionData.isGuest,
      },
    };
  } catch (error) {
    console.error("[UnifiedAuth] Error getting authentication:", error);
    return null;
  }
}

/**
 * Extract token from NextRequest (Route Handler context)
 */
function extractTokenFromRequest(request: NextRequest): string | undefined {
  // First try cookie
  const cookieToken = request.cookies.get("sessionToken")?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // Fallback to header (for API-to-API calls)
  const headerToken = request.headers.get("x-session-token");
  if (headerToken) {
    return headerToken;
  }

  return undefined;
}

/**
 * Extract token from cookies() API (Server Component context)
 */
async function extractTokenFromCookies(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get("sessionToken")?.value;
  } catch (error) {
    console.error("[UnifiedAuth] Error reading cookies:", error);
    return undefined;
  }
}

/**
 * Create unauthorized response
 */
export function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Authentication required" },
    { status: 401 },
  );
}

/**
 * Create forbidden response
 */
export function createForbiddenResponse(): NextResponse {
  return NextResponse.json({ error: "Access denied" }, { status: 403 });
}
