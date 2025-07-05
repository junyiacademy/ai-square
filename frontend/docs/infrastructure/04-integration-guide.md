# Four-Phase Architecture Integration Guide

## 📋 架構概覽

本文檔說明如何在新的四層統一架構中整合各個模組。

### 架構層級
```
Track (軌跡追蹤) - 整體學習軌跡與成果總結
├── Program (學習計劃) - 具體學習活動與完成狀態
│   └── Task (任務單元) - 細分任務與評估結果
└── Log (詳細記錄) - 互動過程與統計分析
```

## 🚀 使用指南

### 1. 服務初始化

```typescript
import { UserCentricGCSStorageProvider } from '@/lib/core/storage/providers/user-centric-gcs.provider';
import { GCSTrackRepository } from '@/lib/core/track/repositories/gcs-track.repository';
import { TrackService } from '@/lib/core/track/services/track.service';
import { ProgramService } from '@/lib/core/program/services/program.service';
import { TaskService } from '@/lib/core/task/services/task.service';
import { LogService } from '@/lib/core/log/services/log.service';

// 初始化儲存提供者
const storageProvider = new UserCentricGCSProvider({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  bucketName: process.env.GCS_BUCKET_NAME_V2 // 使用 V2 避免與 production 衝突
});

// 初始化各層服務
const trackRepository = new GCSTrackRepository(storageProvider);
const trackService = new TrackService(trackRepository);
const programService = new ProgramService(/* ... */);
const taskService = new TaskService(/* ... */);
const logService = new LogService(/* ... */);
```

### 2. 典型學習流程

#### A. 開始新的學習軌跡

```typescript
// 1. 創建 Track
const track = await trackService.createTrack({
  userId: 'user-123',
  projectId: 'pbl-scenario-1',
  type: TrackType.PBL,
  metadata: {
    title: 'AI Ethics Scenario',
    description: 'Exploring ethical implications of AI',
    language: 'zh-TW'
  },
  context: {
    type: 'pbl',
    scenarioId: 'ai-ethics-001',
    programId: '', // 稍後設定
    completedTaskIds: [],
    taskProgress: {}
  }
});

// 2. 創建 Program
const program = await programService.createProgram({
  trackId: track.id,
  userId: 'user-123',
  type: ProgramType.PBL,
  title: 'AI Ethics Learning Program',
  config: {
    scenarioId: 'ai-ethics-001',
    scenarioTitle: 'AI Ethics Scenario',
    totalTasks: 4,
    tasksOrder: ['task-1', 'task-2', 'task-3', 'task-4']
  }
});

// 3. 創建 Tasks
const tasks = await taskService.createTasks([
  {
    programId: program.id,
    userId: 'user-123',
    type: TaskType.ANALYSIS,
    title: 'Analyze the Scenario',
    order: 1,
    config: { maxAttempts: 3, showHints: true }
  },
  {
    programId: program.id,
    userId: 'user-123',
    type: TaskType.DESIGN,
    title: 'Design Solution',
    order: 2,
    config: { maxAttempts: 2, showHints: false }
  }
  // ... 更多任務
]);
```

#### B. 執行學習過程

```typescript
// 1. 開始 Program
await programService.startProgram('user-123', program.id);

// 2. 開始第一個 Task
const firstTask = tasks[0];
await taskService.startTask('user-123', program.id, firstTask.id);

// 3. 記錄用戶互動
await logService.logInteraction(
  'user-123',
  program.id,
  firstTask.id,
  'click',
  'submit-button',
  { answer: 'User response...' }
);

// 4. AI 互動過程
const aiRequestLog = await logService.logAIRequest(
  'user-123',
  program.id,
  firstTask.id,
  'gemini-2.5-flash',
  'Evaluate user response...'
);

const aiResponseLog = await logService.logAIResponse(
  'user-123',
  program.id,
  firstTask.id,
  'gemini-2.5-flash',
  'AI feedback response...',
  150, // prompt tokens
  300, // completion tokens
  1200, // latency ms
  0.002 // cost USD
);

// 5. 提交答案
await logService.logSubmission(
  'user-123',
  program.id,
  firstTask.id,
  'pbl-response',
  { content: 'Final answer...', confidence: 8 },
  1
);

// 6. 完成任務
await taskService.completeTask(
  'user-123',
  program.id,
  firstTask.id,
  85 // 分數
);
```

#### C. 完成學習並生成成果

```typescript
// 1. 完成 Program
await programService.completeProgram('user-123', program.id);

// 2. 更新 Track 總結
await trackService.updateTrack(track.id, {
  status: TrackStatus.COMPLETED,
  summary: {
    totalTimeSpent: 3600, // 1 hour
    totalPrograms: 1,
    completedPrograms: 1,
    averagePerformance: 85,
    achievements: ['Critical Thinking', 'Ethical Analysis'],
    insights: ['Understanding of AI bias implications'],
    skillsLearned: ['Ethical reasoning', 'Problem analysis'],
    areasImproved: ['Decision making'],
    recommendations: ['Continue with advanced scenarios'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
});
```

### 3. 查詢與分析

#### A. 獲取學習進度

```typescript
// 查詢用戶的所有 Tracks
const userTracks = await trackService.queryTracks({
  userId: 'user-123',
  status: TrackStatus.COMPLETED
});

// 獲取 Program 進度
const programProgress = await taskService.getProgramProgress(
  'user-123',
  program.id
);

// 獲取 Track 統計
const trackStats = await trackService.getStatistics('user-123');
```

#### B. AI 使用分析

