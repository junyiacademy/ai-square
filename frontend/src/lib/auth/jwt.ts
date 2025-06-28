import { SignJWT, jwtVerify } from 'jose';

// Get secret from environment or use a default for development
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
  return new TextEncoder().encode(secret);
};

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  name: string;
  exp?: number;
  iat?: number;
}

export interface RefreshTokenPayload {
  userId: number;
  exp?: number;
  iat?: number;
}

// Create access token (short-lived)
export async function createAccessToken(payload: Omit<TokenPayload, 'exp' | 'iat'>): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m') // 15 minutes
    .sign(getJwtSecret());
  
  return token;
}

// Create refresh token (long-lived)
export async function createRefreshToken(userId: number, rememberMe: boolean = false): Promise<string> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(rememberMe ? '30d' : '7d') // 30 days if Remember Me, otherwise 7 days
    .sign(getJwtSecret());
  
  return token;
}

// Verify access token
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as TokenPayload;
  } catch (error) {
    console.error('Access token verification failed:', error);
    return null;
  }
}

// Verify refresh token
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as RefreshTokenPayload;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
}

// Check if token is expired or about to expire (within 5 minutes)
export function isTokenExpiringSoon(exp: number | undefined): boolean {
  if (!exp) return true;
  
  const now = Math.floor(Date.now() / 1000);
  const fiveMinutes = 5 * 60;
  
  return exp - now < fiveMinutes;
}