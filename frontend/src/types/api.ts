// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Error Response
export interface ErrorResponse {
  error: string;
  details?: string;
  statusCode?: number;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// Common Types
export interface TimestampedEntity {
  createdAt: string;
  updatedAt: string;
}

// Request with typed body
export interface TypedRequest<T = unknown> extends Request {
  json(): Promise<T>;
}