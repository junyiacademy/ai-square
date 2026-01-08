/**
 * API Test Helpers
 * Common utilities for testing API routes with proper authentication
 */

import { NextRequest } from "next/server";

export interface AuthenticatedUser {
  email: string;
  name?: string;
  id?: string;
}

export type AuthMethod = "header" | "cookie";

/**
 * Creates an authenticated API request with x-user-info header
 */
export function createAuthenticatedRequest(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "POST",
  body?: object,
  user: AuthenticatedUser = { email: "test@example.com", name: "Test User" },
  additionalHeaders: Record<string, string> = {},
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-user-info": JSON.stringify(user),
    ...additionalHeaders,
  };

  return new NextRequest(url, {
    method,
    ...(body && { body: JSON.stringify(body) }),
    headers,
  });
}

/**
 * Creates an authenticated API request with user cookie (for PBL/Assessment/Discovery APIs)
 */
export function createAuthenticatedRequestWithCookie(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "POST",
  body?: object,
  user: AuthenticatedUser = { email: "test@example.com", name: "Test User" },
  additionalHeaders: Record<string, string> = {},
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...additionalHeaders,
  };

  const request = new NextRequest(url, {
    method,
    ...(body && { body: JSON.stringify(body) }),
    headers,
  });

  // Set user cookie for authentication
  request.cookies.set("user", JSON.stringify(user));

  return request;
}

/**
 * Creates an unauthenticated API request (no x-user-info header)
 */
export function createUnauthenticatedRequest(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "POST",
  body?: object,
  additionalHeaders: Record<string, string> = {},
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...additionalHeaders,
  };

  return new NextRequest(url, {
    method,
    ...(body && { body: JSON.stringify(body) }),
    headers,
  });
}

/**
 * Creates a request with Next.js 15 dynamic route params (as Promise)
 */
export function createAuthenticatedRequestWithParams(
  url: string,
  params: Record<string, string>,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "POST",
  body?: object,
  user: AuthenticatedUser = { email: "test@example.com", name: "Test User" },
  authMethod: AuthMethod = "header",
): { request: NextRequest; params: Promise<Record<string, string>> } {
  return {
    request:
      authMethod === "cookie"
        ? createAuthenticatedRequestWithCookie(url, method, body, user)
        : createAuthenticatedRequest(url, method, body, user),
    params: Promise.resolve(params),
  };
}

/**
 * Standard mock session for getServerSession
 */
export const mockSession = {
  user: {
    email: "test@example.com",
    name: "Test User",
    id: "user-123",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

/**
 * Setup common API route environment variables
 */
export function setupAPITestEnvironment() {
  process.env.GOOGLE_CLOUD_PROJECT = "test-project";
  process.env.GOOGLE_CLOUD_REGION = "us-central1";
  process.env.DB_HOST = "localhost";
  process.env.DB_PORT = "5432";
  process.env.DB_NAME = "test_db";
  process.env.DB_USER = "test";
  process.env.DB_PASSWORD = "test";
}

/**
 * Cleanup API test environment
 */
export function cleanupAPITestEnvironment() {
  delete process.env.GOOGLE_CLOUD_PROJECT;
  delete process.env.GOOGLE_CLOUD_REGION;
  delete process.env.DB_HOST;
  delete process.env.DB_PORT;
  delete process.env.DB_NAME;
  delete process.env.DB_USER;
  delete process.env.DB_PASSWORD;
}
