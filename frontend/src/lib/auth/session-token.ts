import { createHmacSignature } from './crypto-utils';

// Simple session token management for localStorage-based auth
// In production, this should be replaced with proper JWT tokens

interface SessionData {
  userId: string;
  email: string;
  timestamp: number;
  signature?: string;
}

const SESSION_KEY = 'ai_square_session';
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Server-side only: Create a signed session token
export async function createSessionToken(userId: string, email: string): Promise<string> {
  const sessionData: SessionData = {
    userId,
    email,
    timestamp: Date.now()
  };
  
  // In production, use a proper secret key from environment variables
  const secret = process.env.SESSION_SECRET || 'dev-secret-key';
  const signature = await createHmacSignature(
    secret,
    JSON.stringify({ userId, email, timestamp: sessionData.timestamp })
  );
  
  sessionData.signature = signature;
  
  return Buffer.from(JSON.stringify(sessionData)).toString('base64');
}

// Server-side only: Verify and decode session token
export async function verifySessionToken(token: string): Promise<SessionData | null> {
  try {
    const sessionData = JSON.parse(Buffer.from(token, 'base64').toString()) as SessionData;
    
    // Check expiry
    if (Date.now() - sessionData.timestamp > SESSION_TTL) {
      return null;
    }
    
    // Verify signature
    const secret = process.env.SESSION_SECRET || 'dev-secret-key';
    const expectedSignature = await createHmacSignature(
      secret,
      JSON.stringify({ 
        userId: sessionData.userId, 
        email: sessionData.email, 
        timestamp: sessionData.timestamp 
      })
    );
    
    if (sessionData.signature !== expectedSignature) {
      return null;
    }
    
    return sessionData;
  } catch {
    return null;
  }
}

// Client-side: Store session token
export function storeSessionToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, token);
  }
}

// Client-side: Get session token
export function getSessionToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(SESSION_KEY);
  }
  return null;
}

// Client-side: Clear session
export function clearSessionToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}