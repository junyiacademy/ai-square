# Database Migration Coverage Analysis - localStorage & GCS

## 1. 現有資料儲存位置分析

### 1.1 localStorage 儲存的資料
```typescript
// 目前在 localStorage 中的資料類型
const localStorageKeys = {
  // 認證相關
  'auth_token': 'JWT token',
  'refresh_token': 'Refresh token',
  'user_email': 'User email',
  
  // 用戶偏好
  'theme': 'light/dark',
  'locale': 'zh-TW/en/etc',
  'ai_square_language': 'Current language',
  
  // Discovery 功能
  'discovery_assessments': 'Assessment results',
  'discovery_paths': 'Saved paths',
  'discovery_workspaces': 'Active workspaces',
  'discovery_ai_conversations': 'AI chat history',
  
  // PBL 功能
  'pbl_draft_responses': 'Draft answers',
  'pbl_current_task': 'Current task state',
  
  // 快取
  'cache_*': 'Various cached data'
};
```

### 1.2 GCS 儲存的資料
```typescript
// GCS bucket 結構
const gcsStructure = {
  'users/{email}/': {
    'profile.json': 'User profile data',
    'learning_progress.json': 'Learning progress',
    'assessment_results.json': 'Assessment history',
    
    'pbl_scenarios/{scenarioId}/': {
      'program_{programId}.json': 'Program progress',
      'task_{taskId}_response.json': 'Task responses',
      'evaluations.json': 'AI evaluations'
    },
    
    'discovery/': {
      'workspaces.json': 'All workspaces',
      'workspace_{id}/': {
        'data.json': 'Workspace data',
        'tasks.json': 'Task progress',
        'achievements.json': 'Earned achievements'
      }
    }
  }
};
```

## 2. 資料對應策略

### 2.1 完整對應表
```typescript
interface DataMigrationMapping {
  source: {
    localStorage?: string[];
    gcs?: string[];
  };
  target: {
    table: string;
    fields: string[];
  };
  transform: (data: any) => any;
  validation: (data: any) => boolean;
}

const migrationMappings: DataMigrationMapping[] = [
  {
    // 用戶基本資料
    source: {
      localStorage: ['user_email', 'theme', 'locale'],
      gcs: ['users/{email}/profile.json']
    },
    target: {
      table: 'users',
      fields: ['email', 'name', 'locale', 'avatar_url']
    },
    transform: (data) => ({
      email: data.localStorage.user_email || data.gcs.email,
      name: data.gcs?.profile?.name,
      locale: data.localStorage.locale || data.gcs?.profile?.locale || 'zh-TW',
      avatarUrl: data.gcs?.profile?.avatar_url
    }),
    validation: (data) => !!data.email
  },
  
  {
    // Discovery 評估結果
    source: {
      localStorage: ['discovery_assessments'],
      gcs: ['users/{email}/discovery/assessments.json']
    },
    target: {
      table: 'assessment_results',
      fields: ['user_id', 'assessment_type', 'scores']
    },
    transform: (data) => {
      const assessments = data.localStorage?.discovery_assessments || 
                         data.gcs?.assessments || [];
      return assessments.map(a => ({
        assessmentType: 'discovery_interest',
        scores: a.results,
        completedAt: a.completedAt || new Date()
      }));
    },
    validation: (data) => Array.isArray(data) && data.length > 0
  },
  
  {
    // Discovery 工作區
    source: {
      localStorage: ['discovery_workspaces'],
      gcs: ['users/{email}/discovery/workspaces.json']
    },
    target: {
      table: 'discovery_workspaces',
      fields: ['path_id', 'title', 'status', 'workspace_data']
    },
    transform: (data) => {
      const workspaces = data.localStorage?.discovery_workspaces || 
                        data.gcs?.workspaces || [];
      return workspaces.map(w => ({
        pathId: w.pathId,
        title: w.title,
        status: w.status || 'active',
        currentTaskIndex: w.currentTaskIndex || 0,
        completedTasksCount: w.completedTasks?.length || 0,
        totalXp: w.totalXp || 0,
        achievements: w.achievements || [],
        workspaceData: w
      }));
    },
    validation: (data) => Array.isArray(data)
  }
  
  // ... 更多對應關係
];
```

## 3. 遷移保證機制

