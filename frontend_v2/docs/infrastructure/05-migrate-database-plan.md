# /migrate - 資料庫遷移管理計劃

## 遷移概覽

從 localStorage/GCS 遷移到 Cloud SQL 的完整遷移策略，確保零資料遺失和最小停機時間。

## 1. 遷移策略

### 1.1 遷移方式：藍綠部署 + 雙寫
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Phase 1   │ --> │   Phase 2   │ --> │   Phase 3   │
│  雙寫模式   │     │  雙讀驗證   │     │  切換完成   │
└─────────────┘     └─────────────┘     └─────────────┘
     30 天               7 天               永久
```

### 1.2 資料流轉換
```typescript
// 現有資料結構 (localStorage/GCS)
{
  "discovery_workspaces": [...],
  "pbl_progress": {...},
  "assessment_results": [...]
}

// 目標資料結構 (Database)
learning_sessions
├── discovery_sessions
├── pbl_sessions
└── assessment_sessions

evaluations
├── quiz_evaluations
├── task_evaluations
└── peer_evaluations
```

## 2. 遷移腳本設計

### 2.1 主遷移腳本
```typescript
// scripts/migrate-to-database.ts
import { MigrationOrchestrator } from './migration/orchestrator';
import { DataValidator } from './migration/validator';
import { MigrationReporter } from './migration/reporter';

async function main() {
  const orchestrator = new MigrationOrchestrator({
    source: 'localStorage',
    target: 'database',
    mode: process.env.MIGRATION_MODE || 'dry-run',
    batchSize: 100,
    parallelism: 5
  });
  
  try {
    // 1. 預檢查
    await orchestrator.preflightCheck();
    
    // 2. 執行遷移
    const result = await orchestrator.migrate();
    
    // 3. 驗證結果
    await orchestrator.validate(result);
    
    // 4. 生成報告
    await orchestrator.generateReport(result);
    
  } catch (error) {
    await orchestrator.rollback();
    throw error;
  }
}
```

### 2.2 資料轉換器
```typescript
// scripts/migration/transformers/discovery.transformer.ts
export class DiscoveryTransformer {
  transform(localData: LocalDiscoveryData): DatabaseRecords {
    const sessions: LearningSession[] = [];
    const evaluations: Evaluation[] = [];
    
    // 轉換 workspace 到 session
    for (const workspace of localData.workspaces) {
      const session = {
        id: generateUUID(),
        type: 'discovery',
        userId: localData.userId,
        projectId: workspace.pathId,
        status: this.mapStatus(workspace.status),
        startedAt: workspace.createdAt,
        metadata: {
          workspaceId: workspace.id,
          totalXp: workspace.totalXp,
          achievements: workspace.achievements
        }
      };
      sessions.push(session);
      
      // 轉換任務評估
      for (const task of workspace.tasks) {
        if (task.evaluation) {
          evaluations.push({
            id: generateUUID(),
            sessionId: session.id,
            type: 'task',
            evaluatedAt: task.completedAt,
            result: task.evaluation
          });
        }
      }
    }
    
    return { sessions, evaluations };
  }
  
  private mapStatus(oldStatus: string): SessionStatus {
    const statusMap = {
      'active': 'active',
      'completed': 'completed',
      'abandoned': 'paused'
    };
    return statusMap[oldStatus] || 'active';
  }
}
```

### 2.3 批次處理器
```typescript
// scripts/migration/batch-processor.ts
export class BatchProcessor {
  async processBatch<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    options: BatchOptions
  ): Promise<BatchResult> {
    const results: BatchResult = {
      processed: 0,
      failed: 0,
      errors: []
    };
    
    // 分批處理
    const batches = chunk(items, options.batchSize);
    
    for (const batch of batches) {
      const promises = batch.map(async (item) => {
        try {
          await processor(item);
          results.processed++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            item,
            error: error.message
          });
        }
      });
      
      // 控制並發
      await Promise.all(promises);
      
      // 進度回報
      await this.reportProgress(results);
      
      // 速率限制
      await this.rateLimiter.wait();
    }
    
    return results;
  }
}
```

## 3. 資料驗證

### 3.1 驗證策略
```typescript
// scripts/migration/validator.ts
export class DataValidator {
  async validateMigration(
    source: DataSource,
    target: DataSource
  ): Promise<ValidationReport> {
    const report = new ValidationReport();
    
    // 1. 數量驗證
    await this.validateCounts(source, target, report);
    
    // 2. 資料完整性驗證
    await this.validateIntegrity(source, target, report);
    
    // 3. 關聯性驗證
    await this.validateRelationships(target, report);
    
    // 4. 抽樣比對
    await this.validateSamples(source, target, report);
    
    return report;
  }
  
