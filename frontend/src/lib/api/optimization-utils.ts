/**
 * API Optimization Utilities
 * Common utilities for optimizing API performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { cacheService } from '@/lib/cache/cache-service';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import { withPerformanceTracking } from '@/lib/monitoring/performance-monitor';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  staleWhileRevalidate?: number;
  tags?: string[];
  useDistributedCache?: boolean; // Whether to use distributed cache (default: true)
}

interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Wrapper for GET endpoints with automatic caching
 */
export async function cachedGET<T>(
  request: NextRequest,
  handler: () => Promise<T>,
  options: CacheOptions = {}
): Promise<NextResponse> {
  return withPerformanceTracking(async () => {
    const url = new URL(request.url);
    const cacheKey = `api:${url.pathname}:${url.search}`;
    const { useDistributedCache = true } = options;
    
    const cache = useDistributedCache ? distributedCacheService : cacheService;
    
    // Use stale-while-revalidate if supported
    if (useDistributedCache && options.staleWhileRevalidate) {
      const result = await distributedCacheService.getWithRevalidation(
        cacheKey,
        handler,
        {
          ttl: (options.ttl || 300) * 1000,
          staleWhileRevalidate: options.staleWhileRevalidate * 1000
        }
      );
      
      return NextResponse.json({ ...result, cacheHit: false }, {
        headers: {
          'X-Cache': 'SWR',
          'Cache-Control': `public, max-age=${options.ttl || 300}, stale-while-revalidate=${options.staleWhileRevalidate || 3600}`
        }
      });
    }
    
    // Traditional cache approach
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cacheHit: true }, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': `public, max-age=${options.ttl || 300}, stale-while-revalidate=${options.staleWhileRevalidate || 3600}`
        }
      });
    }
    
    // Execute handler
    try {
      const result = await handler();
      
      // Cache the result
      await cache.set(cacheKey, result, { 
        ttl: (options.ttl || 300) * 1000 // Convert to milliseconds
      });
      
      return NextResponse.json({ ...result, cacheHit: false }, {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': `public, max-age=${options.ttl || 300}, stale-while-revalidate=${options.staleWhileRevalidate || 3600}`
        }
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: 500 }
      );
    }
  }, new URL(request.url).pathname, 'GET');
}

/**
 * Extract pagination parameters from request
 */
export function getPaginationParams(request: NextRequest): PaginationParams {
  const { searchParams } = new URL(request.url);
  
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;
  
  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)), // Max 100 items per page
    offset
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const { page = 1, limit = 20 } = params;
  const totalPages = Math.ceil(total / limit);
  
  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

/**
 * Execute multiple async operations in parallel
 */
export async function parallel<T extends readonly unknown[]>(
  ...promises: { [K in keyof T]: Promise<T[K]> }
): Promise<T> {
  return Promise.all(promises) as Promise<T>;
}

/**
 * Batch multiple database queries into one
 */
export async function batchQueries<T, R>(
  items: T[],
  batchSize: number,
  handler: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await handler(batch);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Stream large JSON responses
 */
export function streamJSON(data: unknown[], chunkSize = 100): ReadableStream {
  let index = 0;
  
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"data":['));
    },
    
    pull(controller) {
      if (index >= data.length) {
        controller.enqueue(new TextEncoder().encode(']}'));
        controller.close();
        return;
      }
      
      const chunk = data.slice(index, index + chunkSize);
      const jsonChunk = chunk.map((item, i) => {
        const json = JSON.stringify(item);
        return i === 0 && index === 0 ? json : ',' + json;
      }).join('');
      
      controller.enqueue(new TextEncoder().encode(jsonChunk));
      index += chunkSize;
    }
  });
}

/**
 * Select only specific fields from objects (reduces payload size)
 */
export function selectFields<T extends Record<string, unknown>, K extends keyof T>(
  items: T[],
  fields: K[]
): Pick<T, K>[] {
  return items.map(item => {
    const selected = {} as Pick<T, K>;
    for (const field of fields) {
      if (field in item) {
        selected[field] = item[field];
      }
    }
    return selected;
  });
}

/**
 * Compress response if supported by client
 */
export function compressedResponse(
  data: unknown,
  request: NextRequest
): NextResponse {
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  const response = NextResponse.json(data);
  
  if (acceptEncoding.includes('gzip')) {
    response.headers.set('Content-Encoding', 'gzip');
  } else if (acceptEncoding.includes('br')) {
    response.headers.set('Content-Encoding', 'br');
  }
  
  return response;
}

/**
 * Rate limiting decorator
 */
const rateLimitMap = new Map<string, number[]>();

export function rateLimit(
  windowMs: number = 60000, // 1 minute
  maxRequests: number = 60
) {
  return (request: NextRequest): { allowed: boolean; retryAfter?: number } => {
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const requests = rateLimitMap.get(ip) || [];
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= maxRequests) {
      const oldestRequest = recentRequests[0];
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      
      return { allowed: false, retryAfter };
    }
    
    recentRequests.push(now);
    rateLimitMap.set(ip, recentRequests);
    
    return { allowed: true };
  };
}

/**
 * Memoization for expensive computations
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  maxAge: number = 5 * 60 * 1000 // 5 minutes
): T {
  const cache = new Map<string, { value: unknown; timestamp: number }>();
  
  return ((...args: unknown[]) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.value;
    }
    
    const value = fn(...args);
    cache.set(key, { value, timestamp: Date.now() });
    
    // Clean up old entries
    if (cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of cache.entries()) {
        if (now - v.timestamp > maxAge) {
          cache.delete(k);
        }
      }
    }
    
    return value;
  }) as T;
}