```typescript
// 獲取 AI 使用統計
const aiStats = await logService.getAIUsageStats(
  'user-123',
  program.id,
  undefined, // 所有任務
  startDate,
  endDate
);

console.log({
  totalRequests: aiStats.totalRequests,
  totalTokens: aiStats.totalTokens,
  totalCost: aiStats.totalCost,
  averageLatency: aiStats.averageLatency,
  modelUsage: aiStats.modelUsage
});
```

#### C. 錯誤監控

```typescript
// 獲取錯誤日誌
const errorLogs = await logService.getErrorLogs(
  'user-123',
  program.id,
  undefined, // 所有任務
  20 // 最近 20 條
);

// 記錄錯誤
await logService.logError(
  'user-123',
  program.id,
  task.id,
  new Error('API timeout'),
  { context: 'ai-evaluation' }
);
```

## 🔧 遷移指南

### 從舊 PBL 服務遷移

```typescript
// 舊代碼
const pblService = new PBLService();
const result = await pblService.evaluateTask(userId, taskId, response);

// 新代碼
// 1. 先記錄提交
await logService.logSubmission(
  userId,
  programId,
  taskId,
  'pbl-response',
  response
);

// 2. AI 評估
const aiRequest = await logService.logAIRequest(
  userId,
  programId,
  taskId,
  'gemini-2.5-flash',
  evaluationPrompt
);

// 3. 更新任務進度
const updatedTask = await taskService.updateTask(
  userId,
  programId,
  taskId,
  {
    progress: {
      finalAnswer: response,
      evaluation: {
        grade: 'A',
        feedback: aiResponse,
        evaluatedAt: new Date(),
        evaluatedBy: 'AI'
      }
    }
  }
);
```

## 📊 效能考量

### 1. 索引策略

```typescript
// 用戶中心化索引
index:user:{userId}:tracks
index:user:{userId}:programs  
index:user:{userId}:tasks
index:user:{userId}:logs

// Program 相關索引
index:program:{userId}:{programId}:tasks
index:program:{userId}:{programId}:logs

// Task 相關索引
index:task:{userId}:{programId}:{taskId}:logs
```

### 2. 快取策略

```typescript
// Track 快取（長期）
cache:track:{trackId} (TTL: 1 hour)

// Program 快取（中期）
cache:program:{programId} (TTL: 30 minutes)

// Task 快取（短期）
cache:task:{taskId} (TTL: 10 minutes)

// Log 查詢快取（短期）
cache:logs:{userId}:{programId}:{taskId} (TTL: 5 minutes)
```

### 3. 批量操作

```typescript
// 批量創建 Tasks
const tasks = await taskService.createTasks(taskParamsList);

// 批量記錄 Logs
const logs = await logService.createLogs(logParamsList);

// 批量查詢
const [tracks, programs, tasks] = await Promise.all([
  trackService.queryTracks(options),
  programService.queryPrograms(options),
  taskService.queryTasks(options)
]);
```

## 🔍 除錯與監控

### 1. 日誌等級

```typescript
// 系統事件
LogSeverity.INFO    - 正常操作
LogSeverity.WARNING - 異常但可處理
LogSeverity.ERROR   - 錯誤需要關注
LogSeverity.CRITICAL - 嚴重錯誤需要立即處理

// 使用範例
await logService.logSystemEvent(
  userId,
  programId,
  taskId,
  'task-completion-timeout',
  { timeSpent: 3600, maxTime: 1800 },
  LogSeverity.WARNING
);
```

### 2. 監控指標

```typescript
// 關鍵指標追蹤
const metrics = {
  // 用戶活動
  activeUsers: await trackService.getActiveUsersCount(),
  completionRate: await programService.getCompletionRate(),
  
  // AI 使用
  aiRequestsPerDay: await logService.getAIRequestsCount('day'),
  averageResponseTime: await logService.getAverageResponseTime(),
  
  // 錯誤率
  errorRate: await logService.getErrorRate('hour'),
  criticalErrors: await logService.getCriticalErrorsCount('day')
};
```

## 🎯 最佳實踐

### 1. 錯誤處理

```typescript
try {
  const result = await taskService.completeTask(userId, programId, taskId, score);
  
  // 記錄成功
  await logService.logSystemEvent(
    userId,
    programId,
    taskId,
    'task-completed',
    { score },
    LogSeverity.INFO
  );
  
} catch (error) {
  // 記錄錯誤
  await logService.logError(userId, programId, taskId, error, {
    operation: 'task-completion',
    params: { score }
  });
  
  throw error; // 重新拋出給上層處理
}
```

### 2. 資料一致性

```typescript
// 使用 Unit of Work 模式確保一致性
const unitOfWork = new UnitOfWork(storageProvider);

try {
  await unitOfWork.begin();
  
  // 多個操作
  await unitOfWork.tracks.create(trackData);
  await unitOfWork.programs.create(programData);
  await unitOfWork.tasks.createBatch(tasksData);
  
  await unitOfWork.commit();
} catch (error) {
  await unitOfWork.rollback();
  throw error;
}
```

### 3. 效能優化

```typescript
// 預載入相關資料
const trackWithDetails = await trackService.getTrackWithPrograms(trackId);

// 分頁查詢大量資料
const logs = await logService.queryLogs({
  userId,
  limit: 100,
  offset: page * 100,
  orderBy: 'timestamp:desc'
});

// 使用快取減少重複查詢
const cachedTask = await cacheService.getOrSet(
  `task:${taskId}`,
  () => taskService.getTask(userId, programId, taskId),
  600 // 10 minutes
);
```

---

這個整合指南提供了從初始化到完整使用新架構的詳細步驟。接下來我們可以進行實際的整合測試。