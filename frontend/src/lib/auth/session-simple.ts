// Simplified session management without crypto for development
// In production, use proper JWT tokens with encryption

interface SessionData {
  userId: string;
  email: string;
  timestamp: number;
  rememberMe?: boolean;
}

const SESSION_KEY = 'ai_square_session';
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours (default)
const SESSION_TTL_REMEMBER = 30 * 24 * 60 * 60 * 1000; // 30 days (remember me)

// Server-side only: Create a simple session token
export function createSessionToken(userId: string, email: string, rememberMe: boolean = false): string {
  const sessionData: SessionData = {
    userId,
    email,
    timestamp: Date.now(),
    rememberMe
  };
  
  return Buffer.from(JSON.stringify(sessionData)).toString('base64');
}

// Server-side only: Verify and decode session token
export function verifySessionToken(token: string): SessionData | null {
  try {
    const sessionData = JSON.parse(Buffer.from(token, 'base64').toString()) as SessionData;
    
    // Check required fields
    if (!sessionData.userId || !sessionData.email || !sessionData.timestamp) {
      return null;
    }
    
    // Check expiry based on rememberMe flag
    const ttl = sessionData.rememberMe ? SESSION_TTL_REMEMBER : SESSION_TTL;
    if (Date.now() - sessionData.timestamp > ttl) {
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