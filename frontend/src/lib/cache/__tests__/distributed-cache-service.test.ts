import { distributedCacheService } from '../distributed-cache-service';

describe('distributedCacheService', () => {
  describe('initialization', () => {
    it('should be defined', () => {
      expect(distributedCacheService).toBeDefined();
    });
  });
  
  describe('get and set', () => {
    it('should set and get values', async () => {
      await distributedCacheService.set('test-key', 'test-value', { ttl: 60 });
      const value = await distributedCacheService.get('test-key');
      expect(value).toBe('test-value');
    });
    
    it('should return null for missing keys', async () => {
      const value = await distributedCacheService.get('non-existent-key');
      expect(value).toBeNull();
    });
  });
  
  describe('delete', () => {
    it('should delete values', async () => {
      await distributedCacheService.set('test-key', 'test-value', { ttl: 60 });
      await distributedCacheService.delete('test-key');
      const value = await distributedCacheService.get('test-key');
      expect(value).toBeNull();
    });
  });
  
  describe('clear', () => {
    it('should clear all values', async () => {
      await distributedCacheService.set('key1', 'value1', { ttl: 60 });
      await distributedCacheService.set('key2', 'value2', { ttl: 60 });
      await distributedCacheService.clear();
      
      const value1 = await distributedCacheService.get('key1');
      const value2 = await distributedCacheService.get('key2');
      
      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });
  });
});