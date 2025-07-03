#!/usr/bin/env node
/**
 * 驗收測試腳本
 * 測試 YAML/JSON 整合系統的所有功能
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const http = require('http');
const execPromise = util.promisify(exec);

// 設定正確的根目錄
const ROOT_DIR = path.join(__dirname, '..');

console.log('🧪 開始驗收測試...\n');

const tests = [];
let passCount = 0;
let failCount = 0;

// 測試結果記錄
function addTest(name, passed, details = '') {
  tests.push({ name, passed, details });
  if (passed) {
    passCount++;
    console.log(`✅ ${name}`);
  } else {
    failCount++;
    console.log(`❌ ${name}`);
  }
  if (details) {
    console.log(`   ${details}`);
  }
  console.log('');
}

async function runAcceptanceTests() {
  console.log('=== 1. 檢查檔案結構 ===\n');
  
  // 1.1 檢查 JSON 目錄是否存在
  const jsonDirs = [
    'public/rubrics_data_json',
    'public/pbl_data_json'
  ];
  
  for (const dir of jsonDirs) {
    const exists = fs.existsSync(path.join(ROOT_DIR, dir));
    addTest(`JSON 目錄存在: ${dir}`, exists);
  }
  
  // 1.2 檢查關鍵 JSON 檔案
  const jsonFiles = [
    'public/rubrics_data_json/ai_lit_domains.json',
    'public/rubrics_data_json/ksa_codes.json',
    'public/pbl_data_json/ai_job_search_scenario.json'
  ];
  
  for (const file of jsonFiles) {
    const filePath = path.join(ROOT_DIR, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024).toFixed(1);
      addTest(`JSON 檔案存在: ${path.basename(file)}`, true, `大小: ${size} KB`);
      
      // 檢查 JSON 格式是否正確
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        JSON.parse(content);
        addTest(`JSON 格式正確: ${path.basename(file)}`, true);
      } catch (e) {
        addTest(`JSON 格式正確: ${path.basename(file)}`, false, e.message);
      }
    } else {
      addTest(`JSON 檔案存在: ${path.basename(file)}`, false);
    }
  }
  
  console.log('\n=== 2. 測試轉換功能 ===\n');
  
  // 2.1 執行轉換命令
  try {
    const { stdout } = await execPromise('node scripts/yaml-json-crud-system.js convert');
    const success = stdout.includes('Conversion complete');
    addTest('YAML 轉 JSON 轉換', success, success ? '轉換成功' : '轉換失敗');
  } catch (error) {
    addTest('YAML 轉 JSON 轉換', false, error.message);
  }
  
  // 2.2 比較內容一致性
  try {
    const yamlPath = path.join(ROOT_DIR, 'public/rubrics_data/ai_lit_domains.yaml');
    const jsonPath = path.join(ROOT_DIR, 'public/rubrics_data_json/ai_lit_domains.json');
    
    const yaml = require('js-yaml');
    const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
    const yamlData = yaml.load(yamlContent);
    
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const jsonData = JSON.parse(jsonContent);
    
    // 比較關鍵欄位
    const yamlDomains = Object.keys(yamlData.domains || {});
    const jsonDomains = Object.keys(jsonData.domains || {});
    
    const domainsMatch = yamlDomains.length === jsonDomains.length;
    addTest('YAML/JSON 內容一致性', domainsMatch, 
      `YAML domains: ${yamlDomains.length}, JSON domains: ${jsonDomains.length}`);
  } catch (error) {
    addTest('YAML/JSON 內容一致性', false, error.message);
  }
  
  console.log('\n=== 3. 測試 API 功能 ===\n');
  
  // 檢查伺服器是否運行
  const http = require('http');
  const serverRunning = await new Promise((resolve) => {
    http.get('http://localhost:3000/api/relations', (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
  
  if (!serverRunning) {
    console.log('⚠️  伺服器未運行，跳過 API 測試');
    console.log('   請執行 npm run dev 啟動伺服器後重新測試\n');
  } else {
    // 3.1 測試讀取 API
    const readTest = await testAPI('GET', '/api/admin/data?type=rubrics&filename=ai_lit_domains');
    addTest('API 讀取功能', readTest.success, readTest.message);
    
    // 3.2 測試更新 API
    const updateTest = await testAPI('PUT', '/api/admin/data', {
      type: 'rubrics',
      filename: 'ai_lit_domains',
      updates: { test_field: 'test_value' },
      syncToYaml: false
    });
    addTest('API 更新功能', updateTest.success, updateTest.message);
    
    // 3.3 測試創建 API
    const createTest = await testAPI('POST', '/api/admin/data', {
      type: 'rubrics',
      filename: 'ai_lit_domains',
      path: 'test_entry',
      data: { test: true },
      syncToYaml: false
    });
    addTest('API 創建功能', createTest.success, createTest.message);
    
    // 3.4 測試刪除 API
    const deleteTest = await testAPI('DELETE', '/api/admin/data', {
      type: 'rubrics',
      filename: 'ai_lit_domains',
      path: 'test_entry',
      syncToYaml: false
    });
    addTest('API 刪除功能', deleteTest.success, deleteTest.message);
  }
  
  console.log('\n=== 4. 測試同步功能 ===\n');
  
  // 4.1 測試同步功能
  try {
    // 使用現有檔案測試同步
    const { stdout } = await execPromise('node scripts/yaml-json-crud-system.js update rubrics ai_lit_domains \'{"test_sync_field":"test value"}\' && node scripts/yaml-json-crud-system.js sync rubrics ai_lit_domains');
    
    // 檢查 YAML 是否包含新欄位
    const yamlContent = fs.readFileSync(path.join(ROOT_DIR, 'public/rubrics_data/ai_lit_domains.yaml'), 'utf-8');
    const syncSuccess = yamlContent.includes('test_sync_field');
    
    addTest('JSON 到 YAML 同步', syncSuccess, syncSuccess ? '同步成功' : '同步失敗');
    
    // 清理測試欄位
    if (syncSuccess) {
      await execPromise('node scripts/yaml-json-crud-system.js delete rubrics ai_lit_domains "test_sync_field"');
    }
  } catch (error) {
    addTest('JSON 到 YAML 同步', false, error.message);
  }
  
  console.log('\n=== 5. 測試網站功能 ===\n');
  
  if (serverRunning) {
    // 5.1 測試 Relations API
    const relationsTest = await testAPI('GET', '/api/relations?lang=en');
    const hasData = relationsTest.data && relationsTest.data.domains && relationsTest.data.domains.length > 0;
    addTest('Relations API 正常運作', hasData, 
      hasData ? `載入 ${relationsTest.data.domains.length} 個 domains` : '無法載入資料');
    
    // 5.2 測試多語言
    const zhTest = await testAPI('GET', '/api/relations?lang=zhTW');
    const hasZhData = zhTest.data && zhTest.data.domains && zhTest.data.domains[0]?.overview;
    addTest('多語言功能正常', hasZhData, hasZhData ? '中文資料載入成功' : '無法載入中文資料');
  }
  
  // 生成測試報告
  console.log('\n' + '='.repeat(50));
  console.log('📊 測試報告');
  console.log('='.repeat(50) + '\n');
  
  console.log(`總測試數: ${tests.length}`);
  console.log(`✅ 通過: ${passCount}`);
  console.log(`❌ 失敗: ${failCount}`);
  console.log(`成功率: ${((passCount / tests.length) * 100).toFixed(1)}%\n`);
  
  if (failCount > 0) {
    console.log('失敗的測試:');
    tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}`);
      if (t.details) console.log(`    ${t.details}`);
    });
  }
  
  // 生成詳細報告
  const reportPath = path.join(ROOT_DIR, 'acceptance-test-report.txt');
  const report = generateDetailedReport();
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 詳細報告已保存至: acceptance-test-report.txt`);
}

// 測試 API 輔助函數
async function testAPI(method, path, body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            success: res.statusCode < 400,
            message: res.statusCode < 400 ? 'API 回應正常' : `HTTP ${res.statusCode}`,
            data: json
          });
        } catch (e) {
          resolve({
            success: false,
            message: `解析錯誤: ${e.message}`,
            data: null
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        message: `請求錯誤: ${error.message}`,
        data: null
      });
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// 生成詳細報告
function generateDetailedReport() {
  const timestamp = new Date().toISOString();
  let report = `YAML/JSON 整合系統驗收測試報告\n`;
  report += `測試時間: ${timestamp}\n`;
  report += `${'='.repeat(50)}\n\n`;
  
  report += `測試摘要\n`;
  report += `${'='.repeat(50)}\n`;
  report += `總測試數: ${tests.length}\n`;
  report += `通過: ${passCount}\n`;
  report += `失敗: ${failCount}\n`;
  report += `成功率: ${((passCount / tests.length) * 100).toFixed(1)}%\n\n`;
  
  report += `詳細結果\n`;
  report += `${'='.repeat(50)}\n`;
  
  tests.forEach((test, index) => {
    report += `\n${index + 1}. ${test.name}\n`;
    report += `   狀態: ${test.passed ? '✅ 通過' : '❌ 失敗'}\n`;
    if (test.details) {
      report += `   詳情: ${test.details}\n`;
    }
  });
  
  report += `\n${'-'.repeat(50)}\n`;
  report += `測試完成\n`;
  
  return report;
}

// 執行測試
runAcceptanceTests().catch(console.error);