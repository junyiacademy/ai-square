/**
 * 手動測試 PBL-Track 整合
 * 執行: node test-pbl-track-integration.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 測試配置
const TEST_USER = 'test@example.com';
const SCENARIO_ID = 'ai-ethics';
const API_BASE = 'http://localhost:3000/api';

// 顏色輸出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[Step ${step}] ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'yellow');
}

// 檢查檔案是否存在
function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    logSuccess(`${description} 存在: ${filePath}`);
    return true;
  } else {
    logError(`${description} 不存在: ${filePath}`);
    return false;
  }
}

// 檢查程式碼中是否包含特定內容
function checkCodeIncludes(filePath, searchString, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchString)) {
      logSuccess(`${description}: 找到 "${searchString}"`);
      return true;
    } else {
      logError(`${description}: 未找到 "${searchString}"`);
      return false;
    }
  } catch (error) {
    logError(`無法讀取檔案 ${filePath}: ${error.message}`);
    return false;
  }
}

// 主測試流程
async function runTests() {
  log('\n🧪 PBL-Track 整合測試\n', 'yellow');
  
  let totalTests = 0;
  let passedTests = 0;

  // Step 1: 檢查核心檔案
  logStep(1, '檢查 Track 系統核心檔案');
  
  const coreFiles = [
    ['src/lib/core/track/types/track.types.ts', 'Track 類型定義'],
    ['src/lib/core/track/services/track.service.ts', 'Track 服務'],
    ['src/lib/core/track/repositories/track.repository.ts', 'Track 儲存庫'],
    ['src/lib/core/track/adapters/pbl-track-adapter.ts', 'PBL 適配器'],
  ];

  for (const [file, desc] of coreFiles) {
    totalTests++;
    if (checkFile(path.join(__dirname, file), desc)) {
      passedTests++;
    }
  }

  // Step 2: 檢查 PBL API 整合
  logStep(2, '檢查 PBL API 路由整合');
  
  const apiIntegrations = [
    {
      file: 'src/app/api/pbl/scenarios/[id]/start/route.ts',
      search: 'PBLTrackAdapter',
      desc: 'Start API 整合 Track',
    },
    {
      file: 'src/app/api/pbl/scenarios/[id]/start/route.ts',
      search: 'createPBLTrack',
      desc: 'Start API 呼叫 createPBLTrack',
    },
    {
      file: 'src/app/api/pbl/task-logs/route.ts',
      search: 'trackService.queryTracks',
      desc: 'Task logs API 查詢 Track',
    },
    {
      file: 'src/app/api/pbl/task-logs/route.ts',
      search: 'submitTaskAnswer',
      desc: 'Task logs API 更新 Track',
    },
    {
      file: 'src/lib/storage/pbl-program-service.ts',
      search: 'completePBLProgram',
      desc: 'Program service 完成 Track',
    },
  ];

  for (const { file, search, desc } of apiIntegrations) {
    totalTests++;
    if (checkCodeIncludes(path.join(__dirname, file), search, desc)) {
      passedTests++;
    }
  }

  // Step 3: 檢查類型定義
  logStep(3, '檢查類型定義更新');
  
  totalTests++;
  if (checkCodeIncludes(
    path.join(__dirname, 'src/types/pbl.ts'),
    'trackId?:',
    'CreateProgramResponse 包含 trackId'
  )) {
    passedTests++;
  }

  // Step 4: 檢查 Hook 實作
  logStep(4, '檢查 React Hooks');
  
  const hookFiles = [
    ['src/lib/core/track/hooks/useTrack.ts', 'useTrack Hook'],
    ['src/lib/core/track/hooks/useTrackList.ts', 'useTrackList Hook'],
    ['src/lib/core/track/hooks/useEvaluation.ts', 'useEvaluation Hook'],
  ];

  for (const [file, desc] of hookFiles) {
    totalTests++;
    if (checkFile(path.join(__dirname, file), desc)) {
      passedTests++;
    }
  }

  // Step 5: 檢查範例元件
  logStep(5, '檢查範例元件');
  
  const exampleFiles = [
    ['src/components/examples/TrackDashboard.tsx', 'Track Dashboard 範例'],
    ['src/components/examples/PBLTrackView.tsx', 'PBL Track View 範例'],
    ['src/components/examples/PBLWithTrack.tsx', 'PBL with Track 整合範例'],
  ];

  for (const [file, desc] of exampleFiles) {
    totalTests++;
    if (checkFile(path.join(__dirname, file), desc)) {
      passedTests++;
    }
  }

  // Step 6: 檢查測試檔案
  logStep(6, '檢查測試檔案');
  
  const testFiles = [
    ['src/lib/core/track/__tests__/track.service.test.ts', 'Track Service 測試'],
    ['src/lib/core/track/__tests__/track.repository.test.ts', 'Track Repository 測試'],
    ['src/lib/core/track/__tests__/pbl-track-integration.test.ts', 'PBL-Track 整合測試'],
  ];

  for (const [file, desc] of testFiles) {
    totalTests++;
    if (checkFile(path.join(__dirname, file), desc)) {
      passedTests++;
    }
  }

  // Step 7: 驗證關鍵整合點
  logStep(7, '驗證關鍵整合點');
  
  // 檢查 Track 建立邏輯
  totalTests++;
  const startRouteContent = fs.readFileSync(
    path.join(__dirname, 'src/app/api/pbl/scenarios/[id]/start/route.ts'),
    'utf8'
  );
  
  if (
    startRouteContent.includes('const pblAdapter = new PBLTrackAdapter()') &&
    startRouteContent.includes('await pblAdapter.createPBLTrack') &&
    startRouteContent.includes('trackId = track.id')
  ) {
    logSuccess('Start route 正確整合 Track 建立邏輯');
    passedTests++;
  } else {
    logError('Start route Track 建立邏輯不完整');
  }

  // 檢查 Task 評估整合
  totalTests++;
  const taskLogsContent = fs.readFileSync(
    path.join(__dirname, 'src/app/api/pbl/task-logs/route.ts'),
    'utf8'
  );
  
  if (
    taskLogsContent.includes('await pblAdapter.submitTaskAnswer') &&
    taskLogsContent.includes('Track ${track.id} updated')
  ) {
    logSuccess('Task logs route 正確整合評估更新');
    passedTests++;
  } else {
    logError('Task logs route 評估整合不完整');
  }

  // Step 8: 總結
  log('\n📊 測試總結\n', 'yellow');
  log(`總測試數: ${totalTests}`);
  log(`通過測試: ${passedTests}`, passedTests === totalTests ? 'green' : 'yellow');
  log(`失敗測試: ${totalTests - passedTests}`, totalTests - passedTests > 0 ? 'red' : 'green');
  
  const percentage = ((passedTests / totalTests) * 100).toFixed(1);
  log(`\n整合完成度: ${percentage}%`, passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    log('\n🎉 PBL-Track 整合測試全部通過！', 'green');
  } else {
    log('\n⚠️  還有一些整合點需要完成', 'yellow');
  }

  // 提供下一步建議
  log('\n📝 下一步建議：', 'blue');
  if (passedTests < totalTests) {
    log('1. 修復失敗的整合點');
    log('2. 確保所有檔案都已正確更新');
  }
  log('3. 在開發環境執行實際測試');
  log('4. 監控 Track 建立和更新是否正常');
  log('5. 檢查 localStorage 或 GCS 中的 Track 資料');
}

// 執行測試
runTests().catch(console.error);