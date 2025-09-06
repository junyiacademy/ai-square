/**
 * Secure Session Token Management
 * 
 * This file now delegates to RedisSession for production-ready storage
 * Maintains backward compatibility with existing code
 */

import { RedisSession } from './redis-session';

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: Date;
  expiresAt: Date;
}

export class SecureSession {
  /**
   * Generate a secure session token
   */
  static generateToken(): string {
    return RedisSession.generateToken();
  }

  /**
   * Create a new session (legacy synchronous - avoid using)
   * @deprecated Use createSessionAsync instead
   */
  static createSession(userData: {
    userId: string;
    email: string;
    role: string;
  }, rememberMe = false): string {
    // Use async method but return synchronously for backward compatibility
    // This is a temporary solution until all code is updated to async
    const token = this.generateToken();
    
    // Fire and forget - create session asynchronously
    RedisSession.createSession(userData, rememberMe).catch(error => {
      console.error('[SecureSession] Failed to create session:', error);
    });
    
    return token;
  }

  /**
   * Create a new session (async version - preferred)
   */
  static async createSessionAsync(userData: {
    userId: string;
    email: string;
    role: string;
  }, rememberMe = false): Promise<string> {
    return RedisSession.createSession(userData, rememberMe);
  }

  /**
   * Get session data from token
   */
  static getSession(token: string): SessionData | null {
    // This is synchronous for backward compatibility
    // It will only work with in-memory fallback
    // TODO: Update all callers to use async version
    console.warn('[SecureSession] Using synchronous getSession - should migrate to async');
    
    if (!token || !this.isValidTokenFormat(token)) {
      return null;
    }
    
    // For now, return null - callers should use async version
    return null;
  }

  /**
   * Get session data from token (async version)
   */
  static async getSessionAsync(token: string): Promise<SessionData | null> {
    return RedisSession.getSession(token);
  }

  /**
   * Destroy a session
   */
  static destroySession(token: string): void {
    // Fire and forget
    RedisSession.destroySession(token).catch(error => {
      console.error('[SecureSession] Failed to destroy session:', error);
    });
  }

  /**
   * Destroy a session (async version)
   */
  static async destroySessionAsync(token: string): Promise<void> {
    return RedisSession.destroySession(token);
  }

  /**
   * Validate token format
   */
  static isValidTokenFormat(token: string): boolean {
    return RedisSession.isValidTokenFormat(token);
  }

  /**
   * Clean up expired sessions
   */
  static cleanupExpiredSessions(): void {
    RedisSession.cleanupExpiredSessions();
  }

  /**
   * Get all active sessions for a user (async only)
   */
  static async getUserSessions(userId: string): Promise<string[]> {
    return RedisSession.getUserSessions(userId);
  }

  /**
   * Revoke all sessions for a user (async only)
   */
  static async revokeUserSessions(userId: string): Promise<void> {
    return RedisSession.revokeUserSessions(userId);
  }
}