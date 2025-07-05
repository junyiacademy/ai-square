/**
 * LocalStorageProvider 測試
 */

import { LocalStorageProvider } from '../providers/local-storage.provider';
import { StorageQuotaExceededError, StoragePermissionError } from '../../errors';

describe('LocalStorageProvider', () => {
  let provider: LocalStorageProvider;
  
  beforeEach(() => {
    // 清空 localStorage
    localStorage.clear();
    provider = new LocalStorageProvider('test_');
  });
  
  afterEach(() => {
    localStorage.clear();
  });
  
  describe('get/set operations', () => {
    it('should store and retrieve values', async () => {
      const testData = { id: 1, name: 'Test User' };
      await provider.set('user1', testData);
      
      const retrieved = await provider.get('user1');
      expect(retrieved).toEqual(testData);
    });
    
    it('should return null for non-existent keys', async () => {
      const result = await provider.get('non-existent');
      expect(result).toBeNull();
    });
    
    it('should handle complex objects', async () => {
      const complexData = {
        user: { id: 1, name: 'Test' },
        settings: { theme: 'dark', lang: 'en' },
        scores: [10, 20, 30],
        metadata: new Date().toISOString()
      };
      
      await provider.set('complex', complexData);
      const retrieved = await provider.get('complex');
      
      expect(retrieved).toEqual(complexData);
    });
    
    it('should handle TTL expiration', async () => {
      jest.useFakeTimers();
      
      await provider.set('ttl-test', 'value', { ttl: 1 }); // 1 second TTL
      
      // Should exist immediately
      expect(await provider.get('ttl-test')).toBe('value');
      
      // Should expire after 1 second
      jest.advanceTimersByTime(1001);
      expect(await provider.get('ttl-test')).toBeNull();
      
      jest.useRealTimers();
    });
    
    it('should handle storage quota exceeded', async () => {
      // Mock localStorage.setItem to throw quota exceeded error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        const error = new DOMException('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });
      
      await expect(provider.set('test', 'value')).rejects.toThrow(StorageQuotaExceededError);
      
      localStorage.setItem = originalSetItem;
    });
  });
  
  describe('delete operations', () => {
    it('should delete existing items', async () => {
      await provider.set('to-delete', 'value');
      expect(await provider.exists('to-delete')).toBe(true);
      
      await provider.delete('to-delete');
      expect(await provider.exists('to-delete')).toBe(false);
    });
    
    it('should not throw when deleting non-existent items', async () => {
      await expect(provider.delete('non-existent')).resolves.not.toThrow();
    });
  });
  
  describe('exists operations', () => {
    it('should return true for existing items', async () => {
      await provider.set('exists-test', 'value');
      expect(await provider.exists('exists-test')).toBe(true);
    });
    
    it('should return false for non-existent items', async () => {
      expect(await provider.exists('non-existent')).toBe(false);
    });
    
    it('should return false for expired items', async () => {
      jest.useFakeTimers();
      
      await provider.set('expired', 'value', { ttl: 1 });
      expect(await provider.exists('expired')).toBe(true);
      
      jest.advanceTimersByTime(1001);
      expect(await provider.exists('expired')).toBe(false);
      
      jest.useRealTimers();
    });
  });
  
  describe('list operations', () => {
    beforeEach(async () => {
      // 設置測試資料
      await provider.set('users/1', { id: 1, name: 'User 1' });
      await provider.set('users/2', { id: 2, name: 'User 2' });
      await provider.set('users/3', { id: 3, name: 'User 3' });
      await provider.set('posts/1', { id: 1, title: 'Post 1' });
    });
    
    it('should list items by prefix', async () => {
      const users = await provider.list('users/');
      expect(users).toHaveLength(3);
      expect(users[0]).toMatchObject({ id: 1, name: 'User 1' });
    });
    
    it('should support pagination', async () => {
      const page1 = await provider.list('users/', { limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);
      
      const page2 = await provider.list('users/', { limit: 2, offset: 2 });
      expect(page2).toHaveLength(1);
    });
    
    it('should support sorting by key', async () => {
      const sorted = await provider.list('users/', { 
        orderBy: 'key', 
        orderDirection: 'desc' 
      });
      
      expect(sorted[0]).toMatchObject({ id: 3, name: 'User 3' });
      expect(sorted[2]).toMatchObject({ id: 1, name: 'User 1' });
    });
    
    it('should exclude expired items', async () => {
      jest.useFakeTimers();
      
      await provider.set('users/4', { id: 4, name: 'User 4' }, { ttl: 1 });
      
      // Should include all 4 users initially
      let users = await provider.list('users/');
      expect(users).toHaveLength(4);
      
      // After expiration, should only have 3
      jest.advanceTimersByTime(1001);
      users = await provider.list('users/');
      expect(users).toHaveLength(3);
      
      jest.useRealTimers();
    });
  });
  
  describe('batch operations', () => {
    it('should handle batch operations successfully', async () => {
      const operations = [
        { type: 'set' as const, key: 'batch1', value: 'value1' },
        { type: 'set' as const, key: 'batch2', value: 'value2' },
        { type: 'delete' as const, key: 'batch1' }
      ];
      
      const result = await provider.batch(operations);
      
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(await provider.exists('batch1')).toBe(false);
      expect(await provider.exists('batch2')).toBe(true);
    });
    
    it('should handle partial failures in batch', async () => {
      // Create one item
      await provider.set('existing', 'value');
      
      // Mock setItem to fail on second call
      let callCount = 0;
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation((key, value) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Storage error');
        }
        return originalSetItem.call(localStorage, key, value);
      });
      
      const operations = [
        { type: 'set' as const, key: 'batch1', value: 'value1' },
        { type: 'set' as const, key: 'batch2', value: 'value2' }, // This will fail
        { type: 'delete' as const, key: 'existing' }
      ];
      
      const result = await provider.batch(operations);
      
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      
      localStorage.setItem = originalSetItem;
    });
  });
  
  describe('clear operations', () => {
    beforeEach(async () => {
      await provider.set('keep/1', 'value1');
      await provider.set('clear/1', 'value2');
      await provider.set('clear/2', 'value3');
    });
    
    it('should clear all items when no prefix provided', async () => {
      await provider.clear();
      
      expect(await provider.exists('keep/1')).toBe(false);
      expect(await provider.exists('clear/1')).toBe(false);
      expect(await provider.exists('clear/2')).toBe(false);
    });
    
    it('should clear only items with specific prefix', async () => {
      await provider.clear('clear/');
      
      expect(await provider.exists('keep/1')).toBe(true);
      expect(await provider.exists('clear/1')).toBe(false);
      expect(await provider.exists('clear/2')).toBe(false);
    });
  });
  
  describe('error handling', () => {
    it('should throw StoragePermissionError when localStorage is not available', async () => {
      // Mock localStorage to be unavailable
      const provider = new LocalStorageProvider('test_');
      (provider as any).isAvailable = false;
      
      await expect(provider.get('test')).rejects.toThrow(StoragePermissionError);
      await expect(provider.set('test', 'value')).rejects.toThrow(StoragePermissionError);
      await expect(provider.list('')).rejects.toThrow(StoragePermissionError);
    });
  });
  
  describe('storage info', () => {
    it('should return storage usage information', async () => {
      const info = await provider.getStorageInfo();
      
      expect(info).toMatchObject({
        used: expect.any(Number),
        available: expect.any(Number),
        quota: expect.any(Number)
      });
      
      expect(info.used).toBeGreaterThanOrEqual(0);
      expect(info.quota).toBeGreaterThan(0);
      expect(info.available).toBeLessThanOrEqual(info.quota);
    });
  });
});