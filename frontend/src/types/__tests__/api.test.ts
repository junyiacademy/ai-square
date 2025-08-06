/**
 * Unit tests for API response types
 * Tests API response interfaces and helper types
 */

import type {
  ApiResponse,
  ErrorResponse,
  PaginationParams,
  TimestampedEntity,
  TypedRequest
} from '@/types/api';

describe('API Types', () => {
  describe('ApiResponse interface', () => {
    it('should define successful API response structure', () => {
      const successResponse: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Operation completed successfully' },
        message: 'Success'
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toBeDefined();
      expect(successResponse.data?.message).toBe('Operation completed successfully');
      expect(successResponse.message).toBe('Success');
      expect(successResponse.error).toBeUndefined();
    });

    it('should define error API response structure', () => {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: 'Validation failed: Invalid input parameters',
        message: 'Validation failed'
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBe('Validation failed: Invalid input parameters');
      expect(errorResponse.message).toBe('Validation failed');
      expect(errorResponse.data).toBeUndefined();
    });

    it('should handle generic data types', () => {
      interface UserData {
        id: string;
        name: string;
        email: string;
      }

      const userResponse: ApiResponse<UserData> = {
        success: true,
        data: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com'
        }
      };

      expect(userResponse.success).toBe(true);
      expect(userResponse.data?.id).toBe('user-123');
      expect(userResponse.data?.name).toBe('John Doe');
    });

    it('should handle array data types', () => {
      interface Task {
        id: string;
        title: string;
        completed: boolean;
      }

      const tasksResponse: ApiResponse<Task[]> = {
        success: true,
        data: [
          { id: 'task-1', title: 'First task', completed: true },
          { id: 'task-2', title: 'Second task', completed: false }
        ]
      };

      expect(tasksResponse.success).toBe(true);
      expect(tasksResponse.data).toHaveLength(2);
      expect(tasksResponse.data?.[0].completed).toBe(true);
      expect(tasksResponse.data?.[1].completed).toBe(false);
    });

    it('should handle unknown data type', () => {
      const unknownResponse: ApiResponse = {
        success: true,
        data: { someProperty: 'someValue' },
        message: 'Unknown data processed'
      };

      expect(unknownResponse.success).toBe(true);
      expect(unknownResponse.data).toBeDefined();
      expect(unknownResponse.message).toBe('Unknown data processed');
    });

    it('should handle response without data', () => {
      const responseWithoutData: ApiResponse<undefined> = {
        success: true,
        message: 'Operation completed'
      };

      expect(responseWithoutData.success).toBe(true);
      expect(responseWithoutData.data).toBeUndefined();
      expect(responseWithoutData.message).toBe('Operation completed');
    });
  });

  describe('ErrorResponse interface', () => {
    it('should define basic error response structure', () => {
      const errorResponse: ErrorResponse = {
        error: 'The requested resource was not found',
        details: 'User ID does not exist in the database',
        statusCode: 404
      };

      expect(errorResponse.error).toBe('The requested resource was not found');
      expect(errorResponse.details).toBe('User ID does not exist in the database');
      expect(errorResponse.statusCode).toBe(404);
    });

    it('should allow minimal error response', () => {
      const minimalError: ErrorResponse = {
        error: 'Something went wrong'
      };

      expect(minimalError.error).toBe('Something went wrong');
      expect(minimalError.details).toBeUndefined();
      expect(minimalError.statusCode).toBeUndefined();
    });

    it('should handle different status codes', () => {
      const validationError: ErrorResponse = {
        error: 'Validation failed',
        details: 'Email format is invalid',
        statusCode: 400
      };

      const authError: ErrorResponse = {
        error: 'Unauthorized',
        statusCode: 401
      };

      const serverError: ErrorResponse = {
        error: 'Internal server error',
        statusCode: 500
      };

      expect(validationError.statusCode).toBe(400);
      expect(authError.statusCode).toBe(401);
      expect(serverError.statusCode).toBe(500);
    });
  });

  describe('PaginationParams interface', () => {
    it('should define pagination parameters with page and limit', () => {
      const paginationParams: PaginationParams = {
        page: 1,
        limit: 10
      };

      expect(paginationParams.page).toBe(1);
      expect(paginationParams.limit).toBe(10);
      expect(paginationParams.offset).toBeUndefined();
    });

    it('should define pagination parameters with offset', () => {
      const paginationWithOffset: PaginationParams = {
        limit: 20,
        offset: 40
      };

      expect(paginationWithOffset.limit).toBe(20);
      expect(paginationWithOffset.offset).toBe(40);
      expect(paginationWithOffset.page).toBeUndefined();
    });

    it('should allow all pagination parameters', () => {
      const fullPagination: PaginationParams = {
        page: 3,
        limit: 25,
        offset: 50
      };

      expect(fullPagination.page).toBe(3);
      expect(fullPagination.limit).toBe(25);
      expect(fullPagination.offset).toBe(50);
    });

    it('should allow empty pagination parameters', () => {
      const emptyPagination: PaginationParams = {};

      expect(emptyPagination.page).toBeUndefined();
      expect(emptyPagination.limit).toBeUndefined();
      expect(emptyPagination.offset).toBeUndefined();
    });
  });

  describe('TimestampedEntity interface', () => {
    it('should define timestamped entity structure', () => {
      const entity: TimestampedEntity = {
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T14:30:00Z'
      };

      expect(entity.createdAt).toBe('2024-01-01T10:00:00Z');
      expect(entity.updatedAt).toBe('2024-01-01T14:30:00Z');
    });

    it('should work with extended entities', () => {
      interface User extends TimestampedEntity {
        id: string;
        name: string;
        email: string;
      }

      const user: User = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T14:30:00Z'
      };

      expect(user.id).toBe('user-123');
      expect(user.name).toBe('John Doe');
      expect(user.createdAt).toBe('2024-01-01T10:00:00Z');
      expect(user.updatedAt).toBe('2024-01-01T14:30:00Z');
    });
  });

  describe('TypedRequest interface', () => {
    it('should define typed request structure', () => {
      interface LoginData {
        email: string;
        password: string;
      }

      // Create a mock request that implements TypedRequest
      const mockRequest = {
        method: 'POST',
        url: '/api/login',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async (): Promise<LoginData> => ({
          email: 'user@example.com',
          password: 'securepassword'
        })
      } as TypedRequest<LoginData>;

      expect(mockRequest.method).toBe('POST');
      expect(mockRequest.url).toBe('/api/login');
      expect(typeof mockRequest.json).toBe('function');
    });

    it('should handle different request body types', () => {
      interface TaskData {
        title: string;
        description: string;
        completed: boolean;
      }

      const taskRequest = {
        method: 'POST',
        json: async (): Promise<TaskData> => ({
          title: 'New Task',
          description: 'Task description',
          completed: false
        })
      } as TypedRequest<TaskData>;

      expect(typeof taskRequest.json).toBe('function');
    });

    it('should extend base Request interface', () => {
      interface UserData {
        name: string;
        age: number;
      }

      // TypedRequest should have all Request properties plus typed json()
      const typedRequest = {
        method: 'PUT',
        url: '/api/users/123',
        headers: new Headers(),
        body: JSON.stringify({ name: 'John', age: 30 }),
        json: async (): Promise<UserData> => ({ name: 'John', age: 30 })
      } as unknown as TypedRequest<UserData>;

      expect(typedRequest.method).toBe('PUT');
      expect(typedRequest.headers).toBeInstanceOf(Headers);
      expect(typeof typedRequest.json).toBe('function');
    });
  });

  describe('Type combinations and utilities', () => {
    it('should work with ApiResponse containing TimestampedEntity', () => {
      interface Post extends TimestampedEntity {
        id: string;
        title: string;
        content: string;
      }

      const postResponse: ApiResponse<Post> = {
        success: true,
        data: {
          id: 'post-123',
          title: 'My Blog Post',
          content: 'This is the content...',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        }
      };

      expect(postResponse.success).toBe(true);
      expect(postResponse.data?.id).toBe('post-123');
      expect(postResponse.data?.createdAt).toBeDefined();
      expect(postResponse.data?.updatedAt).toBeDefined();
    });

    it('should work with paginated responses using ApiResponse', () => {
      interface PaginatedData<T> {
        items: T[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }

      interface Item {
        id: string;
        name: string;
      }

      const paginatedResponse: ApiResponse<PaginatedData<Item>> = {
        success: true,
        data: {
          items: [
            { id: '1', name: 'Item 1' },
            { id: '2', name: 'Item 2' }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3
          }
        }
      };

      expect(paginatedResponse.success).toBe(true);
      expect(paginatedResponse.data?.items).toHaveLength(2);
      expect(paginatedResponse.data?.pagination.total).toBe(25);
    });

    it('should handle error responses with different data types', () => {
      const errorWithData: ApiResponse<{ attemptedValue: string }> = {
        success: false,
        error: 'Invalid input',
        data: {
          attemptedValue: 'invalid-email-format'
        }
      };

      expect(errorWithData.success).toBe(false);
      expect(errorWithData.error).toBe('Invalid input');
      expect(errorWithData.data?.attemptedValue).toBe('invalid-email-format');
    });
  });

  describe('Type exports validation', () => {
    it('should export all expected API types', () => {
      // Type assertion tests to ensure all types are properly exported
      const apiResponse = {} as ApiResponse<string>;
      const errorResponse = {} as ErrorResponse;
      const paginationParams = {} as PaginationParams;
      const timestampedEntity = {} as TimestampedEntity;
      const typedRequest = {} as TypedRequest<{ test: string }>;

      // If types are properly defined, these should not throw
      expect(apiResponse).toBeDefined();
      expect(errorResponse).toBeDefined();
      expect(paginationParams).toBeDefined();
      expect(timestampedEntity).toBeDefined();
      expect(typedRequest).toBeDefined();
    });
  });
});