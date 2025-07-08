/**
 * Base API Handler for V2 Routes
 * Provides consistent error handling and response formatting
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, QueryFilters } from '../types';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  allowedMethods?: HttpMethod[];
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export abstract class BaseApiHandler {
  protected options: ApiHandlerOptions;

  constructor(options: ApiHandlerOptions = {}) {
    this.options = {
      requireAuth: false,
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      ...options
    };
  }

  /**
   * Main request handler
   */
  async handle(request: NextRequest): Promise<NextResponse> {
    try {
      // Check allowed methods
      const method = request.method as HttpMethod;
      if (!this.options.allowedMethods?.includes(method)) {
        return this.methodNotAllowed();
      }

      // Check authentication if required
      if (this.options.requireAuth) {
        const authResult = await this.authenticate(request);
        if (!authResult.authenticated) {
          return this.unauthorized(authResult.message);
        }
      }

      // Route to appropriate handler
      switch (method) {
        case 'GET':
          return this.handleGet(request);
        case 'POST':
          return this.handlePost(request);
        case 'PUT':
          return this.handlePut(request);
        case 'PATCH':
          return this.handlePatch(request);
        case 'DELETE':
          return this.handleDelete(request);
        default:
          return this.methodNotAllowed();
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * HTTP method handlers (override in subclasses)
   */
  protected async handleGet(request: NextRequest): Promise<NextResponse> {
    return this.methodNotAllowed();
  }

  protected async handlePost(request: NextRequest): Promise<NextResponse> {
    return this.methodNotAllowed();
  }

  protected async handlePut(request: NextRequest): Promise<NextResponse> {
    return this.methodNotAllowed();
  }

  protected async handlePatch(request: NextRequest): Promise<NextResponse> {
    return this.methodNotAllowed();
  }

  protected async handleDelete(request: NextRequest): Promise<NextResponse> {
    return this.methodNotAllowed();
  }

  /**
   * Authentication handler (override in subclasses)
   */
  protected async authenticate(request: NextRequest): Promise<{ authenticated: boolean; message?: string; userId?: string }> {
    // Default implementation - always authenticated
    // Override this in subclasses to implement actual authentication
    return { authenticated: true };
  }

  /**
   * Helper methods
   */
  protected async getBody<T>(request: NextRequest): Promise<T> {
    try {
      return await request.json();
    } catch (error) {
      throw new Error('Invalid JSON body');
    }
  }

  protected getQueryParams(request: NextRequest): URLSearchParams {
    const { searchParams } = new URL(request.url);
    return searchParams;
  }

  protected getQueryFilters(request: NextRequest): QueryFilters {
    const params = this.getQueryParams(request);
    
    return {
      page: parseInt(params.get('page') || '1'),
      pageSize: parseInt(params.get('pageSize') || '20'),
      orderBy: params.get('orderBy') || undefined,
      orderDirection: (params.get('orderDirection') || 'desc') as 'asc' | 'desc',
      search: params.get('search') || undefined,
      filters: this.parseFilters(params)
    };
  }

  private parseFilters(params: URLSearchParams): Record<string, any> {
    const filters: Record<string, any> = {};
    
    // Extract filter parameters (those starting with 'filter.')
    for (const [key, value] of params.entries()) {
      if (key.startsWith('filter.')) {
        const filterKey = key.substring(7); // Remove 'filter.' prefix
        filters[filterKey] = value;
      }
    }
    
    return filters;
  }

  /**
   * Response builders
   */
  protected success<T>(data: T, metadata?: Record<string, any>): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      metadata
    };
    
    return NextResponse.json(response, { status: 200 });
  }

  protected created<T>(data: T, metadata?: Record<string, any>): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      metadata
    };
    
    return NextResponse.json(response, { status: 201 });
  }

  protected noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
  }

  protected badRequest(error: string): NextResponse {
    const response: ApiResponse<never> = {
      success: false,
      error
    };
    
    return NextResponse.json(response, { status: 400 });
  }

  protected unauthorized(error: string = 'Unauthorized'): NextResponse {
    const response: ApiResponse<never> = {
      success: false,
      error
    };
    
    return NextResponse.json(response, { status: 401 });
  }

  protected forbidden(error: string = 'Forbidden'): NextResponse {
    const response: ApiResponse<never> = {
      success: false,
      error
    };
    
    return NextResponse.json(response, { status: 403 });
  }

  protected notFound(error: string = 'Not found'): NextResponse {
    const response: ApiResponse<never> = {
      success: false,
      error
    };
    
    return NextResponse.json(response, { status: 404 });
  }

  protected methodNotAllowed(): NextResponse {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Method not allowed'
    };
    
    return NextResponse.json(response, { status: 405 });
  }

  protected conflict(error: string): NextResponse {
    const response: ApiResponse<never> = {
      success: false,
      error
    };
    
    return NextResponse.json(response, { status: 409 });
  }

  protected internalServerError(error: string = 'Internal server error'): NextResponse {
    const response: ApiResponse<never> = {
      success: false,
      error
    };
    
    return NextResponse.json(response, { status: 500 });
  }

  /**
   * Error handler
   */
  protected handleError(error: unknown): NextResponse {
    console.error('API error:', error);
    
    if (error instanceof Error) {
      return this.internalServerError(error.message);
    }
    
    return this.internalServerError();
  }

  /**
   * CORS headers helper
   */
  protected addCorsHeaders(response: NextResponse): NextResponse {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }
}