### 3.1 資料完整性檢查
```typescript
export class MigrationValidator {
  async validateDataCompleteness(email: string): Promise<ValidationReport> {
    const report: ValidationReport = {
      email,
      timestamp: new Date(),
      checks: [],
      hasErrors: false
    };
    
    // 1. 收集所有資料來源
    const localData = await this.collectLocalStorageData(email);
    const gcsData = await this.collectGCSData(email);
    
    // 2. 檢查每個資料類型
    for (const mapping of migrationMappings) {
      const check = await this.validateMapping(mapping, localData, gcsData);
      report.checks.push(check);
      if (!check.passed) report.hasErrors = true;
    }
    
    // 3. 檢查資料一致性
    const consistencyCheck = await this.checkDataConsistency(localData, gcsData);
    report.checks.push(consistencyCheck);
    
    return report;
  }
  
  private async checkDataConsistency(
    localData: any, 
    gcsData: any
  ): Promise<Check> {
    const inconsistencies = [];
    
    // 檢查 Discovery 工作區數量
    const localWorkspaces = localData.discovery_workspaces?.length || 0;
    const gcsWorkspaces = gcsData.discovery?.workspaces?.length || 0;
    
    if (localWorkspaces !== gcsWorkspaces) {
      inconsistencies.push({
        type: 'workspace_count_mismatch',
        local: localWorkspaces,
        gcs: gcsWorkspaces
      });
    }
    
    // 檢查 PBL 進度
    const localPblTasks = Object.keys(localData.pbl_draft_responses || {}).length;
    const gcsPblTasks = this.countGcsPblTasks(gcsData);
    
    if (localPblTasks > 0 && gcsPblTasks === 0) {
      inconsistencies.push({
        type: 'pbl_data_only_in_local',
        count: localPblTasks
      });
    }
    
    return {
      name: 'data_consistency',
      passed: inconsistencies.length === 0,
      details: inconsistencies
    };
  }
}
```

### 3.2 雙向同步機制
```typescript
export class DataSyncService {
  async syncBeforeMigration(email: string): Promise<SyncResult> {
    // 1. 先將 localStorage 資料同步到 GCS
    const localData = await this.getLocalStorageData(email);
    await this.syncLocalToGCS(email, localData);
    
    // 2. 再從 GCS 讀取完整資料
    const gcsData = await this.getGCSData(email);
    
    // 3. 合併資料（GCS 為主，localStorage 為輔）
    const mergedData = this.mergeData(gcsData, localData);
    
    // 4. 寫回 GCS 確保一致性
    await this.saveToGCS(email, mergedData);
    
    return {
      localDataPoints: Object.keys(localData).length,
      gcsDataPoints: Object.keys(gcsData).length,
      mergedDataPoints: Object.keys(mergedData).length,
      timestamp: new Date()
    };
  }
  
  private mergeData(gcsData: any, localData: any): any {
    const merged = { ...gcsData };
    
    // Discovery 資料合併
    if (localData.discovery_workspaces) {
      merged.discovery = merged.discovery || {};
      merged.discovery.workspaces = this.mergeWorkspaces(
        merged.discovery.workspaces || [],
        localData.discovery_workspaces
      );
    }
    
    // PBL 草稿合併
    if (localData.pbl_draft_responses) {
      merged.pbl_drafts = localData.pbl_draft_responses;
    }
    
    // 用戶偏好合併
    if (localData.theme || localData.locale) {
      merged.preferences = {
        ...merged.preferences,
        theme: localData.theme || merged.preferences?.theme,
        locale: localData.locale || merged.preferences?.locale
      };
    }
    
    return merged;
  }
}
```

## 4. 遷移流程保證

### 4.1 三階段遷移策略
```typescript
export class ThreePhaseMigration {
  async migrate(email: string): Promise<MigrationResult> {
    const transaction = await this.beginTransaction();
    
    try {
      // Phase 1: 預遷移檢查
      const validation = await this.preflightCheck(email);
      if (!validation.passed) {
        throw new Error('Preflight check failed');
      }
      
      // Phase 2: 資料遷移
      const migrationResult = await this.migrateData(email, transaction);
      
      // Phase 3: 驗證遷移
      const postValidation = await this.postMigrationValidation(
        email, 
        migrationResult,
        transaction
      );
      
      if (postValidation.passed) {
        await transaction.commit();
        
        // 保留原始資料 30 天
        await this.archiveOriginalData(email);
      } else {
        await transaction.rollback();
        throw new Error('Post-migration validation failed');
      }
      
      return migrationResult;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  private async preflightCheck(email: string): Promise<ValidationResult> {
    const checks = [];
    
    // 1. 檢查用戶是否存在
    checks.push(await this.checkUserExists(email));
    
    // 2. 檢查資料來源可用性
    checks.push(await this.checkDataSourcesAvailable(email));
    
    // 3. 檢查資料完整性
    checks.push(await this.checkDataIntegrity(email));
    
    // 4. 檢查儲存空間
    checks.push(await this.checkStorageQuota(email));
    
    return {
      passed: checks.every(c => c.passed),
      checks
    };
  }
}
```

