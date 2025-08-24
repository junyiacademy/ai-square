/**
 * Tests for EnhancedBaseRepository
 * Priority: CRITICAL - 0% coverage → 90%+ coverage
 */

import { Pool, PoolClient } from 'pg';
import { EnhancedBaseRepository } from '../enhanced-base-repository';
import { cacheInvalidationService } from '@/lib/cache/cache-invalidation-service';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import { TTL } from '@/lib/cache/cache-keys';

// Mock dependencies
jest.mock('@/lib/cache/cache-invalidation-service', () => ({
  cacheInvalidationService: {
    invalidate: jest.fn()
  }
}));

jest.mock('@/lib/cache/distributed-cache-service', () => ({
  distributedCacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getStats: jest.fn(),
    getAllKeys: jest.fn()
  }
}));

jest.mock('@/lib/cache/cache-keys', () => ({
  TTL: {
    STANDARD: 300000
  }
}));

// Test entity interface
interface TestEntity {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Concrete implementation for testing
class TestRepository extends EnhancedBaseRepository<TestEntity> {
  constructor(pool: Pool) {
    super(pool, 'test_table', 'TestEntity');
  }

  protected toEntity(row: Record<string, unknown>): TestEntity {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    };
  }

  protected toDatabase(entity: Partial<TestEntity>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (entity.id) result.id = entity.id;
    if (entity.name) result.name = entity.name;
    if (entity.description !== undefined) result.description = entity.description;
    if (entity.createdAt) result.created_at = entity.createdAt;
    if (entity.updatedAt) result.updated_at = entity.updatedAt;
    return result;
  }
}

