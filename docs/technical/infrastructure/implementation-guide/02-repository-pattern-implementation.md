# Repository Pattern 實作指南

## 實作概要

基於 Storage 抽象層，實作 Repository 模式來管理領域實體的資料存取。

## 1. 檔案結構

```bash
frontend/src/lib/
├── core/
│   ├── repositories/
│   │   ├── interfaces/
│   │   │   ├── repository.interface.ts
│   │   │   ├── unit-of-work.interface.ts
│   │   │   └── index.ts
│   │   ├── base/
│   │   │   ├── base.repository.ts
│   │   │   ├── cached.repository.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   └── domain/
│       ├── entities/
│       │   ├── base.entity.ts
│       │   ├── session.entity.ts
│       │   ├── evaluation.entity.ts
│       │   └── index.ts
│       └── value-objects/
│           ├── session-status.vo.ts
│           └── index.ts
```

## 2. 領域實體定義

### 2.1 基礎實體
```typescript
// src/lib/core/domain/entities/base.entity.ts
export abstract class BaseEntity {
  readonly id: string;
  readonly createdAt: Date;
  updatedAt: Date;
  version: number;

  constructor(id?: string) {
    this.id = id || this.generateId();
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.version = 1;
  }

  protected abstract generateId(): string;

  updateVersion(): void {
    this.version++;
    this.updatedAt = new Date();
  }

  equals(other: BaseEntity): boolean {
    return this.id === other.id;
  }
}

// UUID 生成器
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

### 2.2 Session 實體
```typescript
// src/lib/core/domain/entities/session.entity.ts
import { BaseEntity, generateUUID } from './base.entity';
import { SessionStatus } from '../value-objects/session-status.vo';

export class SessionEntity extends BaseEntity {
  userId: string;
  projectId: string;
  type: SessionType;
  status: SessionStatus;
  startedAt: Date;
  lastActiveAt: Date;
  completedAt?: Date;
  metadata: SessionMetadata;

  constructor(data: CreateSessionData) {
    super(data.id);
    this.userId = data.userId;
    this.projectId = data.projectId;
    this.type = data.type;
    this.status = new SessionStatus('created');
    this.startedAt = new Date();
    this.lastActiveAt = new Date();
    this.metadata = data.metadata || {};
  }

  protected generateId(): string {
    return `session_${generateUUID()}`;
  }

  // 領域邏輯
  start(): void {
    if (!this.status.canTransitionTo('active')) {
      throw new Error(`Cannot start session in ${this.status.value} status`);
    }
    this.status = new SessionStatus('active');
    this.updateActivity();
  }

  pause(): void {
    if (!this.status.canTransitionTo('paused')) {
      throw new Error(`Cannot pause session in ${this.status.value} status`);
    }
    this.status = new SessionStatus('paused');
    this.updateActivity();
  }

  resume(): void {
    if (!this.status.canTransitionTo('active')) {
      throw new Error(`Cannot resume session in ${this.status.value} status`);
    }
    this.status = new SessionStatus('active');
    this.updateActivity();
  }

  complete(): void {
    if (!this.status.canTransitionTo('completed')) {
      throw new Error(`Cannot complete session in ${this.status.value} status`);
    }
    this.status = new SessionStatus('completed');
    this.completedAt = new Date();
    this.updateActivity();
  }

  updateActivity(): void {
    this.lastActiveAt = new Date();
    this.updateVersion();
  }

  // 序列化
  toJSON(): SessionData {
    return {
      id: this.id,
      userId: this.userId,
      projectId: this.projectId,
      type: this.type,
      status: this.status.value,
      startedAt: this.startedAt.toISOString(),
      lastActiveAt: this.lastActiveAt.toISOString(),
      completedAt: this.completedAt?.toISOString(),
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      version: this.version
    };
  }