  private async validateCounts(
    source: DataSource,
    target: DataSource,
    report: ValidationReport
  ): Promise<void> {
    const sourceCounts = await source.getCounts();
    const targetCounts = await target.getCounts();
    
    for (const [entity, sourceCount] of Object.entries(sourceCounts)) {
      const targetCount = targetCounts[entity];
      
      if (sourceCount !== targetCount) {
        report.addError({
          type: 'count_mismatch',
          entity,
          expected: sourceCount,
          actual: targetCount
        });
      }
    }
  }
  
  private async validateIntegrity(
    source: DataSource,
    target: DataSource,
    report: ValidationReport
  ): Promise<void> {
    // 檢查必要欄位
    const requiredFields = {
      sessions: ['id', 'userId', 'type', 'status'],
      evaluations: ['id', 'sessionId', 'type', 'result']
    };
    
    for (const [table, fields] of Object.entries(requiredFields)) {
      const records = await target.query(`SELECT * FROM ${table} LIMIT 100`);
      
      for (const record of records) {
        for (const field of fields) {
          if (!record[field]) {
            report.addError({
              type: 'missing_field',
              table,
              field,
              recordId: record.id
            });
          }
        }
      }
    }
  }
}
```

### 3.2 資料一致性檢查
```typescript
export class ConsistencyChecker {
  async checkConsistency(): Promise<ConsistencyReport> {
    const report = new ConsistencyReport();
    
    // 1. Session 與 Evaluation 關聯
    const orphanedEvaluations = await this.db.query(`
      SELECT e.id FROM evaluations e
      LEFT JOIN learning_sessions s ON e.session_id = s.id
      WHERE s.id IS NULL
    `);
    
    if (orphanedEvaluations.length > 0) {
      report.addIssue('orphaned_evaluations', orphanedEvaluations);
    }
    
    // 2. 用戶資料完整性
    const incompleteSessions = await this.db.query(`
      SELECT s.id FROM learning_sessions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE u.id IS NULL
    `);
    
    if (incompleteSessions.length > 0) {
      report.addIssue('missing_users', incompleteSessions);
    }
    
    // 3. 時間序列合理性
    const invalidTimestamps = await this.db.query(`
      SELECT id FROM learning_sessions
      WHERE completed_at < started_at
    `);
    
    if (invalidTimestamps.length > 0) {
      report.addIssue('invalid_timestamps', invalidTimestamps);
    }
    
    return report;
  }
}
```

## 4. 回滾計劃

### 4.1 回滾策略
```typescript
export class MigrationRollback {
  async createCheckpoint(): Promise<string> {
    const checkpointId = `checkpoint_${Date.now()}`;
    
    // 1. 備份當前資料庫狀態
    await this.backupDatabase(checkpointId);
    
    // 2. 記錄遷移狀態
    await this.saveState({
      checkpointId,
      timestamp: new Date(),
      tablesAffected: this.getAffectedTables(),
      recordCounts: await this.getRecordCounts()
    });
    
    return checkpointId;
  }
  
  async rollback(checkpointId: string): Promise<void> {
    console.log(`Starting rollback to ${checkpointId}...`);
    
    try {
      // 1. 停止寫入
      await this.stopWrites();
      
      // 2. 恢復資料庫
      await this.restoreDatabase(checkpointId);
      
      // 3. 驗證恢復
      await this.validateRestore(checkpointId);
      
      // 4. 恢復寫入
      await this.resumeWrites();
      
      console.log('Rollback completed successfully');
    } catch (error) {
      console.error('Rollback failed:', error);
      throw new CriticalError('Rollback failed', error);
    }
  }
}
```

### 4.2 資料備份
```sql
-- 建立備份表
CREATE TABLE migration_backup_20250105 AS 
SELECT * FROM learning_sessions;

CREATE TABLE evaluation_backup_20250105 AS 
SELECT * FROM evaluations;

-- 建立恢復程序
CREATE OR REPLACE PROCEDURE restore_from_backup(backup_date VARCHAR)
LANGUAGE plpgsql
AS $$
BEGIN
  -- 清空現有資料
  TRUNCATE learning_sessions CASCADE;
  TRUNCATE evaluations CASCADE;
  
  -- 恢復資料
  EXECUTE format('INSERT INTO learning_sessions SELECT * FROM migration_backup_%s', backup_date);
  EXECUTE format('INSERT INTO evaluations SELECT * FROM evaluation_backup_%s', backup_date);
  
  -- 重建索引
  REINDEX TABLE learning_sessions;
  REINDEX TABLE evaluations;
END;
$$;
```

## 5. 雙寫模式實作

### 5.1 雙寫適配器
```typescript
export class DualWriteAdapter implements IStorageProvider {
  constructor(
    private primary: IStorageProvider,    // Database
    private secondary: IStorageProvider,  // LocalStorage
    private config: DualWriteConfig
  ) {}
  
