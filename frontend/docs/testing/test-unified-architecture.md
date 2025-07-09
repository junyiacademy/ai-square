# 測試統一學習架構指南

## 1. 單元測試（已完成）

執行現有的單元測試：
```bash
# 測試 GCS V2 repositories
npm run test -- src/lib/implementations/gcs-v2/__tests__/gcs-repository.test.ts

# 觀看模式（開發時使用）
npm run test -- src/lib/implementations/gcs-v2/__tests__/gcs-repository.test.ts --watch
```

## 2. 手動測試 - 創建測試腳本

創建一個測試腳本來驗證新架構：

```typescript
// src/scripts/test-gcs-v2.ts
import {
  getScenarioRepository,
  getProgramRepository,
  getTaskRepository,
  getEvaluationRepository,
} from '@/lib/implementations/gcs-v2';

async function testNewArchitecture() {
  console.log('🧪 Testing Unified Learning Architecture...\n');

  try {
    // 1. 測試 Scenario 創建
    console.log('1️⃣ Creating Scenario...');
    const scenarioRepo = getScenarioRepository();
    const scenario = await scenarioRepo.create({
      sourceType: 'pbl',
      sourceRef: {
        type: 'yaml',
        path: 'test-scenario.yaml',
        metadata: {},
      },
      title: 'Test Scenario',
      description: 'Testing the new architecture',
      objectives: ['Test objective 1'],
      taskTemplates: [{
        id: 'test-task-1',
        title: 'Test Task',
        type: 'chat',
      }],
    });
    console.log('✅ Scenario created:', scenario.id);

    // 2. 測試 Program 創建
    console.log('\n2️⃣ Creating Program...');
    const programRepo = getProgramRepository();
    const program = await programRepo.create({
      scenarioId: scenario.id,
      userId: 'test@example.com',
      metadata: { test: true },
    });
    console.log('✅ Program created:', program.id);

    // 3. 測試 Task 創建
    console.log('\n3️⃣ Creating Task...');
    const taskRepo = getTaskRepository();
    const task = await taskRepo.create({
      programId: program.id,
      scenarioTaskIndex: 0,
      title: 'Test Task',
      type: 'chat',
      content: { test: true },
    });
    console.log('✅ Task created:', task.id);

    // 4. 測試查詢功能
    console.log('\n4️⃣ Testing Queries...');
    const foundScenario = await scenarioRepo.findById(scenario.id);
    console.log('✅ Found scenario:', foundScenario?.title);

    const userPrograms = await programRepo.findByUser('test@example.com');
    console.log('✅ User programs count:', userPrograms.length);

    const programTasks = await taskRepo.findByProgram(program.id);
    console.log('✅ Program tasks count:', programTasks.length);

    console.log('\n✨ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// 執行測試
testNewArchitecture();
```

執行方式：
```bash
# 使用 tsx 執行 TypeScript
npx tsx src/scripts/test-gcs-v2.ts

# 或編譯後執行
npx tsc src/scripts/test-gcs-v2.ts --outDir dist
node dist/scripts/test-gcs-v2.js
```

## 3. API 端點測試

創建 API 端點來測試新架構：

```typescript
// src/app/api/test/unified-architecture/route.ts
import { NextResponse } from 'next/server';
import {
  getScenarioRepository,
  getProgramRepository,
  getTaskRepository,
  getEvaluationRepository,
} from '@/lib/implementations/gcs-v2';

export async function GET() {
  try {
    const results = {
      scenarios: [],
      programs: [],
      tasks: [],
      evaluations: [],
    };

    // 列出所有 scenarios
    const scenarioRepo = getScenarioRepository();
    const scenarios = await scenarioRepo.listAll();
    results.scenarios = scenarios;

    // 如果有 scenarios，取得相關的 programs
    if (scenarios.length > 0) {
      const programRepo = getProgramRepository();
      const programs = await programRepo.findByScenario(scenarios[0].id);
      results.programs = programs;
    }

    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    // 創建測試數據
    const scenarioRepo = getScenarioRepository();
    const scenario = await scenarioRepo.create({
      sourceType: 'pbl',
      sourceRef: {
        type: 'yaml',
        path: 'api-test.yaml',
        metadata: {},
      },
      title: 'API Test Scenario',
      description: 'Created via API',
      objectives: ['Test API'],
      taskTemplates: [],
    });

    return NextResponse.json({
      success: true,
      scenarioId: scenario.id,
      message: 'Test scenario created successfully',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

測試方式：
```bash
# GET - 列出所有數據
curl http://localhost:3000/api/test/unified-architecture

# POST - 創建測試數據
curl -X POST http://localhost:3000/api/test/unified-architecture
```

## 4. 整合到現有 PBL 流程

修改現有的 PBL API 來使用新架構：

```typescript
// 範例：更新 PBL chat API
import { getProgramRepository, getTaskRepository } from '@/lib/implementations/gcs-v2';

// 在 chat API 中記錄互動
const taskRepo = getTaskRepository();
await taskRepo.addInteraction(taskId, {
  timestamp: new Date().toISOString(),
  type: 'user_input',
  content: { message: userMessage },
});
```

## 5. 環境變數配置

確保環境變數正確設置：

```bash
# .env.local
GOOGLE_CLOUD_PROJECT=your-project-id
GCS_BUCKET_NAME=ai-square-db-v2
NEXT_PUBLIC_GCS_BUCKET=ai-square-db-v2

# 如果在本地測試，需要服務帳號金鑰
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
```

## 6. 監控和除錯

添加日誌來監控操作：

```typescript
// 在 repository 操作前後添加日誌
console.log(`[GCS] Creating scenario in bucket: ${GCS_CONFIG.bucketName}`);
const scenario = await scenarioRepo.create(data);
console.log(`[GCS] Scenario created with ID: ${scenario.id}`);
```

## 7. 性能測試

測試大量數據的處理：

```typescript
// 批量創建測試
async function performanceTest() {
  const start = Date.now();
  const scenarioRepo = getScenarioRepository();
  
  // 創建 100 個 scenarios
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(scenarioRepo.create({
      sourceType: 'pbl',
      sourceRef: { type: 'yaml', path: `test-${i}.yaml`, metadata: {} },
      title: `Performance Test ${i}`,
      description: 'Performance testing',
      objectives: [],
      taskTemplates: [],
    }));
  }
  
  await Promise.all(promises);
  const duration = Date.now() - start;
  console.log(`Created 100 scenarios in ${duration}ms`);
}
```

## 8. 驗證數據完整性

檢查數據是否正確儲存在 GCS：

```bash
# 使用 gsutil 查看 bucket 內容
gsutil ls -r gs://ai-square-db-v2/v2/

# 查看特定檔案
gsutil cat gs://ai-square-db-v2/v2/scenarios/[scenario-id].json
```

## 注意事項

1. **開發環境**：如果沒有 GCS 權限，系統會自動切換到本地檔案儲存
2. **生產環境**：確保 Cloud Run 服務有正確的 IAM 權限存取 GCS bucket
3. **數據遷移**：舊數據仍在原本的路徑，新數據會儲存在 `/v2/` 路徑下
4. **錯誤處理**：所有 repository 方法都有錯誤處理，會返回有意義的錯誤訊息

## 下一步

1. 將新架構整合到現有的 PBL 和 Discovery 功能
2. 創建數據遷移腳本（如果需要）
3. 更新前端組件使用新的 repository pattern
4. 添加更多的查詢方法（如分頁、排序、過濾）