  // 反序列化
  static fromJSON(data: SessionData): SessionEntity {
    const session = new SessionEntity({
      id: data.id,
      userId: data.userId,
      projectId: data.projectId,
      type: data.type,
      metadata: data.metadata
    });

    session.status = new SessionStatus(data.status);
    session.startedAt = new Date(data.startedAt);
    session.lastActiveAt = new Date(data.lastActiveAt);
    session.completedAt = data.completedAt ? new Date(data.completedAt) : undefined;
    session.createdAt = new Date(data.createdAt);
    session.updatedAt = new Date(data.updatedAt);
    session.version = data.version;

    return session;
  }
}

// Types
export type SessionType = 'assessment' | 'pbl' | 'discovery' | 'chat';

export interface CreateSessionData {
  id?: string;
  userId: string;
  projectId: string;
  type: SessionType;
  metadata?: SessionMetadata;
}

export interface SessionData {
  id: string;
  userId: string;
  projectId: string;
  type: SessionType;
  status: string;
  startedAt: string;
  lastActiveAt: string;
  completedAt?: string;
  metadata: SessionMetadata;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface SessionMetadata {
  [key: string]: any;
}
```

### 2.3 值物件
```typescript
// src/lib/core/domain/value-objects/session-status.vo.ts
export class SessionStatus {
  private static readonly VALID_STATUSES = [
    'created', 'active', 'paused', 'completed', 'abandoned'
  ] as const;

  private static readonly TRANSITIONS: Record<string, string[]> = {
    created: ['active', 'abandoned'],
    active: ['paused', 'completed', 'abandoned'],
    paused: ['active', 'completed', 'abandoned'],
    completed: [],
    abandoned: []
  };

  constructor(public readonly value: SessionStatusValue) {
    if (!SessionStatus.VALID_STATUSES.includes(value)) {
      throw new Error(`Invalid session status: ${value}`);
    }
  }

  canTransitionTo(newStatus: SessionStatusValue): boolean {
    const allowedTransitions = SessionStatus.TRANSITIONS[this.value];
    return allowedTransitions.includes(newStatus);
  }

  equals(other: SessionStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export type SessionStatusValue = typeof SessionStatus.VALID_STATUSES[number];
```

## 3. Repository 介面

### 3.1 基礎 Repository 介面
```typescript
// src/lib/core/repositories/interfaces/repository.interface.ts
export interface IRepository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  findAll(options?: FindOptions): Promise<T[]>;
  findOne(filter: QueryFilter): Promise<T | null>;
  exists(id: string): Promise<boolean>;
  count(filter?: QueryFilter): Promise<number>;

  create(entity: T): Promise<T>;
  update(entity: T): Promise<T>;
  delete(id: string): Promise<void>;

  createMany(entities: T[]): Promise<T[]>;
  updateMany(entities: T[]): Promise<T[]>;
  deleteMany(ids: string[]): Promise<void>;
}

export interface FindOptions {
  filter?: QueryFilter;
  sort?: SortOptions;
  pagination?: PaginationOptions;
  includes?: string[];
}

export interface QueryFilter {
  [field: string]: any | QueryOperator;
}

export interface QueryOperator {
  $eq?: any;
  $ne?: any;
  $gt?: any;
  $gte?: any;
  $lt?: any;
  $lte?: any;
  $in?: any[];
  $nin?: any[];
  $contains?: string;
  $startsWith?: string;
  $endsWith?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}
```

### 3.2 Unit of Work 介面
```typescript
// src/lib/core/repositories/interfaces/unit-of-work.interface.ts
export interface IUnitOfWork {
  // Repositories
  sessions: ISessionRepository;
  evaluations: IEvaluationRepository;
  projects: IProjectRepository;
  users: IUserRepository;

  // Transaction management
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;

