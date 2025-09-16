/**
 * Secure Session Token Management
 *
 * This file now delegates to PostgresSession for persistent storage
 * Sessions are stored in PostgreSQL database for persistence across restarts
 * Maintains backward compatibility with existing code
 */

import { PostgresSession } from './postgres-session';
// import { memorySession } from './memory-session';

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: Date;
  expiresAt: Date;
}

// Always use PostgreSQL for session storage
// const usePostgreSQL = true;

export class SecureSession {
  /**
   * Generate a secure session token
   */
  static generateToken(): string {
    return PostgresSession.generateToken();
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
    PostgresSession.createSession(userData, rememberMe).catch(error => {
      console.error('[SecureSession] Failed to create session:', error);
    });

    return token;
  }

  /**
   * Create a new session (async version - preferred)
   * Uses PostgreSQL for persistent storage
   */
  static async createSessionAsync(userData: {
    userId: string;
    email: string;
    role: string;
  }, rememberMe = false): Promise<string> {
    return await PostgresSession.createSession(userData, rememberMe);
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
    return await PostgresSession.getSession(token);
  }

  /**
   * Destroy a session
   */
  static destroySession(token: string): void {
    // Fire and forget
    PostgresSession.destroySession(token).catch(error => {
      console.error('[SecureSession] Failed to destroy session:', error);
    });
  }

  /**
   * Destroy a session (async version)
   */
  static async destroySessionAsync(token: string): Promise<void> {
    return await PostgresSession.destroySession(token);
  }

  /**
   * Validate token format
   */
  static isValidTokenFormat(token: string): boolean {
    // Simple hex token validation
    return /^[a-f0-9]{64}$/i.test(token);
  }

  /**
   * Clean up expired sessions
   */
  static cleanupExpiredSessions(): void {
    PostgresSession.cleanupExpiredSessions();
  }

  /**
   * Get all active sessions for a user (async only)
   */
  static async getUserSessions(_userId: string): Promise<string[]> {
    // Not implemented yet, return empty array
    return [];
  }

  /**
   * Revoke all sessions for a user (async only)
   */
  static async revokeUserSessions(_userId: string): Promise<void> {
    // Not implemented yet
    return;
  }
}
