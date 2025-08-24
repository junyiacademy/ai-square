/**
 * Authenticated fetch wrapper that always includes credentials
 * This ensures cookies are sent with every request in production
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const options: RequestInit = {
    ...init,
    credentials: 'include', // Always include cookies
  };
  
  // Only add headers if they exist in init
  if (init?.headers) {
    options.headers = init.headers;
  }
  
  return fetch(input, options);
}

// Export as default for easy drop-in replacement
export default authenticatedFetch;