  // Utility
  clear(): void;
  dispose(): Promise<void>;
}

export interface ISessionRepository extends IRepository<SessionEntity> {
  findByUserId(userId: string): Promise<SessionEntity[]>;
  findActiveByUserId(userId: string): Promise<SessionEntity[]>;
  findByProjectId(projectId: string): Promise<SessionEntity[]>;
}

export interface IEvaluationRepository extends IRepository<EvaluationEntity> {
  findBySessionId(sessionId: string): Promise<EvaluationEntity[]>;
  findLatestBySessionId(sessionId: string): Promise<EvaluationEntity | null>;
}
```

## 4. Base Repository 實作

### 4.1 基礎 Repository 類別
```typescript
// src/lib/core/repositories/base/base.repository.ts
import { IRepository, FindOptions, QueryFilter } from '../interfaces';
import { BaseEntity } from '../../domain/entities';
import { IStorageProvider } from '../../storage/interfaces';

export abstract class BaseRepository<T extends BaseEntity> implements IRepository<T> {
  protected abstract collectionName: string;

  constructor(protected storage: IStorageProvider) {}

  protected getKey(id: string): string {
    return `${this.collectionName}/${id}`;
  }

  protected getCollectionPrefix(): string {
    return `${this.collectionName}/`;
  }

  async findById(id: string): Promise<T | null> {
    const key = this.getKey(id);
    const data = await this.storage.get<any>(key);

    if (!data) {
      return null;
    }

    return this.deserialize(data);
  }

  async findAll(options?: FindOptions): Promise<T[]> {
    const items = await this.storage.list<any>(this.getCollectionPrefix());
    const entities = items.map(item => this.deserialize(item));

    // Apply filters
    let filtered = entities;
    if (options?.filter) {
      filtered = this.applyFilter(entities, options.filter);
    }

    // Apply sorting
    if (options?.sort) {
      filtered = this.applySort(filtered, options.sort);
    }

    // Apply pagination
    if (options?.pagination) {
      filtered = this.applyPagination(filtered, options.pagination);
    }

    return filtered;
  }

  async findOne(filter: QueryFilter): Promise<T | null> {
    const all = await this.findAll({ filter });
    return all[0] || null;
  }

  async exists(id: string): Promise<boolean> {
    return this.storage.exists(this.getKey(id));
  }

  async count(filter?: QueryFilter): Promise<number> {
    const all = await this.findAll({ filter });
    return all.length;
  }

  async create(entity: T): Promise<T> {
    entity.updateVersion();
    const key = this.getKey(entity.id);
    await this.storage.set(key, this.serialize(entity));
    return entity;
  }

  async update(entity: T): Promise<T> {
    const existing = await this.findById(entity.id);
    if (!existing) {
      throw new Error(`Entity with id ${entity.id} not found`);
    }

    // Optimistic locking
    if (existing.version !== entity.version) {
      throw new Error('Entity has been modified by another process');
    }

    entity.updateVersion();
    const key = this.getKey(entity.id);
    await this.storage.set(key, this.serialize(entity));
    return entity;
  }

  async delete(id: string): Promise<void> {
    const key = this.getKey(id);
    await this.storage.delete(key);
  }

  async createMany(entities: T[]): Promise<T[]> {
    const operations = entities.map(entity => {
      entity.updateVersion();
      return {
        type: 'set' as const,
        key: this.getKey(entity.id),
        value: this.serialize(entity)
      };
    });

    await this.storage.batch(operations);
    return entities;
  }

  async updateMany(entities: T[]): Promise<T[]> {
    // Check all exist first
    for (const entity of entities) {
      const existing = await this.findById(entity.id);
      if (!existing) {
        throw new Error(`Entity with id ${entity.id} not found`);
      }
      if (existing.version !== entity.version) {
        throw new Error(`Entity ${entity.id} has been modified`);
      }
    }

    const operations = entities.map(entity => {
      entity.updateVersion();
      return {
        type: 'set' as const,
        key: this.getKey(entity.id),
        value: this.serialize(entity)
      };
    });

    await this.storage.batch(operations);
    return entities;
  }

  async deleteMany(ids: string[]): Promise<void> {
    const operations = ids.map(id => ({
      type: 'delete' as const,
      key: this.getKey(id)
    }));

    await this.storage.batch(operations);
  }

