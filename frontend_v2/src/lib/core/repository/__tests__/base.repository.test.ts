/**
 * BaseRepository 測試
 */

import { BaseRepository } from '../base/base.repository';
import { IEntity } from '../interfaces';
import { MockStorageProvider } from '../../storage/providers/mock-storage.provider';

// 測試用實體
interface TestEntity extends IEntity {
  name: string;
  email: string;
  age: number;
}

// 測試用 Repository 實現
class TestRepository extends BaseRepository<TestEntity> {
  constructor(storage: MockStorageProvider) {
    super(storage, 'test-entities');
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let storage: MockStorageProvider;
  
  beforeEach(() => {
    storage = new MockStorageProvider();
    repository = new TestRepository(storage);
  });
  
  describe('create', () => {
    it('should create a new entity with generated ID and timestamps', async () => {
      const entityData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };
      
      const created = await repository.create(entityData);
      
      expect(created).toMatchObject({
        ...entityData,
        id: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
      
      // Verify it was stored
      const stored = await repository.findById(created.id);
      expect(stored).toEqual(created);
    });
  });
  
  describe('findById', () => {
    it('should find entity by ID', async () => {
      const created = await repository.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        age: 25
      });
      
      const found = await repository.findById(created.id);
      expect(found).toEqual(created);
    });
    
    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('non-existent');
      expect(found).toBeNull();
    });
  });
  
  describe('findAll', () => {
    beforeEach(async () => {
      // Create test data
      await repository.create({ name: 'User 1', email: 'user1@example.com', age: 20 });
      await repository.create({ name: 'User 2', email: 'user2@example.com', age: 30 });
      await repository.create({ name: 'User 3', email: 'user3@example.com', age: 40 });
    });
    
    it('should return all entities', async () => {
      const all = await repository.findAll();
      expect(all).toHaveLength(3);
    });
    
    it('should support pagination', async () => {
      const page1 = await repository.findAll({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);
      
      const page2 = await repository.findAll({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(1);
    });
    
    it('should support filtering with where clause', async () => {
      const filtered = await repository.findAll({ where: { age: 30 } });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('User 2');
    });
  });
  
  describe('findOne', () => {
    beforeEach(async () => {
      await repository.create({ name: 'John', email: 'john@example.com', age: 30 });
      await repository.create({ name: 'Jane', email: 'jane@example.com', age: 30 });
    });
    
    it('should find first matching entity', async () => {
      const found = await repository.findOne({ age: 30 });
      expect(found).toBeTruthy();
      expect(found?.age).toBe(30);
    });
    
    it('should return null if no match', async () => {
      const found = await repository.findOne({ age: 50 });
      expect(found).toBeNull();
    });
  });
  
  describe('findMany', () => {
    beforeEach(async () => {
      await repository.create({ name: 'User 1', email: 'user1@example.com', age: 30 });
      await repository.create({ name: 'User 2', email: 'user2@example.com', age: 30 });
      await repository.create({ name: 'User 3', email: 'user3@example.com', age: 40 });
    });
    
    it('should find all matching entities', async () => {
      const found = await repository.findMany({ age: 30 });
      expect(found).toHaveLength(2);
    });
    
    it('should return empty array if no matches', async () => {
      const found = await repository.findMany({ age: 50 });
      expect(found).toEqual([]);
    });
  });
  
  describe('update', () => {
    it('should update entity and preserve timestamps', async () => {
      const created = await repository.create({
        name: 'Original Name',
        email: 'original@example.com',
        age: 25
      });
      
      // Wait a bit to ensure updatedAt changes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = await repository.update(created.id, {
        name: 'Updated Name',
        age: 26
      });
      
      expect(updated).toMatchObject({
        id: created.id,
        name: 'Updated Name',
        email: 'original@example.com',
        age: 26,
        createdAt: created.createdAt
      });
      
      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });
    
    it('should throw error if entity not found', async () => {
      await expect(
        repository.update('non-existent', { name: 'New Name' })
      ).rejects.toThrow('Entity with id non-existent not found');
    });
  });
  
  describe('delete', () => {
    it('should delete entity', async () => {
      const created = await repository.create({
        name: 'To Delete',
        email: 'delete@example.com',
        age: 30
      });
      
      await repository.delete(created.id);
      
      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });
  });
  
  describe('batch operations', () => {
    describe('createMany', () => {
      it('should create multiple entities', async () => {
        const entities = [
          { name: 'User 1', email: 'user1@example.com', age: 20 },
          { name: 'User 2', email: 'user2@example.com', age: 30 },
          { name: 'User 3', email: 'user3@example.com', age: 40 }
        ];
        
        const created = await repository.createMany(entities);
        
        expect(created).toHaveLength(3);
        created.forEach((entity, index) => {
          expect(entity).toMatchObject({
            ...entities[index],
            id: expect.any(String),
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date)
          });
        });
      });
    });
    
    describe('updateMany', () => {
      it('should update multiple entities', async () => {
        const created1 = await repository.create({ name: 'User 1', email: 'user1@example.com', age: 20 });
        const created2 = await repository.create({ name: 'User 2', email: 'user2@example.com', age: 30 });
        
        const updates = [
          { id: created1.id, data: { age: 21 } },
          { id: created2.id, data: { age: 31 } }
        ];
        
        const updated = await repository.updateMany(updates);
        
        expect(updated).toHaveLength(2);
        expect(updated[0].age).toBe(21);
        expect(updated[1].age).toBe(31);
      });
    });
    
    describe('deleteMany', () => {
      it('should delete multiple entities', async () => {
        const created1 = await repository.create({ name: 'User 1', email: 'user1@example.com', age: 20 });
        const created2 = await repository.create({ name: 'User 2', email: 'user2@example.com', age: 30 });
        const created3 = await repository.create({ name: 'User 3', email: 'user3@example.com', age: 40 });
        
        await repository.deleteMany([created1.id, created2.id]);
        
        expect(await repository.findById(created1.id)).toBeNull();
        expect(await repository.findById(created2.id)).toBeNull();
        expect(await repository.findById(created3.id)).toBeTruthy();
      });
    });
  });
  
  describe('count', () => {
    beforeEach(async () => {
      await repository.create({ name: 'User 1', email: 'user1@example.com', age: 30 });
      await repository.create({ name: 'User 2', email: 'user2@example.com', age: 30 });
      await repository.create({ name: 'User 3', email: 'user3@example.com', age: 40 });
    });
    
    it('should count all entities', async () => {
      const count = await repository.count();
      expect(count).toBe(3);
    });
    
    it('should count entities matching criteria', async () => {
      const count = await repository.count({ age: 30 });
      expect(count).toBe(2);
    });
  });
  
  describe('exists', () => {
    beforeEach(async () => {
      await repository.create({ name: 'John', email: 'john@example.com', age: 30 });
    });
    
    it('should return true if entity exists', async () => {
      const exists = await repository.exists({ email: 'john@example.com' });
      expect(exists).toBe(true);
    });
    
    it('should return false if entity does not exist', async () => {
      const exists = await repository.exists({ email: 'nonexistent@example.com' });
      expect(exists).toBe(false);
    });
  });
});