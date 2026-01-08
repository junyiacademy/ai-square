/**
 * Redis-based Session Storage
 *
 * Production-ready session storage using Redis
 * Falls back to in-memory storage if Redis is unavailable
 */

import crypto from "crypto";
import { getRedisClient } from "@/lib/cache/redis-client";
import type Redis from "ioredis";

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: Date;
  expiresAt: Date;
}

// In-memory fallback for when Redis is unavailable
const memoryStore = new Map<string, SessionData>();

// Session TTL in seconds
const DEFAULT_TTL = 24 * 60 * 60; // 24 hours
const REMEMBER_ME_TTL = 30 * 24 * 60 * 60; // 30 days

export class RedisSession {
  private static readonly PREFIX = "session:";

  /**
   * Get Redis client if available
   */
  private static async getRedis(): Promise<Redis | null> {
    try {
      return await getRedisClient();
    } catch {
      return null;
    }
  }

  /**
   * Generate a secure session token
   */
  static generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Create a new session
   */
  static async createSession(
    userData: {
      userId: string;
      email: string;
      role: string;
    },
    rememberMe = false,
  ): Promise<string> {
    const token = this.generateToken();
    const now = new Date();
    const ttl = rememberMe ? REMEMBER_ME_TTL : DEFAULT_TTL;
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    const sessionData: SessionData = {
      userId: userData.userId,
      email: userData.email,
      role: userData.role,
      createdAt: now,
      expiresAt,
    };

    // Try Redis first
    const redis = await this.getRedis();
    if (redis) {
      try {
        const key = `${this.PREFIX}${token}`;
        await redis.setex(key, ttl, JSON.stringify(sessionData));
        console.log("[RedisSession] Session stored in Redis");
        return token;
      } catch (error) {
        console.error(
          "[RedisSession] Redis storage failed, falling back to memory:",
          error,
        );
      }
    }

    // Fallback to memory
    memoryStore.set(token, sessionData);
    console.log("[RedisSession] Session stored in memory (fallback)");

    // Schedule cleanup for memory store
    setTimeout(() => {
      memoryStore.delete(token);
    }, ttl * 1000);

    return token;
  }

  /**
   * Get session data from token
   */
  static async getSession(token: string): Promise<SessionData | null> {
    if (!token || !this.isValidTokenFormat(token)) {
      return null;
    }

    // Try Redis first
    const redis = await this.getRedis();
    if (redis) {
      try {
        const key = `${this.PREFIX}${token}`;
        const data = await redis.get(key);

        if (data) {
          const session = JSON.parse(data) as SessionData;
          // Convert string dates back to Date objects
          session.createdAt = new Date(session.createdAt);
          session.expiresAt = new Date(session.expiresAt);

          // Check if expired
          if (new Date() > session.expiresAt) {
            await this.destroySession(token);
            return null;
          }

          return session;
        }
      } catch (error) {
        console.error(
          "[RedisSession] Redis retrieval failed, falling back to memory:",
          error,
        );
      }
    }

    // Fallback to memory
    const session = memoryStore.get(token);
    if (!session) {
      return null;
    }

    // Check if expired
    if (new Date() > session.expiresAt) {
      memoryStore.delete(token);
      return null;
    }

    return session;
  }

  /**
   * Destroy a session
   */
  static async destroySession(token: string): Promise<void> {
    // Try Redis first
    const redis = await this.getRedis();
    if (redis) {
      try {
        const key = `${this.PREFIX}${token}`;
        await redis.del(key);
      } catch (error) {
        console.error("[RedisSession] Redis deletion failed:", error);
      }
    }

    // Also delete from memory
    memoryStore.delete(token);
  }

  /**
   * Validate token format
   */
  static isValidTokenFormat(token: string): boolean {
    // 32 bytes = 64 hex characters
    return /^[a-f0-9]{64}$/i.test(token);
  }

  /**
   * Clean up expired sessions (for memory store)
   */
  static cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [token, session] of memoryStore.entries()) {
      if (now > session.expiresAt) {
        memoryStore.delete(token);
      }
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<string[]> {
    const sessions: string[] = [];

    // Check Redis
    const redis = await this.getRedis();
    if (redis) {
      try {
        const keys = await redis.keys(`${this.PREFIX}*`);
        for (const key of keys) {
          const data = await redis.get(key);
          if (data) {
            const session = JSON.parse(data) as SessionData;
            if (session.userId === userId) {
              sessions.push(key.replace(this.PREFIX, ""));
            }
          }
        }
      } catch (error) {
        console.error(
          "[RedisSession] Error getting user sessions from Redis:",
          error,
        );
      }
    }

    // Also check memory store
    for (const [token, session] of memoryStore.entries()) {
      if (session.userId === userId && !sessions.includes(token)) {
        sessions.push(token);
      }
    }

    return sessions;
  }

  /**
   * Revoke all sessions for a user
   */
  static async revokeUserSessions(userId: string): Promise<void> {
    const userSessions = await this.getUserSessions(userId);
    for (const token of userSessions) {
      await this.destroySession(token);
    }
  }

  /**
   * Extend session expiry (for remember me functionality)
   */
  static async extendSession(
    token: string,
    rememberMe = false,
  ): Promise<boolean> {
    const session = await this.getSession(token);
    if (!session) {
      return false;
    }

    const ttl = rememberMe ? REMEMBER_ME_TTL : DEFAULT_TTL;
    const newExpiresAt = new Date(Date.now() + ttl * 1000);
    session.expiresAt = newExpiresAt;

    // Update in Redis
    const redis = await this.getRedis();
    if (redis) {
      try {
        const key = `${this.PREFIX}${token}`;
        await redis.setex(key, ttl, JSON.stringify(session));
        return true;
      } catch (error) {
        console.error(
          "[RedisSession] Failed to extend session in Redis:",
          error,
        );
      }
    }

    // Update in memory
    memoryStore.set(token, session);
    return true;
  }
}

// Cleanup expired sessions every hour (for memory store)
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      RedisSession.cleanupExpiredSessions();
    },
    60 * 60 * 1000,
  ); // 1 hour
}
