/**
 * Rate Limiting Utility for Next.js Middleware (Edge Runtime Compatible)
 *
 * This module provides rate limiting functionality that works in Edge Runtime.
 * It uses in-memory storage which works per-instance. For distributed rate limiting
 * across multiple instances, consider using Redis or a similar solution.
 *
 * @module rate-limit
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Rate limit configuration for different API categories
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional message for rate limit exceeded */
  message?: string;
}

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of remaining requests in the current window */
  remaining: number;
  /** Timestamp when the rate limit resets */
  resetTime: number;
  /** Seconds until the rate limit resets (for Retry-After header) */
  retryAfter?: number;
}

/**
 * In-memory store for rate limiting
 * Maps client identifier to array of request timestamps
 */
const rateLimitStore = new Map<string, number[]>();

/**
 * Cleanup interval to prevent memory leaks (runs every 60 seconds)
 */
const CLEANUP_INTERVAL_MS = 60000;
let lastCleanup = Date.now();

/**
 * Clean up expired entries from the store
 */
function cleanupExpiredEntries(maxWindowMs: number): void {
  const now = Date.now();

  // Only run cleanup periodically
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanup = now;
  const cutoff = now - maxWindowMs;

  for (const [key, timestamps] of rateLimitStore.entries()) {
    const validTimestamps = timestamps.filter((t) => t > cutoff);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else if (validTimestamps.length !== timestamps.length) {
      rateLimitStore.set(key, validTimestamps);
    }
  }
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header (for proxied requests) or falls back to a hash
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, use the first one (client IP)
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to a combination of user agent and other available info
  const userAgent = request.headers.get("user-agent") || "unknown";
  const acceptLanguage = request.headers.get("accept-language") || "unknown";
  return `anon-${hashString(userAgent + acceptLanguage)}`;
}

/**
 * Simple hash function for creating anonymous identifiers
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if a request should be rate limited
 *
 * @param clientId - Client identifier (IP or hash)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  clientId: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Clean up expired entries periodically
  cleanupExpiredEntries(config.windowMs);

  // Get existing timestamps for this client
  const timestamps = rateLimitStore.get(clientId) || [];

  // Filter to only include timestamps within the current window
  const recentTimestamps = timestamps.filter((t) => t > windowStart);

  // Calculate reset time (end of current window from first request)
  const resetTime =
    recentTimestamps.length > 0
      ? recentTimestamps[0] + config.windowMs
      : now + config.windowMs;

  // Check if limit exceeded
  if (recentTimestamps.length >= config.maxRequests) {
    const retryAfter = Math.ceil((resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter: retryAfter > 0 ? retryAfter : 1,
    };
  }

  // Add current request timestamp
  recentTimestamps.push(now);
  rateLimitStore.set(clientId, recentTimestamps);

  return {
    allowed: true,
    remaining: config.maxRequests - recentTimestamps.length,
    resetTime,
  };
}

/**
 * Predefined rate limit configurations for different API categories
 */
export const RATE_LIMIT_CONFIGS = {
  /**
   * AI APIs (chat, generate, evaluate) - Stricter limits
   * These are expensive operations that call Vertex AI
   */
  ai: {
    maxRequests: 20,
    windowMs: 60000, // 1 minute
    message: "AI API rate limit exceeded. Please wait before making more AI requests.",
  } as RateLimitConfig,

  /**
   * Authentication APIs - Moderate limits to prevent brute force
   */
  auth: {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    message: "Too many authentication attempts. Please wait before trying again.",
  } as RateLimitConfig,

  /**
   * Standard APIs - Default limits
   */
  standard: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    message: "Rate limit exceeded. Please slow down your requests.",
  } as RateLimitConfig,

  /**
   * Admin APIs - Moderate limits
   */
  admin: {
    maxRequests: 30,
    windowMs: 60000, // 1 minute
    message: "Admin API rate limit exceeded.",
  } as RateLimitConfig,
} as const;

/**
 * API path patterns and their corresponding rate limit categories
 */
export interface ApiPathPattern {
  pattern: RegExp;
  category: keyof typeof RATE_LIMIT_CONFIGS;
}

/**
 * API paths that should be rate limited, ordered by priority
 */
