// TODO: AppError, ValidationError, NotFoundError, UnauthorizedError don't exist in this module
// These tests should be updated to test the actual error classes that exist (storage.errors.ts)
/*
import { AppError, ValidationError, NotFoundError, UnauthorizedError } from '../AppError';

describe('AppError', () => {
  describe('AppError base class', () => {
    it('creates error with message and default status', () => {
      const error = new AppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('AppError');
      expect(error.stack).toBeDefined();
    });

    it('creates error with custom status code', () => {
      const error = new AppError('Bad request', 400);
      
      expect(error.message).toBe('Bad request');
      expect(error.statusCode).toBe(400);
    });

    it('captures stack trace', () => {
      const error = new AppError('Test error');
      
      expect(error.stack).toContain('AppError');
      expect(error.stack).toContain('AppError.test.ts');
    });
  });

  describe('ValidationError', () => {
    it('creates validation error with 400 status', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
    });

    it('inherits from AppError', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('NotFoundError', () => {
    it('creates not found error with 404 status', () => {
      const error = new NotFoundError('Resource not found');
      
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });

    it('inherits from AppError', () => {
      const error = new NotFoundError('Resource not found');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('UnauthorizedError', () => {
    it('creates unauthorized error with 401 status', () => {
      const error = new UnauthorizedError('Authentication required');
      
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('UnauthorizedError');
    });

    it('inherits from AppError', () => {
      const error = new UnauthorizedError('Authentication required');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Error handling patterns', () => {
    function processRequest(authorized: boolean, valid: boolean, exists: boolean) {
      if (!authorized) {
        throw new UnauthorizedError('User not authorized');
      }
      if (!valid) {
        throw new ValidationError('Invalid request data');
      }
      if (!exists) {
        throw new NotFoundError('Resource not found');
      }
      return { success: true };
    }

    it('handles different error types correctly', () => {
      expect(() => processRequest(false, true, true)).toThrow(UnauthorizedError);
      expect(() => processRequest(true, false, true)).toThrow(ValidationError);
      expect(() => processRequest(true, true, false)).toThrow(NotFoundError);
      expect(processRequest(true, true, true)).toEqual({ success: true });
    });

    it('allows error type checking', () => {
      try {
        processRequest(false, true, true);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        if (error instanceof UnauthorizedError) {
          expect(error.statusCode).toBe(401);
        }
      }
    });
  });
});
*/