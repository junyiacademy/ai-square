/**
 * In-Memory Session Store for Development
 * WARNING: This is only for local development. Production should use Redis.
 */

import crypto from 'crypto';

interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: Date;
  expiresAt: Date;
}

class MemorySessionStore {
  private sessions: Map<string, SessionData> = new Map();

  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async createSession(userData: {
    userId: string;
    email: string;
    role: string;
  }, rememberMe = false): Promise<string> {
    const token = this.generateToken();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
    );

    this.sessions.set(token, {
      ...userData,
      createdAt: now,
      expiresAt
    });

    // Clean up expired sessions
    this.cleanupExpiredSessions();

    return token;
  }

  async getSession(token: string): Promise<SessionData | null> {
    const session = this.sessions.get(token);
    if (!session) return null;

    if (new Date() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
      }
    }
  }
}

// Singleton instance
export const memorySession = new MemorySessionStore();