### 4.2 資料驗證規則
```typescript
const VALIDATION_RULES = {
  // 必須存在的資料
  required: [
    'users.email',
    'users.created_at'
  ],
  
  // 資料一致性規則
  consistency: [
    {
      name: 'workspace_task_count',
      check: (data) => {
        const workspace = data.discovery_workspaces[0];
        const tasks = data.discovery_tasks.filter(
          t => t.workspace_id === workspace.id
        );
        return tasks.length === workspace.completed_tasks_count;
      }
    },
    {
      name: 'learning_progress_range',
      check: (data) => {
        return data.learning_progress.every(
          p => p.progress >= 0 && p.progress <= 100
        );
      }
    }
  ],
  
  // 資料完整性規則
  integrity: [
    {
      name: 'no_orphaned_tasks',
      check: (data) => {
        const workspaceIds = data.discovery_workspaces.map(w => w.id);
        return data.discovery_tasks.every(
          t => workspaceIds.includes(t.workspace_id)
        );
      }
    }
  ]
};
```

## 5. 實際執行保證

### 5.1 遷移腳本
```typescript
// scripts/migrate-all-users.ts
export class BatchMigration {
  async migrateAllUsers(options: MigrationOptions): Promise<BatchResult> {
    const users = await this.getAllUsers();
    const results = [];
    
    // 分批處理避免超載
    const batches = this.createBatches(users, options.batchSize || 100);
    
    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(user => this.migrateUser(user.email))
      );
      
      results.push(...batchResults);
      
      // 產生進度報告
      await this.generateProgressReport(results, users.length);
      
      // 暫停避免過載
      await this.delay(options.delayBetweenBatches || 1000);
    }
    
    return this.generateFinalReport(results);
  }
  
  private async migrateUser(email: string): Promise<UserMigrationResult> {
    const startTime = Date.now();
    
    try {
      // 1. 同步資料
      await this.syncService.syncBeforeMigration(email);
      
      // 2. 驗證資料
      const validation = await this.validator.validateDataCompleteness(email);
      if (!validation.passed) {
        throw new Error(`Validation failed: ${JSON.stringify(validation)}`);
      }
      
      // 3. 執行遷移
      const result = await this.migrationService.migrate(email);
      
      return {
        email,
        success: true,
        duration: Date.now() - startTime,
        recordsMigrated: result.totalRecords
      };
    } catch (error) {
      return {
        email,
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }
}
```

### 5.2 回滾機制
```typescript
export class MigrationRollback {
  async rollbackUser(email: string): Promise<void> {
    // 1. 從備份恢復資料
    const backup = await this.getBackup(email);
    
    // 2. 清除資料庫中的資料
    await this.clearDatabaseData(email);
    
    // 3. 恢復到 localStorage 和 GCS
    await this.restoreToLocalStorage(email, backup.localStorage);
    await this.restoreToGCS(email, backup.gcs);
    
    // 4. 驗證恢復成功
    const validation = await this.validateRestore(email, backup);
    if (!validation.success) {
      throw new Error('Rollback validation failed');
    }
  }
}
```

## 6. 監控和報告

### 6.1 遷移儀表板
```typescript
// app/admin/migration/dashboard/page.tsx
export function MigrationDashboard() {
  const { data: stats } = useMigrationStats();
  
  return (
    <div>
      <h2>遷移進度監控</h2>
      
      {/* 整體進度 */}
      <ProgressBar 
        value={stats.completed} 
        total={stats.total}
        label={`${stats.completed} / ${stats.total} 用戶已完成`}
      />
      
      {/* 資料覆蓋率 */}
      <DataCoverageChart>
        <DataSource name="localStorage" coverage={stats.localStorageCoverage} />
        <DataSource name="GCS" coverage={stats.gcsCoverage} />
        <DataSource name="Combined" coverage={stats.combinedCoverage} />
      </DataCoverageChart>
      
      {/* 錯誤列表 */}
      <ErrorList errors={stats.errors} />
      
      {/* 資料一致性報告 */}
      <ConsistencyReport mismatches={stats.dataInconsistencies} />
    </div>
  );
}
```

## 7. 保證措施總結

### 7.1 技術保證
1. **雙重資料來源檢查**：同時讀取 localStorage 和 GCS
2. **資料合併策略**：GCS 為主，localStorage 補充
3. **事務性遷移**：失敗自動回滾
4. **驗證三重檢查**：遷移前、中、後驗證

### 7.2 流程保證
1. **預遷移同步**：確保資料一致性
2. **批次處理**：避免系統過載
3. **進度追蹤**：即時監控遷移狀態
4. **備份機制**：30 天資料保留

### 7.3 人工保證
1. **遷移報告**：詳細的遷移結果報告
2. **異常處理**：人工介入處理特殊情況
3. **驗證清單**：人工抽查重要用戶資料
4. **回滾計劃**：隨時可恢復原始狀態

## 8. 執行建議

### 8.1 分階段執行
```
Week 1-2: 內部測試用戶（~100 用戶）
Week 3-4: Beta 用戶（~1,000 用戶）
Week 5-6: 一般用戶（分批執行）
Week 7-8: 清理和優化
```

### 8.2 風險緩解
- 保留雙寫模式 30 天
- 每日備份驗證
- 即時監控告警
- 用戶通知機制

這個方案確保了 localStorage 和 GCS 的資料都能被完整遷移，並提供了多重保證機制。