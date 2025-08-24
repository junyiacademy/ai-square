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
  
  // Check for session token (new JWT system)
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
  
  // NO FALLBACK to old cookies - users must use the new system
  return null;
}

// Alias for getServerSession
export const getSession = getServerSession;