  // Filter implementation
  protected applyFilter(entities: T[], filter: QueryFilter): T[] {
    return entities.filter(entity => {
      const data = this.serialize(entity);

      for (const [field, condition] of Object.entries(filter)) {
        const value = this.getFieldValue(data, field);

        if (!this.matchesCondition(value, condition)) {
          return false;
        }
      }

      return true;
    });
  }

  protected matchesCondition(value: any, condition: any): boolean {
    if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
      // Handle operators
      for (const [op, expected] of Object.entries(condition)) {
        switch (op) {
          case '$eq': return value === expected;
          case '$ne': return value !== expected;
          case '$gt': return value > expected;
          case '$gte': return value >= expected;
          case '$lt': return value < expected;
          case '$lte': return value <= expected;
          case '$in': return (expected as any[]).includes(value);
          case '$nin': return !(expected as any[]).includes(value);
          case '$contains': return String(value).includes(expected as string);
          case '$startsWith': return String(value).startsWith(expected as string);
          case '$endsWith': return String(value).endsWith(expected as string);
          default: return false;
        }
      }
      return true;
    } else {
      // Direct equality
      return value === condition;
    }
  }

  protected getFieldValue(data: any, field: string): any {
    const parts = field.split('.');
    let value = data;

    for (const part of parts) {
      value = value?.[part];
    }

    return value;
  }

