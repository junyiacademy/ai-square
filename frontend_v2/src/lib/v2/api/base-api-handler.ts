/**
 * V2 Base API Handler
 * Provides consistent error handling, validation, and response formatting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/v2/utils/auth';
import { z } from 'zod';

export interface ApiContext {
  userId: string;
  userEmail: string;
  language: string;
  session: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: Record<string, any>;
}

export abstract class BaseApiHandler {
  /**
   * Main handler wrapper with error handling
   */
  protected async handle<T>(
    request: NextRequest,
    handler: (context: ApiContext) => Promise<T>
  ): Promise<NextResponse<ApiResponse<T>>> {
    try {
      // Get authenticated user
      const user = await getAuthUser();
      if (!user) {
        return this.unauthorized();
      }

      // Build context
      const context: ApiContext = {
        userId: user.email,
        userEmail: user.email,
        language: request.headers.get('accept-language')?.split(',')[0] || 'en',
        session: user
      };

      // Execute handler
      const result = await handler(context);

      // Return success response
      return this.success(result);
    } catch (error) {
      console.error('API Error:', error);
      
      // Handle known errors
      if (error instanceof z.ZodError) {
        return this.badRequest('Validation error', {
          errors: error.errors
        });
      }

      if (error instanceof ApiError) {
        return this.error(error.message, error.statusCode, error.details);
      }

      // Unknown error
      return this.serverError('An unexpected error occurred');
    }
  }

  /**
   * Validate request body with Zod schema
   */
  protected async validateBody<T>(
    request: NextRequest,
    schema: z.ZodSchema<T>
  ): Promise<T> {
    try {
      const body = await request.json();
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw error;
      }
      throw new ApiError('Invalid request body', 400);
    }
  }

  /**
   * Validate query parameters with Zod schema
   */
  protected validateQuery<T>(
    request: NextRequest,
    schema: z.ZodSchema<T>
  ): T {
    const searchParams = request.nextUrl.searchParams;
    const query: Record<string, any> = {};
    
    searchParams.forEach((value, key) => {
      // Handle array parameters
      if (query[key]) {
        if (Array.isArray(query[key])) {
          query[key].push(value);
        } else {
          query[key] = [query[key], value];
        }
      } else {
        query[key] = value;
      }
    });

    return schema.parse(query);
  }

  /**
   * Success response
   */
  protected success<T>(
    data: T,
    message?: string,
    metadata?: Record<string, any>
  ): NextResponse<ApiResponse<T>> {
    return NextResponse.json({
      success: true,
      data,
      message,
      metadata
    });
  }

  /**
   * Error response
   */
  protected error(
    error: string,
    status: number = 500,
    details?: any
  ): NextResponse<ApiResponse> {
    return NextResponse.json(
      {
        success: false,
        error,
        ...(details && { details })
      },
      { status }
    );
  }

  /**
   * Common error responses
   */
  protected unauthorized(message = 'Unauthorized'): NextResponse<ApiResponse> {
    return this.error(message, 401);
  }

  protected forbidden(message = 'Access denied'): NextResponse<ApiResponse> {
    return this.error(message, 403);
  }

  protected notFound(message = 'Resource not found'): NextResponse<ApiResponse> {
    return this.error(message, 404);
  }

  protected badRequest(message = 'Bad request', details?: any): NextResponse<ApiResponse> {
    return this.error(message, 400, details);
  }

  protected serverError(message = 'Internal server error'): NextResponse<ApiResponse> {
    return this.error(message, 500);
  }

  /**
   * Check resource ownership
   */
  protected async checkOwnership(
    resourceOwnerId: string,
    userId: string,
    resourceType = 'resource'
  ): Promise<void> {
    if (resourceOwnerId !== userId) {
      throw new ApiError(
        `You do not have access to this ${resourceType}`,
        403
      );
    }
  }

  /**
   * Rate limiting check (placeholder for future implementation)
   */
  protected async checkRateLimit(
    userId: string,
    action: string,
    limit = 100
  ): Promise<void> {
    // TODO: Implement rate limiting
    // For now, just return
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc')
  }),

  id: z.string().min(1),
  
  language: z.enum(['en', 'zhTW', 'zhCN', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it']).default('en'),
  
  status: z.enum(['created', 'active', 'paused', 'completed', 'abandoned']),
  
  type: z.enum(['pbl', 'discovery', 'assessment'])
};