/**
 * Authenticated fetch wrapper that always includes credentials
 * This ensures cookies are sent with every request in production
 *
 * IMPORTANT: For user-specific data (programs, evaluations, profile, etc.),
 * this function automatically disables caching to prevent showing
 * cached data from a previous user after account switching.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  // User-specific API patterns that should never be cached
  const userDataPatterns = [
    '/programs',      // User's programs
    '/user/',         // User endpoints
    '/profile',       // User profile
    '/evaluations',   // User evaluations
    '/history',       // User history
    '/my-programs',   // User's programs list
  ];

  // Check if this is a user-specific request
  const isUserSpecificRequest = userDataPatterns.some(pattern => url.includes(pattern));

  const options: RequestInit = {
    ...init,
    credentials: 'include', // Always include cookies
  };

  // Disable cache for user-specific requests to prevent cross-user data leakage
  if (isUserSpecificRequest && !init?.cache) {
    options.cache = 'no-store';
  }

  // Only add headers if they exist in init
  if (init?.headers) {
    options.headers = init.headers;
  }

  return fetch(input, options);
}

// Export as default for easy drop-in replacement
export default authenticatedFetch;