export const API_RATE_LIMIT_PATTERNS: ApiPathPattern[] = [
  // AI-related APIs (most restrictive)
  { pattern: /^\/api\/chat/, category: "ai" },
  { pattern: /^\/api\/discovery\/chat/, category: "ai" },
  { pattern: /^\/api\/pbl\/chat/, category: "ai" },
  { pattern: /^\/api\/pbl\/generate-feedback/, category: "ai" },
  { pattern: /^\/api\/pbl\/evaluate/, category: "ai" },
  { pattern: /^\/api\/discovery\/programs\/[^/]+\/regenerate/, category: "ai" },
  { pattern: /^\/api\/discovery\/programs\/[^/]+\/evaluation/, category: "ai" },
  { pattern: /^\/api\/discovery\/programs\/[^/]+\/translate-feedback/, category: "ai" },
  { pattern: /^\/api\/discovery\/translate/, category: "ai" },
  { pattern: /^\/api\/scenarios\/generate/, category: "ai" },
  { pattern: /^\/api\/assessment\/programs\/[^/]+\/evaluation/, category: "ai" },
  { pattern: /^\/api\/pbl\/tasks\/[^/]+\/evaluate/, category: "ai" },
  { pattern: /^\/api\/pbl\/tasks\/[^/]+\/translate-evaluation/, category: "ai" },
  { pattern: /^\/api\/evaluations/, category: "ai" },
  { pattern: /^\/api\/reports\/weekly/, category: "ai" }, // Uses AI for insights

  // Authentication APIs
  { pattern: /^\/api\/auth\/login/, category: "auth" },
  { pattern: /^\/api\/auth\/register/, category: "auth" },
  { pattern: /^\/api\/auth\/forgot-password/, category: "auth" },
  { pattern: /^\/api\/auth\/reset-password/, category: "auth" },
  { pattern: /^\/api\/auth\/verify-email/, category: "auth" },
  { pattern: /^\/api\/auth\/resend-verification/, category: "auth" },

  // Admin APIs
  { pattern: /^\/api\/admin/, category: "admin" },
];

/**
 * Paths that should be excluded from rate limiting
 */
export const RATE_LIMIT_EXCLUDED_PATHS = [
  /^\/api\/health/,
  /^\/api\/simple-health/,
  /^\/api\/monitoring\/health/,
  /^\/api\/monitoring\/status/,
  /^\/api\/auth\/check/, // Quick auth checks should not be limited
  /^\/api\/auth\/logout/, // Logout should always work
];

/**
 * Determine the rate limit category for a given path
 *
 * @param pathname - API path to check
 * @returns Rate limit configuration or null if excluded
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig | null {
  // Check if path is excluded from rate limiting
  for (const pattern of RATE_LIMIT_EXCLUDED_PATHS) {
    if (pattern.test(pathname)) {
      return null;
    }
  }

  // Find matching pattern
  for (const { pattern, category } of API_RATE_LIMIT_PATTERNS) {
    if (pattern.test(pathname)) {
      return RATE_LIMIT_CONFIGS[category];
    }
  }

  // Default to standard rate limiting for all other API routes
  return RATE_LIMIT_CONFIGS.standard;
}

/**
 * Add rate limit headers to a response
 *
 * @param response - NextResponse to add headers to
 * @param result - Rate limit result
 * @param config - Rate limit configuration
 * @returns Response with added headers
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
  config: RateLimitConfig
): NextResponse {
  response.headers.set("X-RateLimit-Limit", config.maxRequests.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set(
    "X-RateLimit-Reset",
    Math.ceil(result.resetTime / 1000).toString()
  );

  if (!result.allowed && result.retryAfter) {
    response.headers.set("Retry-After", result.retryAfter.toString());
  }

  return response;
}

/**
 * Create a rate limit exceeded response
 *
 * @param result - Rate limit result
 * @param config - Rate limit configuration
 * @returns 429 Too Many Requests response
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  config: RateLimitConfig
): NextResponse {
  const response = NextResponse.json(
    {
      error: "Too Many Requests",
      message: config.message || "Rate limit exceeded. Please try again later.",
      retryAfter: result.retryAfter,
    },
    { status: 429 }
  );

  return addRateLimitHeaders(response, result, config);
}
