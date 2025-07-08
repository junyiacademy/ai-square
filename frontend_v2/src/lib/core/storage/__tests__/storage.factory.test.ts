/**
 * StorageFactory 測試
 */

import { StorageFactory, StorageConfig } from '../factory/storage.factory';
import { LocalStorageProvider } from '../providers/local-storage.provider';
import { GCSStorageProvider } from '../providers/gcs-storage.provider';
import { MockStorageProvider } from '../providers/mock-storage.provider';
import { StorageError } from '../../errors';

// Mock providers
jest.mock('../providers/local-storage.provider');
jest.mock('../providers/gcs-storage.provider');
jest.mock('../providers/mock-storage.provider');

// Mock @google-cloud/storage to prevent import errors
jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn()
}));

describe('StorageFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    StorageFactory.clearInstances();
  });
  
  describe('create', () => {
    it('should create LocalStorageProvider', () => {
      const config: StorageConfig = {
        type: 'local',
        prefix: 'test-prefix'
      };
      
      const provider = StorageFactory.create(config);
      
      expect(LocalStorageProvider).toHaveBeenCalledWith('test-prefix');
      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });
    
    it('should create GCSStorageProvider', () => {
      const config: StorageConfig = {
        type: 'gcs',
        prefix: 'test-prefix',
        bucketName: 'test-bucket'
      };
      
      const provider = StorageFactory.create(config);
      
      expect(GCSStorageProvider).toHaveBeenCalledWith('test-bucket', 'test-prefix');
      expect(provider).toBeInstanceOf(GCSStorageProvider);
    });
    
    it('should throw error if bucket name is missing for GCS', () => {
      const config: StorageConfig = {
        type: 'gcs',
        prefix: 'test-prefix'
      };
      
      expect(() => StorageFactory.create(config)).toThrow(StorageError);
    });
    
    it('should create MockStorageProvider', () => {
      const config: StorageConfig = {
        type: 'mock',
        quota: 1024
      };
      
      const provider = StorageFactory.create(config);
      
      expect(MockStorageProvider).toHaveBeenCalledWith(1024);
      expect(provider).toBeInstanceOf(MockStorageProvider);
    });
    
    it('should throw error for unknown storage type', () => {
      const config: StorageConfig = {
        type: 'unknown' as any
      };
      
      expect(() => StorageFactory.create(config)).toThrow(StorageError);
    });
    
    it('should return cached instance for same config', () => {
      const config: StorageConfig = {
        type: 'local',
        prefix: 'test-prefix'
      };
      
      const provider1 = StorageFactory.create(config);
      const provider2 = StorageFactory.create(config);
      
      expect(provider1).toBe(provider2);
      expect(LocalStorageProvider).toHaveBeenCalledTimes(1);
    });
    
    it('should create new instance for different config', () => {
      const config1: StorageConfig = {
        type: 'local',
        prefix: 'prefix1'
      };
      
      const config2: StorageConfig = {
        type: 'local',
        prefix: 'prefix2'
      };
      
      const provider1 = StorageFactory.create(config1);
      const provider2 = StorageFactory.create(config2);
      
      expect(provider1).not.toBe(provider2);
      expect(LocalStorageProvider).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('createFromEnv', () => {
    const originalEnv = process.env;
    
    beforeEach(() => {
      process.env = { ...originalEnv };
    });
    
    afterEach(() => {
      process.env = originalEnv;
    });
    
    it('should create provider from environment variables', () => {
      process.env.NEXT_PUBLIC_STORAGE_TYPE = 'local';
      process.env.NEXT_PUBLIC_STORAGE_PREFIX = 'env-prefix';
      
      const provider = StorageFactory.createFromEnv();
      
      expect(LocalStorageProvider).toHaveBeenCalledWith('env-prefix');
      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });
    
    it('should use default values when env vars are not set', () => {
      delete process.env.NEXT_PUBLIC_STORAGE_TYPE;
      delete process.env.NEXT_PUBLIC_STORAGE_PREFIX;
      
      const provider = StorageFactory.createFromEnv();
      
      expect(LocalStorageProvider).toHaveBeenCalledWith('ai-square');
      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });
    
    it('should create GCS provider from env', () => {
      process.env.NEXT_PUBLIC_STORAGE_TYPE = 'gcs';
      process.env.NEXT_PUBLIC_STORAGE_PREFIX = 'gcs-prefix';
      process.env.NEXT_PUBLIC_GCS_BUCKET = 'env-bucket';
      
      const provider = StorageFactory.createFromEnv();
      
      expect(GCSStorageProvider).toHaveBeenCalledWith('env-bucket', 'gcs-prefix');
      expect(provider).toBeInstanceOf(GCSStorageProvider);
    });
    
    it('should use default bucket name for GCS if not provided', () => {
      process.env.NEXT_PUBLIC_STORAGE_TYPE = 'gcs';
      delete process.env.NEXT_PUBLIC_GCS_BUCKET;
      
      const provider = StorageFactory.createFromEnv();
      
      expect(GCSStorageProvider).toHaveBeenCalledWith('ai-square-storage', 'ai-square');
    });
  });
  
  describe('clearInstances', () => {
    it('should clear all cached instances', () => {
      const config: StorageConfig = {
        type: 'local',
        prefix: 'test'
      };
      
      const provider1 = StorageFactory.create(config);
      StorageFactory.clearInstances();
      const provider2 = StorageFactory.create(config);
      
      expect(provider1).not.toBe(provider2);
      expect(LocalStorageProvider).toHaveBeenCalledTimes(2);
    });
  });
});