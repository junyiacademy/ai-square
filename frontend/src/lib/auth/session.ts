import { cookies, headers } from 'next/headers';
import { verifySessionToken } from './session-token';

export interface Session {
  user: {
    id: string;
    email: string;
  };
}

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const headersList = await headers();
  
  // Check cookie first
  let sessionToken = cookieStore.get('session_token')?.value;
  
  // If not in cookie, check header (for API calls from client)
  if (!sessionToken) {
    sessionToken = headersList.get('x-session-token') || null;
  }
  
  if (!sessionToken) {
    return null;
  }
  
  const sessionData = verifySessionToken(sessionToken);
  if (!sessionData) {
    return null;
  }
  
  return {
    user: {
      id: sessionData.userId,
      email: sessionData.email
    }
  };
}