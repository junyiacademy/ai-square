import {
  StorageError,
  StorageNotFoundError,
  StorageQuotaExceededError,
  StorageConnectionError,
  StoragePermissionError,
  StorageValidationError
} from '../storage.errors';

describe('Storage Errors', () => {
  describe('StorageError base class', () => {
    it('creates error with message and code', () => {
      const error = new StorageError('Test error', 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('StorageError');
      expect(error.stack).toBeDefined();
    });

    it('creates error with cause', () => {
      const cause = new Error('Original error');
      const error = new StorageError('Wrapped error', 'WRAPPED', cause);

      expect(error.message).toBe('Wrapped error');
      expect(error.code).toBe('WRAPPED');
      expect(error.cause).toBe(cause);
    });

    it('maintains correct prototype chain', () => {
      const error = new StorageError('Test', 'TEST');

      expect(error).toBeInstanceOf(StorageError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('StorageNotFoundError', () => {
    it('creates not found error with key', () => {
      const error = new StorageNotFoundError('user:123');

      expect(error.message).toBe('Item not found: user:123');
      expect(error.code).toBe('STORAGE_NOT_FOUND');
      expect(error.name).toBe('StorageError');
    });

    it('inherits from StorageError', () => {
      const error = new StorageNotFoundError('test');

      expect(error).toBeInstanceOf(StorageError);
      expect(error).toBeInstanceOf(StorageNotFoundError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('StorageQuotaExceededError', () => {
    it('creates quota exceeded error with default message', () => {
      const error = new StorageQuotaExceededError();

      expect(error.message).toBe('Storage quota exceeded');
      expect(error.code).toBe('STORAGE_QUOTA_EXCEEDED');
    });

    it('creates quota exceeded error with custom message', () => {
      const error = new StorageQuotaExceededError('Disk space full');

      expect(error.message).toBe('Disk space full');
      expect(error.code).toBe('STORAGE_QUOTA_EXCEEDED');
    });

    it('inherits from StorageError', () => {
      const error = new StorageQuotaExceededError();

      expect(error).toBeInstanceOf(StorageError);
      expect(error).toBeInstanceOf(StorageQuotaExceededError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('StorageConnectionError', () => {
    it('creates connection error with message', () => {
      const error = new StorageConnectionError('Cannot connect to Redis');

      expect(error.message).toBe('Cannot connect to Redis');
      expect(error.code).toBe('STORAGE_CONNECTION_ERROR');
      expect(error.cause).toBeUndefined();
    });

    it('creates connection error with cause', () => {
      const cause = new Error('ECONNREFUSED');
      const error = new StorageConnectionError('Redis connection failed', cause);

      expect(error.message).toBe('Redis connection failed');
      expect(error.code).toBe('STORAGE_CONNECTION_ERROR');
      expect(error.cause).toBe(cause);
    });

    it('inherits from StorageError', () => {
      const error = new StorageConnectionError('Test');

      expect(error).toBeInstanceOf(StorageError);
      expect(error).toBeInstanceOf(StorageConnectionError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('StoragePermissionError', () => {
    it('creates permission error', () => {
      const error = new StoragePermissionError('Access denied to bucket');

      expect(error.message).toBe('Access denied to bucket');
      expect(error.code).toBe('STORAGE_PERMISSION_ERROR');
    });

    it('inherits from StorageError', () => {
      const error = new StoragePermissionError('Test');

      expect(error).toBeInstanceOf(StorageError);
      expect(error).toBeInstanceOf(StoragePermissionError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('StorageValidationError', () => {
    it('creates validation error', () => {
      const error = new StorageValidationError('Invalid file format');

      expect(error.message).toBe('Invalid file format');
      expect(error.code).toBe('STORAGE_VALIDATION_ERROR');
    });

    it('inherits from StorageError', () => {
      const error = new StorageValidationError('Test');

      expect(error).toBeInstanceOf(StorageError);
      expect(error).toBeInstanceOf(StorageValidationError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Error handling patterns', () => {
    async function performStorageOperation(
      exists: boolean,
      hasSpace: boolean,
      connected: boolean,
      hasPermission: boolean,
      isValid: boolean
    ): Promise<{ success: boolean }> {
      if (!connected) {
        throw new StorageConnectionError('Database unreachable');
      }
      if (!hasPermission) {
        throw new StoragePermissionError('Insufficient permissions');
      }
      if (!isValid) {
        throw new StorageValidationError('Invalid data format');
      }
      if (!exists) {
        throw new StorageNotFoundError('item:123');
      }
      if (!hasSpace) {
        throw new StorageQuotaExceededError();
      }
      return { success: true };
    }

    it('handles different error types correctly', async () => {
      await expect(performStorageOperation(true, true, false, true, true))
        .rejects.toThrow(StorageConnectionError);

      await expect(performStorageOperation(true, true, true, false, true))
        .rejects.toThrow(StoragePermissionError);

      await expect(performStorageOperation(true, true, true, true, false))
        .rejects.toThrow(StorageValidationError);

      await expect(performStorageOperation(false, true, true, true, true))
        .rejects.toThrow(StorageNotFoundError);

      await expect(performStorageOperation(true, false, true, true, true))
        .rejects.toThrow(StorageQuotaExceededError);

      await expect(performStorageOperation(true, true, true, true, true))
        .resolves.toEqual({ success: true });
    });

    it('allows error type checking with error codes', async () => {
      try {
        await performStorageOperation(false, true, true, true, true);
      } catch (error) {
        expect(error).toBeInstanceOf(StorageNotFoundError);
        if (error instanceof StorageError) {
          expect(error.code).toBe('STORAGE_NOT_FOUND');
        }
      }
    });

    it('can wrap errors with causes', () => {
      const originalError = new Error('Network timeout');
      const storageError = new StorageConnectionError(
        'Failed to connect to storage',
        originalError
      );

      expect(storageError.cause).toBe(originalError);
      expect(storageError.message).toBe('Failed to connect to storage');
    });
  });
});
