/**
 * Secure Session Token Management
 * 
 * Replaces the insecure base64 session with encrypted tokens
 * Uses crypto.randomBytes for secure token generation
 * Stores minimal session data server-side
 */

import crypto from 'crypto';

// In-memory session store (should be Redis in production)
const sessionStore = new Map<string, SessionData>();

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
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new session
   */
  static createSession(userData: {
    userId: string;
    email: string;
    role: string;
  }, rememberMe = false): string {
    const token = this.generateToken();
    const now = new Date();
    const expiresAt = new Date(now);
    
    // 24 hours default, 30 days if remember me
    expiresAt.setHours(expiresAt.getHours() + (rememberMe ? 24 * 30 : 24));

    const sessionData: SessionData = {
      userId: userData.userId,
      email: userData.email,
      role: userData.role,
      createdAt: now,
      expiresAt
    };

    sessionStore.set(token, sessionData);
    return token;
  }

  /**
   * Get session data from token
   */
  static getSession(token: string): SessionData | null {
    if (!token || !this.isValidTokenFormat(token)) {
      return null;
    }

    const session = sessionStore.get(token);
    if (!session) {
      return null;
    }

    // Check if expired
    if (new Date() > session.expiresAt) {
      sessionStore.delete(token);
      return null;
    }

    return session;
  }

  /**
   * Destroy a session
   */
  static destroySession(token: string): void {
    sessionStore.delete(token);
  }

  /**
   * Validate token format
   */
  static isValidTokenFormat(token: string): boolean {
    // 32 bytes = 64 hex characters
    return /^[a-f0-9]{64}$/i.test(token);
  }

  /**
   * Clean up expired sessions
   */
  static cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [token, session] of sessionStore.entries()) {
      if (now > session.expiresAt) {
        sessionStore.delete(token);
      }
    }
  }

  /**
   * Get all active sessions for a user (for security)
   */
  static getUserSessions(userId: string): string[] {
    const sessions: string[] = [];
    for (const [token, session] of sessionStore.entries()) {
      if (session.userId === userId) {
        sessions.push(token);
      }
    }
    return sessions;
  }

  /**
   * Revoke all sessions for a user (e.g., on password change)
   */
  static revokeUserSessions(userId: string): void {
    const userSessions = this.getUserSessions(userId);
    userSessions.forEach(token => sessionStore.delete(token));
  }
}

// Cleanup expired sessions every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    SecureSession.cleanupExpiredSessions();
  }, 60 * 60 * 1000); // 1 hour
}