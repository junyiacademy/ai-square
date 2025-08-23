import { cookies, headers } from 'next/headers';
import { verifySessionToken } from './session-simple';

export interface Session {
  user: {
    id: string;
    email: string;
  };
}

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const headersList = await headers();
  
  // Check for session token first (new JWT system)
  let sessionToken = cookieStore.get('sessionToken')?.value;
  
  // If not in cookie, check header (for API calls from client)
  if (!sessionToken) {
    sessionToken = headersList.get('x-session-token') || undefined;
  }
  
  if (sessionToken) {
    const sessionData = verifySessionToken(sessionToken);
    if (sessionData) {
      return {
        user: {
          id: sessionData.userId,
          email: sessionData.email
        }
      };
    }
  }
  
  // Fall back to existing cookie-based authentication
  const isLoggedIn = cookieStore.get('isLoggedIn')?.value === 'true';
  const userCookie = cookieStore.get('user')?.value;
  
  if (isLoggedIn && userCookie) {
    try {
      const userData = JSON.parse(userCookie);
      if (userData.email) {
        return {
          user: {
            id: userData.id?.toString() || userData.email, // Use email as fallback ID
            email: userData.email
          }
        };
      }
    } catch (error) {
      console.error('Error parsing user cookie:', error);
    }
  }
  
  return null;
}

// Alias for getServerSession
export const getSession = getServerSession;