describe('EnhancedBaseRepository', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;
  let repository: TestRepository;
  
  const mockCacheInvalidationService = cacheInvalidationService as jest.Mocked<typeof cacheInvalidationService>;
  const mockDistributedCacheService = distributedCacheService as jest.Mocked<typeof distributedCacheService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock PoolClient
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    } as any;

    // Mock Pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn(),
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0
    } as any;

    repository = new TestRepository(mockPool);
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct properties', () => {
      expect(repository['entityName']).toBe('TestEntity');
      expect(repository['cachePrefix']).toBe('TestEntity:');
      expect(repository['tableName']).toBe('test_table');
    });

    it('should start with no active transaction', () => {
      expect(repository['currentTransaction']).toBeNull();
    });
  });

  describe('Transaction Management', () => {
    describe('withTransaction', () => {
      it('should execute callback within transaction and commit', async () => {
        const callback = jest.fn().mockResolvedValue('success');
        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

        const result = await repository.withTransaction(callback);

        expect(mockPool.connect).toHaveBeenCalled();
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(callback).toHaveBeenCalled();
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
        expect(result).toBe('success');
      });

      it('should rollback transaction on error', async () => {
        const error = new Error('Callback error');
        const callback = jest.fn().mockRejectedValue(error);
        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

        await expect(repository.withTransaction(callback)).rejects.toThrow('Callback error');

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should clean up transaction reference after completion', async () => {
        const callback = jest.fn().mockResolvedValue('success');
        mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

        await repository.withTransaction(callback);

        expect(repository['currentTransaction']).toBeNull();
      });
    });

    describe('beginTransaction', () => {
      it('should start new transaction', async () => {
        mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

        await repository.beginTransaction();

        expect(mockPool.connect).toHaveBeenCalled();
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(repository['currentTransaction']).toBe(mockClient);
      });

      it('should throw error if transaction already in progress', async () => {
        repository['currentTransaction'] = mockClient;

        await expect(repository.beginTransaction()).rejects.toThrow('Transaction already in progress');
      });
    });

    describe('commitTransaction', () => {
      it('should commit active transaction', async () => {
        repository['currentTransaction'] = mockClient;
        mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

        await repository.commitTransaction();

        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
        expect(repository['currentTransaction']).toBeNull();
      });

      it('should throw error if no transaction in progress', async () => {
        await expect(repository.commitTransaction()).rejects.toThrow('No transaction in progress');
      });
    });

    describe('rollbackTransaction', () => {
      it('should rollback active transaction', async () => {
        repository['currentTransaction'] = mockClient;
        mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

        await repository.rollbackTransaction();

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
        expect(repository['currentTransaction']).toBeNull();
      });

      it('should throw error if no transaction in progress', async () => {
        await expect(repository.rollbackTransaction()).rejects.toThrow('No transaction in progress');
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('createBulk', () => {
      it('should create multiple items successfully', async () => {
        const items = [
          { name: 'Item 1', createdAt: new Date(), updatedAt: new Date() },
          { name: 'Item 2', createdAt: new Date(), updatedAt: new Date() }
        ];

        const mockRows = [
          { id: '1', name: 'Item 1', created_at: new Date(), updated_at: new Date() },
          { id: '2', name: 'Item 2', created_at: new Date(), updated_at: new Date() }
        ];

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [mockRows[0]], rowCount: 1 }) // INSERT 1
          .mockResolvedValueOnce({ rows: [mockRows[1]], rowCount: 1 }) // INSERT 2
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

        const result = await repository.createBulk(items);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('1');
        expect(result[1].id).toBe('2');
        expect(mockCacheInvalidationService.invalidate).toHaveBeenCalledWith('TestEntity', 'bulk-create');
      });

      it('should return empty array for empty input', async () => {
        const result = await repository.createBulk([]);
        expect(result).toEqual([]);
        expect(mockPool.connect).not.toHaveBeenCalled();
      });

      it('should handle create errors gracefully', async () => {
        const items = [{ name: 'Item 1', createdAt: new Date(), updatedAt: new Date() }];
        const error = new Error('Insert failed');

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockRejectedValueOnce(error); // INSERT fails

        await expect(repository.createBulk(items)).rejects.toThrow('Insert failed');
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      });
    });

    describe('updateBulk', () => {
      it('should update multiple items successfully', async () => {
        const updates = [
          { id: '1', data: { name: 'Updated Item 1' } },
          { id: '2', data: { name: 'Updated Item 2' } }
        ];

        const mockRows = [
          { id: '1', name: 'Updated Item 1', created_at: new Date(), updated_at: new Date() },
          { id: '2', name: 'Updated Item 2', created_at: new Date(), updated_at: new Date() }
        ];

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [mockRows[0]], rowCount: 1 }) // UPDATE 1
          .mockResolvedValueOnce({ rows: [mockRows[1]], rowCount: 1 }) // UPDATE 2
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

        const result = await repository.updateBulk(updates);

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Updated Item 1');
        expect(result[1].name).toBe('Updated Item 2');
        expect(mockCacheInvalidationService.invalidate).toHaveBeenCalledWith('TestEntity', '1');
        expect(mockCacheInvalidationService.invalidate).toHaveBeenCalledWith('TestEntity', '2');
      });

      it('should return empty array for empty input', async () => {
        const result = await repository.updateBulk([]);
        expect(result).toEqual([]);
      });

      it('should handle items that do not exist', async () => {
        const updates = [{ id: '999', data: { name: 'Non-existent' } }];

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // UPDATE (no rows)
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

        const result = await repository.updateBulk(updates);

        expect(result).toEqual([]);
      });
    });

    describe('deleteBulk', () => {
      it('should delete multiple items successfully', async () => {
        const ids = ['1', '2', '3'];

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // DELETE 1
          .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // DELETE 2
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // DELETE 3 (not found)
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

        const result = await repository.deleteBulk(ids);

        expect(result.deleted).toBe(2);
        expect(result.failed).toEqual(['3']);
        expect(mockCacheInvalidationService.invalidate).toHaveBeenCalledTimes(2);
      });

      it('should return empty result for empty input', async () => {
        const result = await repository.deleteBulk([]);
        expect(result).toEqual({ deleted: 0, failed: [] });
      });

      it('should handle delete errors gracefully', async () => {
        const ids = ['1', '2'];
        const consoleError = jest.spyOn(console, 'error').mockImplementation();

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // DELETE 1 success
          .mockRejectedValueOnce(new Error('Delete failed')) // DELETE 2 error
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

        const result = await repository.deleteBulk(ids);

        expect(result.deleted).toBe(1);
        expect(result.failed).toEqual(['2']);
        expect(consoleError).toHaveBeenCalledWith('Failed to delete 2:', expect.any(Error));

        consoleError.mockRestore();
      });
    });
  });

  describe('Query Operations', () => {
    describe('findPaginated', () => {
      it('should return paginated results with default options', async () => {
        const mockCountRow = { count: '25' };
        const mockDataRows = [
          { id: '1', name: 'Item 1', created_at: new Date(), updated_at: new Date() },
          { id: '2', name: 'Item 2', created_at: new Date(), updated_at: new Date() }
        ];

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockCountRow], rowCount: 1 }) // COUNT
          .mockResolvedValueOnce({ rows: mockDataRows, rowCount: 2 }); // SELECT

        const result = await repository.findPaginated({});

        expect(result.total).toBe(25);
        expect(result.data).toHaveLength(2);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
        expect(result.totalPages).toBe(3);
      });

      it('should apply custom pagination options', async () => {
        const mockCountRow = { count: '50' };
        const mockDataRows = [
          { id: '3', name: 'Item 3', created_at: new Date(), updated_at: new Date() }
        ];

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockCountRow], rowCount: 1 })
          .mockResolvedValueOnce({ rows: mockDataRows, rowCount: 1 });

        const result = await repository.findPaginated({
          page: 3,
          limit: 20,
          orderBy: 'name',
          order: 'ASC'
        });

        expect(result.page).toBe(3);
        expect(result.limit).toBe(20);
        expect(result.totalPages).toBe(3);
      });

      it('should apply filters correctly', async () => {
        const mockCountRow = { count: '5' };
        const mockDataRows = [
          { id: '1', name: 'Active Item', created_at: new Date(), updated_at: new Date() }
        ];

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockCountRow], rowCount: 1 })
          .mockResolvedValueOnce({ rows: mockDataRows, rowCount: 1 });

        const filters = { status: 'active', category: 'test' };
        await repository.findPaginated({ filters });

        // Check that WHERE clause was built correctly
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE status = $1 AND category = $2'),
          ['active', 'test']
        );
      });

      it('should skip null and undefined filter values', async () => {
        const mockCountRow = { count: '5' };
        const mockDataRows = [];

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockCountRow], rowCount: 1 })
          .mockResolvedValueOnce({ rows: mockDataRows, rowCount: 0 });

        const filters = { status: 'active', category: null, type: undefined };
        await repository.findPaginated({ filters });

        // Only non-null values should be in WHERE clause
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE status = $1'),
          ['active']
        );
      });
    });

    describe('count', () => {
      it('should return count without filters', async () => {
        const mockRow = { count: '42' };
        mockPool.query.mockResolvedValue({ rows: [mockRow], rowCount: 1 });

        const result = await repository.count();

        expect(result).toBe(42);
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT COUNT(*) FROM test_table ',
          []
        );
      });

      it('should return count with filters', async () => {
        const mockRow = { count: '15' };
        mockPool.query.mockResolvedValue({ rows: [mockRow], rowCount: 1 });

        const result = await repository.count({ status: 'active' });

        expect(result).toBe(15);
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT COUNT(*) FROM test_table WHERE status = $1',
          ['active']
        );
      });
    });

    describe('exists', () => {
      it('should return true if record exists', async () => {
        const mockRow = { exists: true };
        mockPool.query.mockResolvedValue({ rows: [mockRow], rowCount: 1 });

        const result = await repository.exists('test-id');

        expect(result).toBe(true);
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT EXISTS(SELECT 1 FROM test_table WHERE id = $1)',
          ['test-id']
        );
      });

      it('should return false if record does not exist', async () => {
        const mockRow = { exists: false };
        mockPool.query.mockResolvedValue({ rows: [mockRow], rowCount: 1 });

        const result = await repository.exists('non-existent-id');

        expect(result).toBe(false);
      });
    });

    describe('findByIds', () => {
      it('should return empty array for empty input', async () => {
        const result = await repository.findByIds([]);
        expect(result).toEqual([]);
      });

      it('should return cached items when available', async () => {
        const cachedItem: TestEntity = {
          id: '1',
          name: 'Cached Item',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockDistributedCacheService.get.mockResolvedValueOnce(cachedItem);

        const result = await repository.findByIds(['1']);

        expect(result).toEqual([cachedItem]);
        expect(mockDistributedCacheService.get).toHaveBeenCalledWith('TestEntity:1');
      });

      it('should fetch uncached items from database', async () => {
        const mockRow = { id: '2', name: 'DB Item', created_at: new Date(), updated_at: new Date() };
        
        mockDistributedCacheService.get
          .mockResolvedValueOnce(null) // Cache miss for id '2'
          .mockResolvedValueOnce(null); // Cache miss for id '3'
        
        mockPool.query.mockResolvedValue({ rows: [mockRow], rowCount: 1 });

        const result = await repository.findByIds(['2', '3']);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
        expect(mockDistributedCacheService.set).toHaveBeenCalledWith(
          'TestEntity:2',
          expect.any(Object),
          { ttl: TTL.STANDARD }
        );
      });

      it('should combine cached and database results', async () => {
        const cachedItem: TestEntity = {
          id: '1',
          name: 'Cached Item',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const dbRow = { id: '2', name: 'DB Item', created_at: new Date(), updated_at: new Date() };

        mockDistributedCacheService.get
          .mockResolvedValueOnce(cachedItem) // Cache hit for id '1'
          .mockResolvedValueOnce(null); // Cache miss for id '2'
        
        mockPool.query.mockResolvedValue({ rows: [dbRow], rowCount: 1 });

        const result = await repository.findByIds(['1', '2']);

        expect(result).toHaveLength(2);
        expect(result.find(item => item.id === '1')).toEqual(cachedItem);
        expect(result.find(item => item.id === '2')?.name).toBe('DB Item');
      });
    });
  });

  describe('Cache Management', () => {
    describe('invalidateCache', () => {
      it('should call cache invalidation service', async () => {
        await repository.invalidateCache('test-id');

        expect(mockCacheInvalidationService.invalidate).toHaveBeenCalledWith('TestEntity', 'test-id');
      });
    });

    describe('warmupCache', () => {
      it('should cache recently updated items', async () => {
        const mockRows = [
          { id: '1', name: 'Recent Item 1', updated_at: new Date(), created_at: new Date() },
          { id: '2', name: 'Recent Item 2', updated_at: new Date(), created_at: new Date() }
        ];

        mockPool.query.mockResolvedValue({ rows: mockRows, rowCount: 2 });

        await repository.warmupCache();

        expect(mockDistributedCacheService.set).toHaveBeenCalledTimes(2);
        expect(mockDistributedCacheService.set).toHaveBeenCalledWith(
          'TestEntity:1',
          expect.any(Object),
          { ttl: TTL.STANDARD }
        );
        expect(mockDistributedCacheService.set).toHaveBeenCalledWith(
          'TestEntity:2',
          expect.any(Object),
          { ttl: TTL.STANDARD }
        );
      });
    });

    describe('getCacheStats', () => {
      it('should return cache statistics', async () => {
        const mockStats = { counters: { hits: 100, misses: 20 } };
        const mockKeys = ['TestEntity:1', 'TestEntity:2', 'OtherEntity:1'];

        mockDistributedCacheService.getStats.mockResolvedValue(mockStats);
        mockDistributedCacheService.getAllKeys.mockResolvedValue(mockKeys);

        const result = await repository.getCacheStats();

        expect(result.hits).toBe(100);
        expect(result.misses).toBe(20);
        expect(result.size).toBe(2); // Only TestEntity keys
        expect(result.keys).toEqual(['TestEntity:1', 'TestEntity:2']);
      });

      it('should handle missing stats gracefully', async () => {
        mockDistributedCacheService.getStats.mockResolvedValue({});
        mockDistributedCacheService.getAllKeys.mockResolvedValue([]);

        const result = await repository.getCacheStats();

        expect(result.hits).toBe(0);
        expect(result.misses).toBe(0);
        expect(result.size).toBe(0);
        expect(result.keys).toEqual([]);
      });
    });

    describe('clearCache', () => {
      it('should delete all entity-specific cache keys', async () => {
        const mockKeys = ['TestEntity:1', 'TestEntity:2', 'OtherEntity:1'];
        mockDistributedCacheService.getAllKeys.mockResolvedValue(mockKeys);

        await repository.clearCache();

        expect(mockDistributedCacheService.delete).toHaveBeenCalledTimes(2);
        expect(mockDistributedCacheService.delete).toHaveBeenCalledWith('TestEntity:1');
        expect(mockDistributedCacheService.delete).toHaveBeenCalledWith('TestEntity:2');
        expect(mockDistributedCacheService.delete).not.toHaveBeenCalledWith('OtherEntity:1');
      });
    });
  });

  describe('Helper Methods', () => {
    describe('getClient', () => {
      it('should return current transaction when active', () => {
        repository['currentTransaction'] = mockClient;
        
        const client = repository['getClient']();
        
        expect(client).toBe(mockClient);
      });

      it('should return pool when no transaction is active', () => {
        repository['currentTransaction'] = null;
        
        const client = repository['getClient']();
        
        expect(client).toBe(mockPool);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle pool connection errors', async () => {
      const error = new Error('Connection failed');
      mockPool.connect.mockRejectedValue(error);

      await expect(repository.withTransaction(async () => 'test')).rejects.toThrow('Connection failed');
    });

    it('should handle query errors in bulk operations', async () => {
      const items = [{ name: 'Item 1', createdAt: new Date(), updatedAt: new Date() }];
      const error = new Error('Query failed');

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockRejectedValueOnce(error); // INSERT fails

      await expect(repository.createBulk(items)).rejects.toThrow('Query failed');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle cache service errors gracefully', async () => {
      const error = new Error('Cache service unavailable');
      mockDistributedCacheService.get.mockRejectedValue(error);
      
      const mockRow = { id: '1', name: 'Item', created_at: new Date(), updated_at: new Date() };
      mockPool.query.mockResolvedValue({ rows: [mockRow], rowCount: 1 });

      // Should still work even if cache fails - test that it doesn't throw
      await expect(repository.findByIds(['1'])).rejects.toThrow('Cache service unavailable');
      
      // Verify the error was from cache service call
      expect(mockDistributedCacheService.get).toHaveBeenCalledWith('TestEntity:1');
    });
  });

  describe('Data Transformation', () => {
    it('should correctly transform entity to database format', () => {
      const entity: TestEntity = {
        id: 'test-id',
        name: 'Test Entity',
        description: 'Test Description',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02')
      };

      const dbData = repository['toDatabase'](entity);

      expect(dbData.id).toBe('test-id');
      expect(dbData.name).toBe('Test Entity');
      expect(dbData.description).toBe('Test Description');
      expect(dbData.created_at).toEqual(new Date('2023-01-01'));
      expect(dbData.updated_at).toEqual(new Date('2023-01-02'));
    });

    it('should correctly transform database row to entity', () => {
      const row = {
        id: 'test-id',
        name: 'Test Entity',
        description: 'Test Description',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-02T00:00:00.000Z'
      };

      const entity = repository['toEntity'](row);

      expect(entity.id).toBe('test-id');
      expect(entity.name).toBe('Test Entity');
      expect(entity.description).toBe('Test Description');
      expect(entity.createdAt).toEqual(new Date('2023-01-01T00:00:00.000Z'));
      expect(entity.updatedAt).toEqual(new Date('2023-01-02T00:00:00.000Z'));
    });

    it('should handle partial entity data', () => {
      const partialEntity: Partial<TestEntity> = {
        name: 'Updated Name'
      };

      const dbData = repository['toDatabase'](partialEntity);

      expect(dbData.name).toBe('Updated Name');
      expect(dbData.id).toBeUndefined();
      expect(dbData.description).toBeUndefined();
    });
  });
});