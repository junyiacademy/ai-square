/**
 * SoftDeletableRepository 測試
 */

import { SoftDeletableRepository } from '../base/soft-deletable.repository';
import { ISoftDeletableEntity } from '../interfaces';
import { MockStorageProvider } from '../../storage/providers/mock-storage.provider';

// 測試用實體
interface TestEntity extends ISoftDeletableEntity {
  name: string;
  email: string;
}

// 測試用 Repository 實現
class TestRepository extends SoftDeletableRepository<TestEntity> {
  constructor(storage: MockStorageProvider) {
    super(storage, 'soft-deletable-entities');
  }
}

describe('SoftDeletableRepository', () => {
  let repository: TestRepository;
  let storage: MockStorageProvider;
  
  beforeEach(() => {
    storage = new MockStorageProvider();
    repository = new TestRepository(storage);
  });
  
  describe('soft delete operations', () => {
    let entity: TestEntity;
    
    beforeEach(async () => {
      entity = await repository.create({
        name: 'Test User',
        email: 'test@example.com'
      });
    });
    
    it('should soft delete entity', async () => {
      const deleted = await repository.softDelete(entity.id);
      
      expect(deleted.isDeleted).toBe(true);
      expect(deleted.deletedAt).toBeInstanceOf(Date);
      
      // Entity should still exist in storage
      const stored = await storage.get(`soft-deletable-entities/${entity.id}`);
      expect(stored).toBeTruthy();
    });
    
    it('should filter out soft deleted entities by default', async () => {
      await repository.softDelete(entity.id);
      
      const all = await repository.findAll();
      expect(all).toHaveLength(0);
    });
    
    it('should include soft deleted entities when requested', async () => {
      await repository.softDelete(entity.id);
      
      const all = await repository.findAll({ includeDeleted: true });
      expect(all).toHaveLength(1);
      expect(all[0].isDeleted).toBe(true);
    });
    
    it('should find only deleted entities', async () => {
      const entity2 = await repository.create({
        name: 'Another User',
        email: 'another@example.com'
      });
      
      await repository.softDelete(entity.id);
      
      const deleted = await repository.findDeleted();
      expect(deleted).toHaveLength(1);
      expect(deleted[0].id).toBe(entity.id);
    });
  });
  
  describe('restore operations', () => {
    it('should restore soft deleted entity', async () => {
      const entity = await repository.create({
        name: 'Test User',
        email: 'test@example.com'
      });
      
      await repository.softDelete(entity.id);
      const restored = await repository.restore(entity.id);
      
      expect(restored.isDeleted).toBe(false);
      expect(restored.deletedAt).toBeNull();
      
      const all = await repository.findAll();
      expect(all).toHaveLength(1);
    });
  });
  
  describe('hard delete operations', () => {
    it('should permanently delete entity', async () => {
      const entity = await repository.create({
        name: 'Test User',
        email: 'test@example.com'
      });
      
      await repository.hardDelete(entity.id);
      
      const stored = await storage.get(`soft-deletable-entities/${entity.id}`);
      expect(stored).toBeNull();
    });
  });
  
  describe('batch soft delete operations', () => {
    let entities: TestEntity[];
    
    beforeEach(async () => {
      entities = await repository.createMany([
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' },
        { name: 'User 3', email: 'user3@example.com' }
      ]);
    });
    
    it('should soft delete multiple entities', async () => {
      const ids = [entities[0].id, entities[1].id];
      const deleted = await repository.softDeleteMany(ids);
      
      expect(deleted).toHaveLength(2);
      deleted.forEach(entity => {
        expect(entity.isDeleted).toBe(true);
        expect(entity.deletedAt).toBeInstanceOf(Date);
      });
      
      const remaining = await repository.findAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(entities[2].id);
    });
    
    it('should restore multiple entities', async () => {
      const ids = entities.map(e => e.id);
      await repository.softDeleteMany(ids);
      
      const restored = await repository.restoreMany([entities[0].id, entities[1].id]);
      expect(restored).toHaveLength(2);
      restored.forEach(entity => {
        expect(entity.isDeleted).toBe(false);
        expect(entity.deletedAt).toBeNull();
      });
      
      const active = await repository.findAll();
      expect(active).toHaveLength(2);
    });
    
    it('should hard delete multiple entities', async () => {
      const ids = [entities[0].id, entities[1].id];
      await repository.hardDeleteMany(ids);
      
      const remaining = await repository.findAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(entities[2].id);
    });
  });
  
  describe('cleanup operations', () => {
    it('should cleanup old deleted entities', async () => {
      jest.useFakeTimers();
      const now = new Date('2024-01-15');
      jest.setSystemTime(now);
      
      // Create and soft delete entities at different times
      const entity1 = await repository.create({ name: 'Old', email: 'old@example.com' });
      await repository.softDelete(entity1.id);
      
      // Move time forward 10 days
      jest.setSystemTime(new Date('2024-01-25'));
      const entity2 = await repository.create({ name: 'Recent', email: 'recent@example.com' });
      await repository.softDelete(entity2.id);
      
      // Cleanup entities deleted more than 7 days ago
      const cleaned = await repository.cleanupDeleted(7);
      
      expect(cleaned).toBe(1);
      
      const allDeleted = await repository.findDeleted();
      expect(allDeleted).toHaveLength(1);
      expect(allDeleted[0].id).toBe(entity2.id);
      
      jest.useRealTimers();
    });
  });
  
  describe('override default delete behavior', () => {
    it('should use soft delete for delete method', async () => {
      const entity = await repository.create({
        name: 'Test User',
        email: 'test@example.com'
      });
      
      await repository.delete(entity.id);
      
      const all = await repository.findAll();
      expect(all).toHaveLength(0);
      
      const allWithDeleted = await repository.findAll({ includeDeleted: true });
      expect(allWithDeleted).toHaveLength(1);
      expect(allWithDeleted[0].isDeleted).toBe(true);
    });
    
    it('should use soft delete for deleteMany method', async () => {
      const entities = await repository.createMany([
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' }
      ]);
      
      await repository.deleteMany(entities.map(e => e.id));
      
      const all = await repository.findAll();
      expect(all).toHaveLength(0);
      
      const allWithDeleted = await repository.findAll({ includeDeleted: true });
      expect(allWithDeleted).toHaveLength(2);
      allWithDeleted.forEach(entity => {
        expect(entity.isDeleted).toBe(true);
      });
    });
  });
});