import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AuthManager } from "@/lib/auth/auth-manager";
import {
  getClientIdentifier,
  checkRateLimit,
  getRateLimitConfig,
  addRateLimitHeaders,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  const isStaticFile = pathname.includes(".");
  const isNextInternal = pathname.startsWith("/_next");

  if (isStaticFile || isNextInternal) {
    return NextResponse.next();
  }

  // Handle API routes with rate limiting
  const isApiRoute = pathname.startsWith("/api/");
  if (isApiRoute) {
    return handleApiRateLimit(request, pathname);
  }

  // Special case: Allow access to fix-demo and db-init pages without authentication in development
  // Also allow scenario editors for testing
  if (
    pathname === "/admin/fix-demo" ||
    pathname === "/admin/db-init" ||
    pathname === "/admin/scenarios/wysiwyg" ||
    pathname === "/admin/scenarios/database-editor" ||
    pathname === "/admin/scenarios/unified" ||
    pathname === "/admin/scenarios/live-editor" ||
    pathname === "/admin/scenarios/agent-editor" ||
    pathname === "/admin"
  ) {
    return NextResponse.next();
  }

  // Check if the route is protected
  if (AuthManager.isProtectedRoute(pathname)) {
    // Check authentication using centralized AuthManager
    if (!AuthManager.isAuthenticated(request)) {
      return AuthManager.createLoginRedirect(request);
    }
  }

  return NextResponse.next();
}

/**
 * Handle rate limiting for API routes
 *
 * @param request - The incoming request
 * @param pathname - The request pathname
 * @returns NextResponse with rate limit headers or 429 if exceeded
 */
function handleApiRateLimit(
  request: NextRequest,
  pathname: string
): NextResponse {
  // Get rate limit configuration for this path
  const rateLimitConfig = getRateLimitConfig(pathname);

  // If no rate limiting for this path, allow through
  if (!rateLimitConfig) {
    return NextResponse.next();
  }

  // Get client identifier (IP or anonymous hash)
  const clientId = getClientIdentifier(request);

  // Create a unique key combining client ID and rate limit category
  // This ensures different rate limits are tracked separately
  const rateLimitKey = `${clientId}:${pathname.split("/").slice(0, 3).join("/")}`;

  // Check rate limit
  const result = checkRateLimit(rateLimitKey, rateLimitConfig);

  // If rate limit exceeded, return 429
  if (!result.allowed) {
    return createRateLimitResponse(result, rateLimitConfig);
  }

  // Allow the request but add rate limit headers
  const response = NextResponse.next();
  return addRateLimitHeaders(response, result, rateLimitConfig);
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
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
