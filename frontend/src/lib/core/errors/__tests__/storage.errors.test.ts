import { 
  StorageError, 
  StorageNotFoundError, 
  StorageQuotaExceededError,
  StorageConnectionError,
  StoragePermissionError,
  StorageValidationError
} from '../storage.errors';

describe('storage.errors', () => {
  describe('StorageError', () => {
    it('should be defined', () => {
      expect(StorageError).toBeDefined();
    });
    
    it('should create error with message', () => {
      const error = new StorageError('Test error', 'TEST_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
    });
    
    it('should be an instance of Error', () => {
      const error = new StorageError('Test', 'TEST');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StorageError);
    });
  });
  
  describe('StorageNotFoundError', () => {
    it('should be defined', () => {
      expect(StorageNotFoundError).toBeDefined();
    });
    
    it('should create error with message', () => {
      const error = new StorageNotFoundError('File not found');
      expect(error.message).toBe('Item not found: File not found');
    });
    
    it('should be an instance of StorageError', () => {
      const error = new StorageNotFoundError('Not found');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StorageError);
      expect(error).toBeInstanceOf(StorageNotFoundError);
    });
  });
  
  describe('StorageQuotaExceededError', () => {
    it('should be defined', () => {
      expect(StorageQuotaExceededError).toBeDefined();
    });
    
    it('should create error with message', () => {
      const error = new StorageQuotaExceededError('Quota exceeded');
      expect(error.message).toBe('Quota exceeded');
    });
    
    it('should be an instance of StorageError', () => {
      const error = new StorageQuotaExceededError('Quota');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StorageError);
      expect(error).toBeInstanceOf(StorageQuotaExceededError);
    });
  });
  
  describe('StorageConnectionError', () => {
    it('should be defined', () => {
      expect(StorageConnectionError).toBeDefined();
    });
    
    it('should create error with message', () => {
      const error = new StorageConnectionError('Connection failed');
      expect(error.message).toBe('Connection failed');
    });
    
    it('should be an instance of StorageError', () => {
      const error = new StorageConnectionError('Connection');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StorageError);
      expect(error).toBeInstanceOf(StorageConnectionError);
    });
  });
  
  describe('StoragePermissionError', () => {
    it('should be defined', () => {
      expect(StoragePermissionError).toBeDefined();
    });
    
    it('should create error with message', () => {
      const error = new StoragePermissionError('Permission denied');
      expect(error.message).toBe('Permission denied');
    });
    
    it('should be an instance of StorageError', () => {
      const error = new StoragePermissionError('Permission');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StorageError);
      expect(error).toBeInstanceOf(StoragePermissionError);
    });
  });
  
  describe('StorageValidationError', () => {
    it('should be defined', () => {
      expect(StorageValidationError).toBeDefined();
    });
    
    it('should create error with message', () => {
      const error = new StorageValidationError('Validation failed');
      expect(error.message).toBe('Validation failed');
    });
    
    it('should be an instance of StorageError', () => {
      const error = new StorageValidationError('Validation');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StorageError);
      expect(error).toBeInstanceOf(StorageValidationError);
    });
  });
});