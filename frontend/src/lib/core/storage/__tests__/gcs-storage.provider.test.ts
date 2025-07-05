/**
 * GCSStorageProvider 測試
 */

import { GCSStorageProvider } from '../providers/gcs-storage.provider';
import { StorageError, StorageQuotaExceededError } from '../../errors';

// Mock @google-cloud/storage
jest.mock('@google-cloud/storage', () => {
  return {
    Storage: jest.fn().mockImplementation(() => {
      return {
        bucket: jest.fn().mockImplementation((bucketName: string) => {
          return mockBucket;
        })
      };
    })
  };
});

// Mock bucket 實現
const mockBucket = {
  file: jest.fn(),
  getFiles: jest.fn()
};

// Mock file 實現
const createMockFile = (exists: boolean, metadata?: any, content?: any) => ({
  exists: jest.fn().mockResolvedValue([exists]),
  getMetadata: jest.fn().mockResolvedValue([{ metadata: metadata || {} }]),
  download: jest.fn().mockResolvedValue([Buffer.from(JSON.stringify(content || {}))]),
  save: jest.fn().mockResolvedValue([]),
  delete: jest.fn().mockResolvedValue([]),
  name: 'test-file'
});

describe('GCSStorageProvider', () => {
  let provider: GCSStorageProvider;
  
  beforeEach(() => {
    jest.clearAllMocks();
    provider = new GCSStorageProvider('test-bucket', 'test-prefix');
  });
  
  describe('get/set operations', () => {
    it('should store and retrieve values', async () => {
      const testData = { id: 1, name: 'Test User' };
      const mockFile = createMockFile(true, {}, testData);
      mockBucket.file.mockReturnValue(mockFile);
      
      // Set
      await provider.set('user1', testData);
      expect(mockFile.save).toHaveBeenCalledWith(
        JSON.stringify(testData),
        expect.objectContaining({
          contentType: 'application/json'
        })
      );
      
      // Get
      const retrieved = await provider.get('user1');
      expect(retrieved).toEqual(testData);
    });
    
    it('should return null for non-existent keys', async () => {
      const mockFile = createMockFile(false);
      mockBucket.file.mockReturnValue(mockFile);
      
      const result = await provider.get('non-existent');
      expect(result).toBeNull();
    });
    
    it('should handle TTL expiration', async () => {
      const expiredMetadata = {
        expiresAt: new Date(Date.now() - 1000).toISOString()
      };
      const mockFile = createMockFile(true, expiredMetadata);
      mockBucket.file.mockReturnValue(mockFile);
      
      const result = await provider.get('expired-key');
      expect(result).toBeNull();
      expect(mockFile.delete).toHaveBeenCalled();
    });
    
    it('should handle storage quota exceeded', async () => {
      const mockFile = createMockFile(true);
      mockFile.save.mockRejectedValue(new Error('quota exceeded'));
      mockBucket.file.mockReturnValue(mockFile);
      
      await expect(provider.set('test', 'value')).rejects.toThrow(StorageQuotaExceededError);
    });
  });
  
  describe('delete operations', () => {
    it('should delete existing items', async () => {
      const mockFile = createMockFile(true);
      mockBucket.file.mockReturnValue(mockFile);
      
      await provider.delete('to-delete');
      expect(mockFile.delete).toHaveBeenCalled();
    });
    
    it('should not throw when deleting non-existent items', async () => {
      const mockFile = createMockFile(false);
      mockFile.delete.mockRejectedValue(new Error('No such object'));
      mockBucket.file.mockReturnValue(mockFile);
      
      await expect(provider.delete('non-existent')).resolves.not.toThrow();
    });
  });
  
  describe('exists operations', () => {
    it('should return true for existing items', async () => {
      const mockFile = createMockFile(true);
      mockBucket.file.mockReturnValue(mockFile);
      
      const exists = await provider.exists('exists-test');
      expect(exists).toBe(true);
    });
    
    it('should return false for non-existent items', async () => {
      const mockFile = createMockFile(false);
      mockBucket.file.mockReturnValue(mockFile);
      
      const exists = await provider.exists('non-existent');
      expect(exists).toBe(false);
    });
    
    it('should return false for expired items', async () => {
      const expiredMetadata = {
        expiresAt: new Date(Date.now() - 1000).toISOString()
      };
      const mockFile = createMockFile(true, expiredMetadata);
      mockBucket.file.mockReturnValue(mockFile);
      
      const exists = await provider.exists('expired');
      expect(exists).toBe(false);
    });
  });
  
  describe('list operations', () => {
    it('should list items by prefix', async () => {
      const mockFiles = [
        { 
          name: 'test-prefix/users/1',
          getMetadata: jest.fn().mockResolvedValue([{ metadata: {} }]),
          download: jest.fn().mockResolvedValue([Buffer.from(JSON.stringify({ id: 1, name: 'User 1' }))])
        },
        { 
          name: 'test-prefix/users/2',
          getMetadata: jest.fn().mockResolvedValue([{ metadata: {} }]),
          download: jest.fn().mockResolvedValue([Buffer.from(JSON.stringify({ id: 2, name: 'User 2' }))])
        }
      ];
      
      mockBucket.getFiles.mockResolvedValue([mockFiles]);
      
      const users = await provider.list('users/');
      expect(users).toHaveLength(2);
      expect(users[0]).toMatchObject({ id: 1, name: 'User 1' });
    });
    
    it('should support pagination', async () => {
      mockBucket.getFiles.mockResolvedValue([[]]);
      
      await provider.list('users/', { limit: 2, offset: 0 });
      expect(mockBucket.getFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          maxResults: 2
        })
      );
    });
    
    it('should exclude expired items', async () => {
      const mockFiles = [
        { 
          name: 'test-prefix/users/1',
          getMetadata: jest.fn().mockResolvedValue([{ metadata: {} }]),
          download: jest.fn().mockResolvedValue([Buffer.from(JSON.stringify({ id: 1 }))])
        },
        { 
          name: 'test-prefix/users/2',
          getMetadata: jest.fn().mockResolvedValue([{ 
            metadata: { 
              expiresAt: new Date(Date.now() - 1000).toISOString() 
            } 
          }])
        }
      ];
      
      mockBucket.getFiles.mockResolvedValue([mockFiles]);
      
      const users = await provider.list('users/');
      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({ id: 1 });
    });
  });
  
  describe('batch operations', () => {
    it('should handle batch operations successfully', async () => {
      const mockFile = createMockFile(true);
      mockBucket.file.mockReturnValue(mockFile);
      
      const operations = [
        { type: 'set' as const, key: 'batch1', value: 'value1' },
        { type: 'set' as const, key: 'batch2', value: 'value2' },
        { type: 'delete' as const, key: 'batch3' }
      ];
      
      const result = await provider.batch(operations);
      
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockFile.save).toHaveBeenCalledTimes(2);
      expect(mockFile.delete).toHaveBeenCalledTimes(1);
    });
    
    it('should handle partial failures in batch', async () => {
      const mockFile = createMockFile(true);
      let callCount = 0;
      mockFile.save.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Storage error');
        }
        return Promise.resolve([]);
      });
      mockBucket.file.mockReturnValue(mockFile);
      
      const operations = [
        { type: 'set' as const, key: 'batch1', value: 'value1' },
        { type: 'set' as const, key: 'batch2', value: 'value2' }, // This will fail
        { type: 'delete' as const, key: 'batch3' }
      ];
      
      const result = await provider.batch(operations);
      
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });
  
  describe('clear operations', () => {
    it('should clear all items when no prefix provided', async () => {
      const mockFiles = [
        { delete: jest.fn() },
        { delete: jest.fn() }
      ];
      mockBucket.getFiles.mockResolvedValue([mockFiles]);
      
      await provider.clear();
      
      expect(mockFiles[0].delete).toHaveBeenCalled();
      expect(mockFiles[1].delete).toHaveBeenCalled();
    });
    
    it('should clear only items with specific prefix', async () => {
      const mockFiles = [
        { delete: jest.fn() }
      ];
      mockBucket.getFiles.mockResolvedValue([mockFiles]);
      
      await provider.clear('clear/');
      
      expect(mockBucket.getFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          prefix: 'test-prefix/clear/'
        })
      );
    });
  });
  
  describe('storage info', () => {
    it('should return storage usage information', async () => {
      const mockFiles = [
        { getMetadata: jest.fn().mockResolvedValue([{ size: 1024 }]) },
        { getMetadata: jest.fn().mockResolvedValue([{ size: 2048 }]) }
      ];
      mockBucket.getFiles.mockResolvedValue([mockFiles]);
      
      const info = await provider.getStorageInfo();
      
      expect(info).toMatchObject({
        used: 3072,
        available: expect.any(Number),
        quota: expect.any(Number)
      });
      expect(info.quota).toBeGreaterThan(info.used);
    });
  });
});