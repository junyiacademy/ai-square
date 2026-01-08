import { NextRequest } from "next/server";
import { SecureSession } from "./secure-session";

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  name?: string;
}

/**
 * Extract and verify authentication from request
 * Simplified to only use sessionToken cookie
 */
export async function getAuthFromRequest(
  request: NextRequest,
): Promise<AuthUser | null> {
  try {
    // Only check sessionToken cookie (single source of truth)
    const sessionToken = request.cookies.get("sessionToken")?.value;

    if (!sessionToken) {
      return null;
    }

    // Get session data from secure session store
    const sessionData = SecureSession.getSession(sessionToken);

    if (!sessionData) {
      return null;
    }

    // Return user data from session
    return {
      userId: sessionData.userId,
      email: sessionData.email,
      role: sessionData.role,
      name: sessionData.email.split("@")[0], // Default name from email
    };
  } catch (error) {
    console.error("[Auth] Authentication error:", error);
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser | null, requiredRole: string): boolean {
  if (!user) return false;
  return user.role === requiredRole;
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(
  user: AuthUser | null,
  requiredRoles: string[],
): boolean {
  if (!user) return false;
  return requiredRoles.includes(user.role);
}

/**
 * Mock user for testing
 */
export const mockUser: AuthUser = {
  userId: "1",
  email: "test@example.com",
  role: "student",
  name: "Test User",
};
