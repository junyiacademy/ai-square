/**
 * AuthManager - Centralized Authentication Management
 *
 * Industry standard: Single session token in httpOnly cookie
 * No multiple cookies, no complex checks, just simple and secure
 */

import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "sessionToken";
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours
const COOKIE_MAX_AGE_REMEMBER = 30 * 24 * 60 * 60; // 30 days

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  "/pbl",
  "/assessment",
  "/discovery",
  "/admin",
  "/profile",
  "/dashboard",
];

export class AuthManager {
  /**
   * Set authentication cookie
   */
  static setAuthCookie(
    response: NextResponse,
    token: string,
    rememberMe = false,
  ): void {
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true, // Always use secure in production (HTTPS)
      sameSite: "lax",
      maxAge: rememberMe ? COOKIE_MAX_AGE_REMEMBER : COOKIE_MAX_AGE,
      path: "/",
      domain: undefined, // Let browser determine the domain
    });
  }

  /**
   * Check if request is authenticated
   */
  static isAuthenticated(request: NextRequest): boolean {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    return !!token && this.isValidSessionToken(token);
  }

  /**
   * Clear all authentication cookies
   */
  static clearAuthCookies(response: NextResponse): void {
    response.cookies.set(AUTH_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  }

  /**
   * Validate session token format
   */
  static isValidSessionToken(token: string): boolean {
    if (!token) return false;

    // Validate hex token format (32 bytes = 64 hex characters)
    // Tokens are generated using crypto.randomBytes(32).toString('hex')
    return /^[a-f0-9]{64}$/i.test(token);
  }

  /**
   * Check if a route is protected
   */
  static isProtectedRoute(pathname: string): boolean {
    return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  }

  /**
   * Get session token from request
   */
  static getSessionToken(request: NextRequest): string | undefined {
    return request.cookies.get(AUTH_COOKIE_NAME)?.value;
  }

  /**
   * Create redirect response to login
   */
  static createLoginRedirect(request: NextRequest): NextResponse {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
}
