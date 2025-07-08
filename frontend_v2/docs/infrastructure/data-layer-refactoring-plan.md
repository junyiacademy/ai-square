# Data Layer 重構計劃 - 先架構後資料庫

## Executive Summary

在實施 Cloud SQL 之前，先進行 Data Layer 架構重構。這樣可以確保：
1. 清晰的資料存取模式
2. 更容易的資料庫遷移
3. 更好的程式碼品質和可維護性
4. 漸進式重構，不影響現有功能

## 1. 重構目標

### 1.1 核心目標
- **統一資料存取模式**：所有模組使用相同的 Repository/Service 模式
- **關注點分離**：業務邏輯、資料存取、儲存實作完全分離
- **可測試性**：每層都可以獨立測試
- **可擴展性**：輕鬆切換不同的儲存後端

### 1.2 設計原則
- **DRY (Don't Repeat Yourself)**：避免重複的資料存取邏輯
- **SOLID 原則**：特別是單一職責和依賴反轉
- **漸進式增強**：保持向後相容，逐步改進

## 2. 現狀分析

### 2.1 現有問題
```typescript
// 問題 1: 巨大的 Service 類別
export class UserDataService {
  // 400+ 行程式碼處理所有 Discovery 資料
  saveAssessmentResult() { /* ... */ }
  getAchievements() { /* ... */ }
  saveWorkspace() { /* ... */ }
  savePath() { /* ... */ }
  // ... 20+ 個方法
}

// 問題 2: 直接存取 localStorage
const savedPaths = localStorage.getItem('discovery_paths');

// 問題 3: 不一致的模式
// Discovery 用 Service + localStorage
// PBL 用 API calls
// 沒有統一的介面
```

### 2.2 現有優勢
```typescript
// 已有良好的抽象基礎
export abstract class BaseStorageService<T> {
  // 完善的介面設計
  abstract get(key: string): Promise<T | null>;
  abstract set(key: string, value: T): Promise<void>;
  abstract list(): Promise<T[]>;
  // 內建快取、fallback、錯誤處理
}
```

## 3. 新架構設計

### 3.1 整體架構
```
┌─────────────────────────────────────────────────────────┐
│                    UI Components                         │
│              (Pages, Components, Hooks)                  │
├─────────────────────────────────────────────────────────┤
│                    Domain Services                       │
│         (DiscoveryService, PBLService, etc.)            │
├─────────────────────────────────────────────────────────┤
│                    Repositories                          │
│    (WorkspaceRepo, AssessmentRepo, PathRepo, etc.)     │
├─────────────────────────────────────────────────────────┤
│                 Storage Abstraction                      │
│              (IStorageProvider interface)                │
├─────────────────────────────────────────────────────────┤
│                Storage Implementations                   │
│      (LocalStorage, GCS, Database - future)            │
└─────────────────────────────────────────────────────────┘
```

### 3.2 核心介面定義
```typescript
// src/lib/data/interfaces/storage.interface.ts
export interface IStorageProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list<T>(prefix: string): Promise<T[]>;
  exists(key: string): Promise<boolean>;
  batch<T>(operations: BatchOperation[]): Promise<void>;
}

// src/lib/data/interfaces/repository.interface.ts
export interface IRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(filter?: FilterOptions): Promise<T[]>;
  findOne(filter: FilterOptions): Promise<T | null>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
  exists(id: ID): Promise<boolean>;
}

// src/lib/data/interfaces/unit-of-work.interface.ts
export interface IUnitOfWork {
  workspaces: IWorkspaceRepository;
  assessments: IAssessmentRepository;
  paths: IPathRepository;
  tasks: ITaskRepository;
  achievements: IAchievementRepository;
  
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
```

### 3.3 Repository 實作範例
```typescript
// src/lib/data/repositories/workspace.repository.ts
export class WorkspaceRepository extends BaseRepository<DiscoveryWorkspace> {
  constructor(storage: IStorageProvider) {
    super(storage, {
      collectionName: 'discovery_workspaces',
      schemaVersion: 1,
      indexes: ['userId', 'pathId']
    });
  }
  
  async findByUserId(userId: string): Promise<DiscoveryWorkspace[]> {
    return this.findAll({ userId });
  }
  
  async findActiveByUser(userId: string): Promise<DiscoveryWorkspace[]> {
    return this.findAll({ 
      userId, 
      status: 'active' 
    });
  }
  
  async updateProgress(
    id: string, 
    taskIndex: number, 
    completedCount: number
  ): Promise<DiscoveryWorkspace> {
    return this.update(id, {
      currentTaskIndex: taskIndex,
      completedTasksCount: completedCount,
      updatedAt: new Date().toISOString()
    });
  }
}
```

### 3.4 Service 層範例
```typescript
// src/lib/data/services/discovery-data.service.ts
export class DiscoveryDataService {
  constructor(private uow: IUnitOfWork) {}
  
  async createWorkspace(
    userId: string,
    pathId: string,
    title: string
  ): Promise<CompleteWorkspace> {
    // 開始事務
    await this.uow.beginTransaction();
    
    try {
      // 創建工作區
      const workspace = await this.uow.workspaces.create({
        userId,
        pathId,
        title,
        status: 'active',
        currentTaskIndex: 0,
        completedTasksCount: 0,
        totalXp: 0,
        achievements: []
      });
      
      // 獲取路徑資料
      const path = await this.uow.paths.findById(pathId);
      if (!path) throw new Error('Path not found');
      
      // 創建初始任務
      const tasks = await this.createInitialTasks(workspace.id, path);
      
      await this.uow.commit();
      
      return { ...workspace, tasks, path };
    } catch (error) {
      await this.uow.rollback();
      throw error;
    }
  }
}
```

## 4. 實施計劃

### 4.1 Phase 1: 基礎建設 (Week 1-2)

#### 4.1.1 建立核心介面
```typescript
// 建立資料夾結構
frontend/src/lib/data/
├── interfaces/
│   ├── storage.interface.ts
│   ├── repository.interface.ts
│   └── unit-of-work.interface.ts
├── repositories/
│   ├── base.repository.ts
│   └── index.ts
├── services/
│   └── index.ts
├── storage/
│   ├── local-storage.provider.ts
│   ├── gcs-storage.provider.ts
│   └── index.ts
└── models/
    └── index.ts
```

#### 4.1.2 實作儲存提供者
```typescript
// src/lib/data/storage/local-storage.provider.ts
export class LocalStorageProvider implements IStorageProvider {
  private prefix: string;
  
  constructor(prefix: string = 'ai_square_') {
    this.prefix = prefix;
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  }
  
  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(
        this.prefix + key, 
        JSON.stringify(value)
      );
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      throw error;
    }
  }
  
  async list<T>(prefix: string): Promise<T[]> {
    const results: T[] = [];
    const fullPrefix = this.prefix + prefix;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(fullPrefix)) {
        const item = await this.get<T>(
          key.substring(this.prefix.length)
        );
        if (item) results.push(item);
      }
    }
    
    return results;
  }
}
```

### 4.2 Phase 2: Discovery 模組重構 (Week 3-4)

#### 4.2.1 拆分 UserDataService
```typescript
// 原本：一個巨大的 Service
// 新的：多個專注的 Repository

// src/lib/data/repositories/discovery/assessment.repository.ts
export class AssessmentRepository extends BaseRepository<AssessmentResult> {
  constructor(storage: IStorageProvider) {
    super(storage, {
      collectionName: 'assessments',
      schemaVersion: 1
    });
  }
  
  async findLatestByUser(userId: string): Promise<AssessmentResult | null> {
    const all = await this.findAll({ userId });
    return all.sort((a, b) => 
      new Date(b.completedAt).getTime() - 
      new Date(a.completedAt).getTime()
    )[0] || null;
  }
}

// 為每個資料類型創建對應的 Repository
// - WorkspaceRepository
// - PathRepository  
// - TaskRepository
// - AchievementRepository
// - AIConversationRepository
```

#### 4.2.2 更新 Hooks
```typescript
// src/hooks/useDiscoveryData.ts
export function useDiscoveryData() {
  // 保持介面不變，內部使用新的 Service
  const dataService = useDataService();
  
  return {
    // 原有的所有方法保持不變
    assessments: {
      save: (data) => dataService.discovery.saveAssessment(data),
      getAll: () => dataService.discovery.getAssessments(),
      getLatest: () => dataService.discovery.getLatestAssessment()
    },
    // ... 其他方法
  };
}
```

### 4.3 Phase 3: PBL 模組統一 (Week 5)

#### 4.3.1 統一 PBL 資料存取
```typescript
// src/lib/data/repositories/pbl/pbl-progress.repository.ts
export class PBLProgressRepository extends BaseRepository<PBLProgress> {
  constructor(storage: IStorageProvider) {
    super(storage, {
      collectionName: 'pbl_progress',
      schemaVersion: 1,
      indexes: ['userId', 'scenarioId']
    });
  }
  
  async findByScenario(
    userId: string, 
    scenarioId: string
  ): Promise<PBLProgress[]> {
    return this.findAll({ userId, scenarioId });
  }
}
```

### 4.4 Phase 4: 測試與驗證 (Week 6)

#### 4.4.1 單元測試
```typescript
// src/lib/data/repositories/__tests__/workspace.repository.test.ts
describe('WorkspaceRepository', () => {
  let repository: WorkspaceRepository;
  let mockStorage: jest.Mocked<IStorageProvider>;
  
  beforeEach(() => {
    mockStorage = createMockStorage();
    repository = new WorkspaceRepository(mockStorage);
  });
  
  it('should create workspace with correct data', async () => {
    const workspace = await repository.create({
      userId: 'user123',
      pathId: 'path123',
      title: 'Test Workspace'
    });
    
    expect(mockStorage.set).toHaveBeenCalledWith(
      expect.stringContaining('discovery_workspaces'),
      expect.objectContaining({
        userId: 'user123',
        pathId: 'path123'
      })
    );
  });
});
```

#### 4.4.2 整合測試
```typescript
// src/lib/data/__tests__/integration/discovery-flow.test.ts
describe('Discovery Data Flow Integration', () => {
  let dataService: DiscoveryDataService;
  
  beforeEach(() => {
    const storage = new LocalStorageProvider('test_');
    const uow = new UnitOfWork(storage);
    dataService = new DiscoveryDataService(uow);
  });
  
  it('should handle complete workspace creation flow', async () => {
    // 創建評估
    const assessment = await dataService.createAssessment({
      userId: 'test-user',
      results: { tech: 80, creative: 60, business: 40 }
    });
    
    // 基於評估創建工作區
    const workspace = await dataService.createWorkspace(
      'test-user',
      'ai-developer-path',
      'AI Developer Journey'
    );
    
    expect(workspace).toBeDefined();
    expect(workspace.tasks).toHaveLength(3);
  });
});
```

### 4.5 Phase 5: 資料庫準備 (Week 7)

#### 4.5.1 建立資料庫 Storage Provider
```typescript
// src/lib/data/storage/database-storage.provider.ts
export class DatabaseStorageProvider implements IStorageProvider {
  constructor(private prisma: PrismaClient) {}
  
  async get<T>(key: string): Promise<T | null> {
    // 解析 key 格式: collection/id
    const [collection, id] = key.split('/');
    
    // 根據 collection 查詢對應的表
    const result = await this.prisma[collection].findUnique({
      where: { id }
    });
    
    return result as T;
  }
  
  async set<T>(key: string, value: T): Promise<void> {
    const [collection, id] = key.split('/');
    
    await this.prisma[collection].upsert({
      where: { id },
      create: { id, ...value },
      update: value
    });
  }
  
  // ... 其他方法
}
```

#### 4.5.2 配置切換機制
```typescript
// src/lib/data/config/storage.config.ts
export class StorageConfig {
  static getProvider(): IStorageProvider {
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'local';
    
    switch (storageType) {
      case 'local':
        return new LocalStorageProvider();
      case 'gcs':
        return new GCSStorageProvider();
      case 'database':
        return new DatabaseStorageProvider(prisma);
      default:
        return new LocalStorageProvider();
    }
  }
}
```

## 5. 遷移策略

### 5.1 漸進式遷移
```typescript
// 使用 Adapter Pattern 保持向後相容
export class LegacyUserDataServiceAdapter {
  constructor(private dataService: DiscoveryDataService) {}
  
  // 保持原有介面
  async saveAssessmentResult(userId: string, data: any) {
    // 內部使用新的 Service
    return this.dataService.saveAssessment({
      userId,
      ...data
    });
  }
  
  // ... 其他方法的適配
}
```

### 5.2 功能開關
```typescript
// 使用 feature flag 控制新舊實作
export function useDiscoveryData() {
  const isNewDataLayer = useFeatureFlag('new-data-layer');
  
  if (isNewDataLayer) {
    return useNewDiscoveryData();
  } else {
    return useLegacyDiscoveryData();
  }
}
```

## 6. 成功指標

### 6.1 技術指標
- **程式碼行數減少**: UserDataService 從 400+ 行拆分為多個 <100 行的 Repository
- **測試覆蓋率**: 達到 90%+ 的單元測試覆蓋
- **依賴關係**: 清晰的依賴注入，無循環依賴
- **效能**: 資料存取延遲 <50ms

### 6.2 開發體驗指標
- **新功能開發時間**: 減少 30%
- **除錯時間**: 減少 50%
- **程式碼審查時間**: 減少 40%

## 7. 風險與緩解

### 7.1 風險
1. **重構範圍過大**: 可能影響現有功能
2. **測試不足**: 可能引入新的 bugs
3. **團隊學習曲線**: 新架構需要時間適應

### 7.2 緩解措施
1. **漸進式重構**: 一次只改一個模組
2. **完整測試**: 每個 PR 都要有對應的測試
3. **文檔與培訓**: 提供清晰的架構文檔和範例

## 8. 下一步：資料庫實施

完成 Data Layer 重構後，實施資料庫將變得簡單：

1. **實作 DatabaseStorageProvider**: 只需要實作 IStorageProvider 介面
2. **配置切換**: 透過環境變數切換儲存後端
3. **資料遷移**: Repository 已經標準化，遷移邏輯清晰
4. **漸進部署**: 可以一個 Repository 一個 Repository 地遷移

```typescript
// 未來切換到資料庫只需要
const provider = new DatabaseStorageProvider(prisma);
const uow = new UnitOfWork(provider);
// 所有上層程式碼都不需要改變！
```

## 總結

這個重構計劃提供了：
1. **清晰的架構**: 分層明確，職責單一
2. **漸進式實施**: 不影響現有功能
3. **未來擴展性**: 輕鬆切換到資料庫
4. **更好的開發體驗**: 程式碼更容易理解和維護

完成這個重構後，實施資料庫將變成一個簡單的配置變更，而不是大規模的程式碼修改。