  async set<T>(key: string, value: T): Promise<void> {
    // 1. 寫入主要儲存 (Database)
    try {
      await this.primary.set(key, value);
    } catch (error) {
      console.error('Primary write failed:', error);
      throw error;
    }
    
    // 2. 非同步寫入次要儲存 (LocalStorage)
    this.writeToSecondary(key, value).catch(error => {
      console.error('Secondary write failed:', error);
      // 不阻斷主流程
    });
    
    // 3. 記錄寫入統計
    await this.recordWrite(key, 'dual');
  }
  
  async get<T>(key: string): Promise<T | null> {
    if (this.config.readMode === 'primary') {
      return this.primary.get<T>(key);
    }
    
    if (this.config.readMode === 'comparison') {
      const [primaryData, secondaryData] = await Promise.all([
        this.primary.get<T>(key),
        this.secondary.get<T>(key)
      ]);
      
      // 比較並記錄差異
      if (!this.isEqual(primaryData, secondaryData)) {
        await this.recordMismatch(key, primaryData, secondaryData);
      }
      
      return primaryData;
    }
    
    // fallback 模式
    try {
      return await this.primary.get<T>(key);
    } catch (error) {
      console.warn('Primary read failed, falling back:', error);
      return this.secondary.get<T>(key);
    }
  }
}
```

### 5.2 切換控制
```typescript
export class MigrationController {
  async switchToDatabase(): Promise<void> {
    // 1. 健康檢查
    await this.healthCheck();
    
    // 2. 漸進式切換
    const stages = [
      { percentage: 10, duration: '1h' },
      { percentage: 25, duration: '2h' },
      { percentage: 50, duration: '4h' },
      { percentage: 75, duration: '8h' },
      { percentage: 100, duration: 'permanent' }
    ];
    
    for (const stage of stages) {
      await this.setTrafficPercentage(stage.percentage);
      await this.monitor(stage.duration);
      
      const metrics = await this.getMetrics();
      if (metrics.errorRate > 0.01) {
        await this.rollback();
        throw new Error('High error rate detected');
      }
    }
  }
}
```

## 6. 監控與告警

### 6.1 監控指標
```typescript
interface MigrationMetrics {
  // 效能指標
  readLatency: {
    localStorage: number;
    database: number;
    difference: number;
  };
  
  writeLatency: {
    localStorage: number;
    database: number;
    difference: number;
  };
  
  // 資料一致性
  mismatchCount: number;
  mismatchRate: number;
  
  // 系統健康度
  errorCount: number;
  errorRate: number;
  
  // 進度追蹤
  totalRecords: number;
  migratedRecords: number;
  progressPercentage: number;
}
```

### 6.2 告警設置
```yaml
alerts:
  - name: high_error_rate
    condition: "error_rate > 0.01"
    severity: critical
    action: "rollback"
    
  - name: data_mismatch
    condition: "mismatch_rate > 0.05"
    severity: warning
    action: "investigate"
    
  - name: slow_migration
    condition: "progress_rate < 100_records_per_minute"
    severity: info
    action: "scale_up"
```

## 7. 執行時間表

### 7.1 詳細時程
| Phase | 活動 | 時間 | 負責人 |
|-------|------|------|---------|
| 準備 | 環境設置 | Day 1 | DevOps |
| 準備 | 資料分析 | Day 2-3 | Data Team |
| 開發 | 遷移腳本 | Day 4-10 | Dev Team |
| 測試 | 單元測試 | Day 11-12 | Dev Team |
| 測試 | 整合測試 | Day 13-15 | QA Team |
| 執行 | Dry Run | Day 16-17 | All |
| 執行 | 生產遷移 | Day 18-20 | All |
| 驗證 | 資料驗證 | Day 21-22 | Data Team |
| 切換 | 流量切換 | Day 23-30 | DevOps |

### 7.2 檢查清單
- [ ] 資料庫 Schema 建立完成
- [ ] 遷移腳本測試通過
- [ ] 回滾計劃演練完成
- [ ] 監控告警設置完成
- [ ] 團隊培訓完成
- [ ] 溝通計劃發布

## 8. 風險緩解

### 8.1 技術風險
| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|----------|
| 資料遺失 | 極高 | 低 | 多重備份、驗證程序 |
| 效能下降 | 高 | 中 | 效能測試、優化索引 |
| 服務中斷 | 高 | 低 | 藍綠部署、快速回滾 |

### 8.2 營運風險
| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|----------|
| 用戶影響 | 中 | 中 | 分批遷移、公告通知 |
| 團隊壓力 | 中 | 高 | 充分準備、明確分工 |

## 總結

這個遷移計劃提供了從 localStorage/GCS 到 Cloud SQL 的安全、可控的遷移路徑。透過雙寫模式、完整驗證和回滾機制，確保資料安全和服務連續性。