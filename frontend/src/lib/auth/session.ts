/**
 * Legacy Session Interface
 *
 * This file provides backward compatibility for code using getServerSession.
 * It now delegates to the unified authentication system.
 *
 * @deprecated Use getUnifiedAuth from unified-auth.ts instead
 */

import { getUnifiedAuth } from "./unified-auth";
import type { NextRequest } from "next/server";

export interface Session {
  user: {
    id: string;
    email: string;
  };
}

/**
 * Get server session - now delegates to unified auth
 *
 * NOTE: This function now requires a NextRequest parameter in Route Handlers
 * For backward compatibility, it tries to work without it but may fail.
 *
 * @deprecated Use getUnifiedAuth directly
 */
export async function getServerSession(
  request?: NextRequest,
): Promise<Session | null> {
  // Try to get auth using the unified system
  const auth = await getUnifiedAuth(request);

  if (!auth) {
    return null;
  }

  // Map to legacy Session interface
  return {
    user: {
      id: auth.user.id,
      email: auth.user.email,
    },
  };
}

// Alias for getServerSession
export const getSession = getServerSession;