  protected applySort(entities: T[], sort: SortOptions): T[] {
    return [...entities].sort((a, b) => {
      const aValue = this.getFieldValue(this.serialize(a), sort.field);
      const bValue = this.getFieldValue(this.serialize(b), sort.field);

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  protected applyPagination(entities: T[], pagination: PaginationOptions): T[] {
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    return entities.slice(start, end);
  }

  // Abstract methods for serialization
  protected abstract serialize(entity: T): any;
  protected abstract deserialize(data: any): T;
}
```

### 4.2 Cached Repository
```typescript
// src/lib/core/repositories/base/cached.repository.ts
import { BaseRepository } from './base.repository';
import { BaseEntity } from '../../domain/entities';
import { IStorageProvider } from '../../storage/interfaces';
import { Cacheable, clearCache } from '../../storage/decorators';

export abstract class CachedRepository<T extends BaseEntity> extends BaseRepository<T> {
  private cache: Map<string, T> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly cacheTTL: number = 300000; // 5 minutes

  constructor(storage: IStorageProvider) {
    super(storage);
  }

  @Cacheable({ ttl: 300 })
  async findById(id: string): Promise<T | null> {
    // Check memory cache first
    const cached = this.getFromCache(id);
    if (cached) {
      return cached;
    }

    const entity = await super.findById(id);
    if (entity) {
      this.addToCache(entity);
    }

    return entity;
  }

  async create(entity: T): Promise<T> {
    const created = await super.create(entity);
    this.addToCache(created);
    this.invalidateListCache();
    return created;
  }

  async update(entity: T): Promise<T> {
    const updated = await super.update(entity);
    this.addToCache(updated);
    this.invalidateListCache();
    return updated;
  }

  async delete(id: string): Promise<void> {
    await super.delete(id);
    this.removeFromCache(id);
    this.invalidateListCache();
  }

  private getFromCache(id: string): T | null {
    const entity = this.cache.get(id);
    if (!entity) return null;

    const expiry = this.cacheExpiry.get(id);
    if (!expiry || Date.now() > expiry) {
      this.removeFromCache(id);
      return null;
    }

    return entity;
  }

  private addToCache(entity: T): void {
    this.cache.set(entity.id, entity);
    this.cacheExpiry.set(entity.id, Date.now() + this.cacheTTL);
  }

  private removeFromCache(id: string): void {
    this.cache.delete(id);
    this.cacheExpiry.delete(id);
  }

  private invalidateListCache(): void {
    clearCache(this.collectionName);
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    this.invalidateListCache();
  }
}
```

## 5. 具體 Repository 實作

### 5.1 Session Repository
```typescript
// src/lib/repositories/session.repository.ts
import { CachedRepository } from '@/lib/core/repositories/base';
import { ISessionRepository } from '@/lib/core/repositories/interfaces';
import { SessionEntity, SessionData } from '@/lib/core/domain/entities';

export class SessionRepository extends CachedRepository<SessionEntity> implements ISessionRepository {
  protected collectionName = 'sessions';

  protected serialize(entity: SessionEntity): SessionData {
    return entity.toJSON();
  }

  protected deserialize(data: SessionData): SessionEntity {
    return SessionEntity.fromJSON(data);
  }

  async findByUserId(userId: string): Promise<SessionEntity[]> {
    return this.findAll({
      filter: { userId }
    });
  }

  async findActiveByUserId(userId: string): Promise<SessionEntity[]> {
    return this.findAll({
      filter: {
        userId,
        status: { $in: ['active', 'paused'] }
      }
    });
  }

  async findByProjectId(projectId: string): Promise<SessionEntity[]> {
    return this.findAll({
      filter: { projectId }
    });
  }

  async findRecentSessions(userId: string, limit: number = 10): Promise<SessionEntity[]> {
    return this.findAll({
      filter: { userId },
      sort: { field: 'lastActiveAt', direction: 'desc' },
      pagination: { page: 1, limit }
    });
  }
}
```

### 5.2 Unit of Work 實作
```typescript
// src/lib/core/repositories/unit-of-work.ts
import { IUnitOfWork, ISessionRepository, IEvaluationRepository } from './interfaces';
import { IStorageProvider } from '../storage/interfaces';
import { SessionRepository } from '@/lib/repositories/session.repository';
import { EvaluationRepository } from '@/lib/repositories/evaluation.repository';

export class UnitOfWork implements IUnitOfWork {
  private _sessions: ISessionRepository;
  private _evaluations: IEvaluationRepository;
  private _isInTransaction: boolean = false;
  private _transactionOperations: any[] = [];

  constructor(private storage: IStorageProvider) {
    this._sessions = new SessionRepository(storage);
    this._evaluations = new EvaluationRepository(storage);
  }

  get sessions(): ISessionRepository {
    return this._sessions;
  }

  get evaluations(): IEvaluationRepository {
    return this._evaluations;
  }

  async beginTransaction(): Promise<void> {
    if (this._isInTransaction) {
      throw new Error('Transaction already in progress');
    }

    this._isInTransaction = true;
    this._transactionOperations = [];
  }

  async commit(): Promise<void> {
    if (!this._isInTransaction) {
      throw new Error('No transaction in progress');
    }

    try {
      // Execute all operations
      if (this._transactionOperations.length > 0) {
        await this.storage.batch(this._transactionOperations);
      }

      this._isInTransaction = false;
      this._transactionOperations = [];
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  async rollback(): Promise<void> {
    this._isInTransaction = false;
    this._transactionOperations = [];
    this.clear();
  }

  clear(): void {
    if (this._sessions instanceof CachedRepository) {
      this._sessions.clearCache();
    }
    if (this._evaluations instanceof CachedRepository) {
      this._evaluations.clearCache();
    }
  }

  async dispose(): Promise<void> {
    if (this._isInTransaction) {
      await this.rollback();
    }
    this.clear();
  }
}
```

## 6. 使用範例

### 6.1 在 Service 中使用
```typescript
// src/lib/services/learning.service.ts
import { UnitOfWork } from '@/lib/core/repositories';
import { SessionEntity } from '@/lib/core/domain/entities';

export class LearningService {
  private uow: UnitOfWork;

  constructor(storageProvider: IStorageProvider) {
    this.uow = new UnitOfWork(storageProvider);
  }

  async startLearningSession(userId: string, projectId: string): Promise<SessionEntity> {
    await this.uow.beginTransaction();

    try {
      // Check if user already has active session
      const activeSessions = await this.uow.sessions.findActiveByUserId(userId);
      if (activeSessions.length > 0) {
        throw new Error('User already has an active session');
      }

      // Create new session
      const session = new SessionEntity({
        userId,
        projectId,
        type: 'pbl',
        metadata: { source: 'web' }
      });

      session.start();

      const created = await this.uow.sessions.create(session);

      await this.uow.commit();
      return created;
    } catch (error) {
      await this.uow.rollback();
      throw error;
    }
  }

  async pauseSession(sessionId: string): Promise<SessionEntity> {
    const session = await this.uow.sessions.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.pause();
    return this.uow.sessions.update(session);
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    const sessions = await this.uow.sessions.findByUserId(userId);
    const completedCount = sessions.filter(s => s.status.value === 'completed').length;
    const activeCount = sessions.filter(s =>
      s.status.value === 'active' || s.status.value === 'paused'
    ).length;

    return {
      totalSessions: sessions.length,
      completedSessions: completedCount,
      activeSessions: activeCount,
      recentSessions: sessions.slice(0, 5)
    };
  }
}
```

### 6.2 在 API Route 中使用
```typescript
// src/app/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { LocalStorageProvider } from '@/lib/core/storage/providers';
import { LearningService } from '@/lib/services/learning.service';

const storage = new LocalStorageProvider();
const learningService = new LearningService(storage);

export async function POST(req: NextRequest) {
  try {
    const { userId, projectId } = await req.json();

    if (!userId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const session = await learningService.startLearningSession(userId, projectId);

    return NextResponse.json(session.toJSON(), { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }

  const progress = await learningService.getUserProgress(userId);

  return NextResponse.json(progress);
}
```

## 7. 測試範例

```typescript
// src/lib/repositories/__tests__/session.repository.test.ts
import { SessionRepository } from '../session.repository';
import { MockStorageProvider } from '@/lib/core/storage/__mocks__';
import { SessionEntity } from '@/lib/core/domain/entities';

describe('SessionRepository', () => {
  let repository: SessionRepository;
  let mockStorage: MockStorageProvider;

  beforeEach(() => {
    mockStorage = new MockStorageProvider();
    repository = new SessionRepository(mockStorage);
  });

  describe('findByUserId', () => {
    it('should return all sessions for a user', async () => {
      // Arrange
      const userId = 'user123';
      const sessions = [
        new SessionEntity({ userId, projectId: 'p1', type: 'pbl' }),
        new SessionEntity({ userId, projectId: 'p2', type: 'assessment' }),
        new SessionEntity({ userId: 'other', projectId: 'p3', type: 'pbl' })
      ];

      for (const session of sessions) {
        await mockStorage.set(`sessions/${session.id}`, session.toJSON());
      }

      // Act
      const userSessions = await repository.findByUserId(userId);

      // Assert
      expect(userSessions).toHaveLength(2);
      expect(userSessions.every(s => s.userId === userId)).toBe(true);
    });
  });

  describe('findActiveByUserId', () => {
    it('should return only active and paused sessions', async () => {
      // Arrange
      const userId = 'user123';
      const activeSession = new SessionEntity({ userId, projectId: 'p1', type: 'pbl' });
      activeSession.start();

      const pausedSession = new SessionEntity({ userId, projectId: 'p2', type: 'pbl' });
      pausedSession.start();
      pausedSession.pause();

      const completedSession = new SessionEntity({ userId, projectId: 'p3', type: 'pbl' });
      completedSession.start();
      completedSession.complete();

      await repository.create(activeSession);
      await repository.create(pausedSession);
      await repository.create(completedSession);

      // Act
      const activeSessions = await repository.findActiveByUserId(userId);

      // Assert
      expect(activeSessions).toHaveLength(2);
      expect(activeSessions.map(s => s.status.value)).toEqual(['active', 'paused']);
    });
  });
});
```

## 8. 下一步

完成 Repository 模式後，接下來：
1. 實作各領域的具體 Repository（Evaluation, Project, User）
2. 建立 Service 層整合業務邏輯
3. 遷移現有程式碼使用新的 Repository

這個實作提供了完整的資料存取層抽象，支援事務、快取和複雜查詢。
