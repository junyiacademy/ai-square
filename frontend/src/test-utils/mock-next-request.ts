import { NextRequest } from 'next/server'

/**
 * Create a properly mocked NextRequest for testing
 * This ensures nextUrl is properly initialized with searchParams
 */
export function createMockNextRequest(
  url: string,
  options?: RequestInit & { 
    searchParams?: Record<string, string>
  }
) {
  // Build URL with search params
  const fullUrl = new URL(url, 'http://localhost:3000')
  
  if (options?.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      fullUrl.searchParams.set(key, value)
    })
  }
  
  // Create request with proper URL
  const { signal, ...optionsWithoutSearchParams } = options || {};
  // Remove searchParams from options if it exists
  delete (optionsWithoutSearchParams as any).searchParams;
  
  const request = new NextRequest(fullUrl.toString(), {
    ...optionsWithoutSearchParams,
    ...(signal && signal !== null ? { signal } : {})
  })
  
  return request
}

/**
 * Create a mock POST request with JSON body
 */
export function createMockPostRequest(
  url: string,
  body: unknown,
  options?: RequestInit
) {
  return createMockNextRequest(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    body: JSON.stringify(body)
  })
}