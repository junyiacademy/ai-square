#!/usr/bin/env node

/**
 * 安全的 TypeScript 錯誤修復腳本
 * 嚴格按照 CLAUDE.md 中的規則執行修復
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SafeTypeScriptFixer {
  constructor() {
    this.logFile = 'typescript-fix-log.txt';
    this.backupDir = '.typescript-fix-backups';
    this.maxErrorsPerFile = 10; // 單一檔案錯誤上限
    this.fixedCount = 0;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: ${message}\n`;
    console.log(message);
    fs.appendFileSync(this.logFile, logEntry);
  }

  execSafe(command) {
    try {
      return execSync(command, { encoding: 'utf8' });
    } catch (error) {
      throw new Error(`Command failed: ${command}\nError: ${error.message}`);
    }
  }

  // Phase 1: 錯誤分析
  analyzeErrors() {
    this.log('=== Phase 1: 錯誤分析 ===');
    
    // 總錯誤數量
    const totalErrors = this.execSafe('npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"').trim();
    this.log(`總錯誤數量: ${totalErrors}`);

    if (totalErrors === '0') {
      this.log('✅ 沒有 TypeScript 錯誤！');
      return false;
    }

    // 錯誤類型分布
    this.log('\n錯誤類型分布:');
    const errorTypes = this.execSafe('npx tsc --noEmit 2>&1 | grep -E "error TS[0-9]+" | sed \'s/.*error \\(TS[0-9]*\\).*/\\1/\' | sort | uniq -c | sort -nr');
    this.log(errorTypes);

    // 按檔案分組
    this.log('\n檔案錯誤分布 (前20個):');
    const fileErrors = this.execSafe('npx tsc --noEmit 2>&1 | grep "error TS" | cut -d\'(\' -f1 | sort | uniq -c | sort -nr | head -20');
    this.log(fileErrors);

    // 識別高風險檔案
    this.log('\n高風險檔案 (錯誤 > 10):');
    const highRiskFiles = this.execSafe(`npx tsc --noEmit 2>&1 | grep "error TS" | cut -d'(' -f1 | sort | uniq -c | awk '$1 > ${this.maxErrorsPerFile} {print $0}' || echo "無"`);
    this.log(highRiskFiles);

    return true;
  }

  // Phase 2: 創建安全檢查點
  createSafetyCheckpoint() {
    this.log('\n=== Phase 2: 創建安全檢查點 ===');

    // 創建備份目錄
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir);
    }

    // Git 狀態檢查
    this.execSafe('git status > typescript-fix-before.log');
    this.log('✅ Git 狀態已記錄');

    // 創建 stash
    try {
      this.execSafe(`git stash push -m "Before TypeScript fix - $(date)"`);
      this.log('✅ Git stash 已創建');
    } catch (error) {
      this.log('⚠️  無變更需要 stash');
    }

    // 記錄錯誤詳情 (允許非零退出碼)
    try {
      this.execSafe('npx tsc --noEmit > typescript-errors-before.log 2>&1');
    } catch (error) {
      // TypeScript 錯誤是預期的，這不算失敗
      fs.writeFileSync('typescript-errors-before.log', error.message);
    }
    this.log('✅ 錯誤詳情已記錄');

    // 基線測試
    this.log('\n執行基線測試...');
    try {
      this.execSafe('npm run test:ci');
      this.log('✅ 測試通過');
    } catch (error) {
      throw new Error('❌ 基線測試失敗，無法安全進行修復');
    }

    try {
      this.execSafe('npm run build');
      this.log('✅ 建置成功');
    } catch (error) {
      throw new Error('❌ 建置失敗，無法安全進行修復');
    }
  }

  // Phase 3: 取得最安全的修復目標
  getSafeFixTargets() {
    this.log('\n=== Phase 3: 選擇修復目標 ===');

    // 取得按錯誤數量排序的檔案列表（最少的優先）
    const fileErrorsRaw = this.execSafe('npx tsc --noEmit 2>&1 | grep "error TS" | cut -d\'(\' -f1 | sort | uniq -c | sort -n');
    
    const files = fileErrorsRaw.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.trim().split(/\s+/);
        const count = parseInt(parts[0]);
        const file = parts.slice(1).join(' ');
        return { file, count };
      })
      .filter(item => item.count <= this.maxErrorsPerFile); // 只處理低風險檔案

    this.log(`找到 ${files.length} 個可安全修復的檔案`);
    return files;
  }

  // Phase 4: 安全修復單一檔案
  safeFixFile(targetFile, errorCount) {
    this.log(`\n修復檔案: ${targetFile} (${errorCount} 個錯誤)`);

    // 備份檔案
    const backupPath = path.join(this.backupDir, path.basename(targetFile) + '.backup');
    fs.copyFileSync(targetFile, backupPath);
    this.log(`✅ 已備份到: ${backupPath}`);

    // 檢查檔案的具體錯誤
    const fileErrors = this.execSafe(`npx tsc --noEmit ${targetFile} 2>&1 || echo ""`);
    this.log(`檔案錯誤詳情:\n${fileErrors}`);

    // 這裡會提示用戶手動修復，因為自動修復太危險
    this.log(`⚠️  請手動修復 ${targetFile} 中的錯誤`);
    this.log(`修復完成後，執行以下命令驗證:`);
    this.log(`  npx tsc --noEmit ${targetFile}`);
    this.log(`  npm run test -- --testPathPattern="${targetFile.replace('.ts', '.test')}"`);
    
    return false; // 返回 false 表示需要手動修復
  }

  // Phase 5: 驗證修復結果
  validateFix(targetFile) {
    this.log(`\n驗證修復: ${targetFile}`);

    try {
      // 1. 類型檢查
      this.execSafe(`npx tsc --noEmit ${targetFile}`);
      this.log('✅ 類型檢查通過');

      // 2. 相關測試
      const testFile = targetFile.replace('.ts', '.test.ts').replace('.tsx', '.test.tsx');
      if (fs.existsSync(testFile)) {
        this.execSafe(`npm run test -- --testPathPattern="${testFile}"`);
        this.log('✅ 相關測試通過');
      }

      // 3. 全域檢查
      this.execSafe('npx tsc --noEmit');
      this.log('✅ 全域類型檢查通過');

      this.fixedCount++;
      this.log(`✅ 檔案修復成功，已修復總數: ${this.fixedCount}`);
      return true;

    } catch (error) {
      // 自動回退
      this.log(`❌ 驗證失敗: ${error.message}`);
      const backupPath = path.join(this.backupDir, path.basename(targetFile) + '.backup');
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, targetFile);
        this.log(`🔄 已回退檔案: ${targetFile}`);
      }
      return false;
    }
  }

  // 緊急回退流程
  emergencyRollback() {
    this.log('\n=== 緊急回退流程 ===');
    
    try {
      this.execSafe('git reset --hard HEAD');
      this.log('✅ Git reset 完成');
      
      try {
        this.execSafe('git stash pop');
        this.log('✅ Stash 已恢復');
      } catch (error) {
        this.log('⚠️  無 stash 需要恢復');
      }
      
      this.log('🔄 完全回退到修復前狀態');
    } catch (error) {
      this.log(`❌ 回退失敗: ${error.message}`);
    }
  }

  // 主要執行流程
  run() {
    try {
      this.log('🚀 開始安全 TypeScript 錯誤修復');
      
      // Phase 1: 分析
      if (!this.analyzeErrors()) {
        return;
      }

      // Phase 2: 安全檢查點
      this.createSafetyCheckpoint();

      // Phase 3: 選擇目標
      const targets = this.getSafeFixTargets();
      
      if (targets.length === 0) {
        this.log('⚠️  沒有可安全修復的檔案（所有檔案錯誤數 > 10）');
        this.log('建議先手動修復高風險檔案');
        return;
      }

      this.log('\n=== 修復指南 ===');
      this.log('以下檔案可以安全修復，請按順序手動修復:');
      
      targets.slice(0, 5).forEach((target, index) => {
        this.log(`${index + 1}. ${target.file} (${target.count} 個錯誤)`);
      });

      this.log('\n修復每個檔案後，請執行:');
      this.log('node scripts/safe-typescript-fix.js --validate <file_path>');

    } catch (error) {
      this.log(`❌ 修復過程發生錯誤: ${error.message}`);
      this.emergencyRollback();
      process.exit(1);
    }
  }

  // 驗證模式
  validateMode(filePath) {
    if (!fs.existsSync(filePath)) {
      this.log(`❌ 檔案不存在: ${filePath}`);
      return false;
    }

    return this.validateFix(filePath);
  }
}

// 命令行處理
if (require.main === module) {
  const fixer = new SafeTypeScriptFixer();
  
  const args = process.argv.slice(2);
  if (args[0] === '--validate' && args[1]) {
    fixer.validateMode(args[1]);
  } else {
    fixer.run();
  }
}

module.exports = SafeTypeScriptFixer;