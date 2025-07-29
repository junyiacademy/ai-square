#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Initialize Scenarios for Staging/Production
 * 
 * 這個腳本設計用於 staging 和 production 環境
 * 特點：
 * 1. 幂等性 - 可以重複執行而不會產生副作用
 * 2. 事務性 - 失敗時會回滾
 * 3. 詳細日誌 - 記錄所有操作供查核
 * 
 * Usage:
 *   npm run init:scenarios:staging
 *   npm run init:scenarios:staging -- --dry-run
 *   npm run init:scenarios:staging -- --force
 */

import { scenarioInitService } from '@/lib/services/scenario-initialization-service';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { program } from 'commander';
import chalk from 'chalk';
import { Pool } from 'pg';

// Parse command line arguments
program
  .option('--dry-run', 'Run without actually creating/updating scenarios')
  .option('--force', 'Force update existing scenarios')
  .option('--verbose', 'Show detailed logs')
  .parse(process.argv);

const options = program.opts();

// 記錄操作日誌
const logs: string[] = [];
function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  logs.push(logEntry);
  
  if (options.verbose || level !== 'info') {
    switch (level) {
      case 'error':
        console.error(chalk.red(message));
        break;
      case 'warn':
        console.warn(chalk.yellow(message));
        break;
      default:
        console.log(chalk.blue(message));
    }
  }
}

async function main() {
  log('🚀 Starting Scenario Initialization for Staging/Production');
  log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  log(`Database: ${process.env.DB_NAME || 'ai_square_db'}`);
  log(`Options: ${JSON.stringify(options)}`);

  // 設定預設值（開發環境）
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_NAME = process.env.DB_NAME || 'ai_square_db';
  const DB_PORT = process.env.DB_PORT || '5433';
  const DB_USER = process.env.DB_USER || 'postgres';
  const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
  
  // 在 production 環境必須設定環境變數
  if (process.env.NODE_ENV === 'production' && !process.env.DB_HOST) {
    log('Missing required environment variables for production: DB_HOST', 'error');
    process.exit(1);
  }

  // 建立資料庫連線進行事務處理
  const pool = new Pool({
    host: DB_HOST,
    port: parseInt(DB_PORT),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  const client = await pool.connect();

  try {
    // 開始事務
    await client.query('BEGIN');
    log('Database transaction started');

    // 備份現有資料
    if (!options.dryRun) {
      log('Creating backup of existing scenarios...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS scenarios_backup AS 
        SELECT *, CURRENT_TIMESTAMP as backup_time 
        FROM scenarios
      `);
    }

    // 檢查現有 scenarios
    const existingCount = await client.query(
      'SELECT mode, COUNT(*) as count FROM scenarios GROUP BY mode'
    );
    log(`Existing scenarios: ${JSON.stringify(existingCount.rows)}`);

    const initOptions = {
      forceUpdate: options.force,
      dryRun: options.dryRun
    };

    // 初始化各類型 scenarios
    const results = [];

    // 1. Assessment Scenarios
    log('📝 Initializing Assessment Scenarios...');
    try {
      const assessmentResult = await scenarioInitService.initializeAssessmentScenarios(initOptions);
      results.push(assessmentResult);
      log(`Assessment: Created ${assessmentResult.created}, Updated ${assessmentResult.updated}, Skipped ${assessmentResult.skipped}`);
      
      if (assessmentResult.errors.length > 0) {
        assessmentResult.errors.forEach(err => log(`Assessment Error: ${err}`, 'error'));
      }
    } catch (error) {
      log(`Failed to initialize Assessment scenarios: ${error}`, 'error');
      throw error;
    }

    // 2. PBL Scenarios
    log('📚 Initializing PBL Scenarios...');
    try {
      const pblResult = await scenarioInitService.initializePBLScenarios(initOptions);
      results.push(pblResult);
      log(`PBL: Created ${pblResult.created}, Updated ${pblResult.updated}, Skipped ${pblResult.skipped}`);
      
      if (pblResult.errors.length > 0) {
        pblResult.errors.forEach(err => log(`PBL Error: ${err}`, 'error'));
      }
    } catch (error) {
      log(`Failed to initialize PBL scenarios: ${error}`, 'error');
      throw error;
    }

    // 3. Discovery Scenarios
    log('🌍 Initializing Discovery Scenarios...');
    try {
      const discoveryResult = await scenarioInitService.initializeDiscoveryScenarios(initOptions);
      results.push(discoveryResult);
      log(`Discovery: Created ${discoveryResult.created}, Updated ${discoveryResult.updated}, Skipped ${discoveryResult.skipped}`);
      
      if (discoveryResult.errors.length > 0) {
        discoveryResult.errors.forEach(err => log(`Discovery Error: ${err}`, 'error'));
      }
    } catch (error) {
      log(`Failed to initialize Discovery scenarios: ${error}`, 'error');
      throw error;
    }

    // 驗證資料完整性
    log('🔍 Validating data integrity...');
    const validation = await validateScenarios(client);
    if (!validation.valid) {
      log(`Validation failed: ${validation.errors.join(', ')}`, 'error');
      throw new Error('Data validation failed');
    }
    log('✅ Data validation passed');

    // 提交事務
    if (!options.dryRun) {
      await client.query('COMMIT');
      log('✅ Database transaction committed successfully');
    } else {
      await client.query('ROLLBACK');
      log('🔄 Dry run completed, transaction rolled back');
    }

    // 打印摘要
    printDetailedSummary(results);

    // 儲存日誌
    if (!options.dryRun) {
      await saveLogsToFile();
    }

  } catch (error) {
    // 回滾事務
    await client.query('ROLLBACK');
    log('❌ Transaction rolled back due to error', 'error');
    log(`Error details: ${error}`, 'error');
    
    // 儲存錯誤日誌
    await saveLogsToFile(true);
    
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// 驗證資料完整性
async function validateScenarios(client: any): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // 檢查每個 scenario 都有必要欄位
  const invalidScenarios = await client.query(`
    SELECT id, mode, title 
    FROM scenarios 
    WHERE title IS NULL 
       OR title = '{}'::jsonb 
       OR NOT (title ? 'en')
  `);
  
  if (invalidScenarios.rows.length > 0) {
    errors.push(`Found ${invalidScenarios.rows.length} scenarios without valid titles`);
  }

  // 檢查是否有重複的 source_path
  const duplicates = await client.query(`
    SELECT source_path, COUNT(*) as count 
    FROM scenarios 
    WHERE source_path IS NOT NULL 
    GROUP BY source_path 
    HAVING COUNT(*) > 1
  `);
  
  if (duplicates.rows.length > 0) {
    errors.push(`Found ${duplicates.rows.length} duplicate source paths`);
  }

  // 檢查每種模式至少有一個 scenario
  const modeCounts = await client.query(`
    SELECT mode, COUNT(*) as count 
    FROM scenarios 
    GROUP BY mode
  `);
  
  const modes = ['assessment', 'pbl', 'discovery'];
  const existingModes = modeCounts.rows.map((r: any) => r.mode);
  const missingModes = modes.filter(m => !existingModes.includes(m));
  
  if (missingModes.length > 0) {
    errors.push(`Missing scenarios for modes: ${missingModes.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// 詳細摘要
function printDetailedSummary(results: any[]) {
  console.log(chalk.blue('\n📊 Initialization Summary'));
  console.log(chalk.gray('═'.repeat(50)));
  
  const totals = results.reduce((acc, r) => ({
    total: acc.total + r.total,
    created: acc.created + r.created,
    updated: acc.updated + r.updated,
    skipped: acc.skipped + r.skipped,
    errors: acc.errors + r.errors.length
  }), { total: 0, created: 0, updated: 0, skipped: 0, errors: 0 });

  console.log(chalk.green(`✅ Total scenarios processed: ${totals.total}`));
  console.log(chalk.green(`   • Created: ${totals.created}`));
  console.log(chalk.yellow(`   • Updated: ${totals.updated}`));
  console.log(chalk.gray(`   • Skipped: ${totals.skipped}`));
  
  if (totals.errors > 0) {
    console.log(chalk.red(`❌ Errors encountered: ${totals.errors}`));
  }

  // 按模式顯示詳細資訊
  console.log(chalk.blue('\n📈 By Mode:'));
  results.forEach((result, index) => {
    const mode = ['Assessment', 'PBL', 'Discovery'][index];
    console.log(chalk.cyan(`\n${mode}:`));
    console.log(`   • Total: ${result.total}`);
    console.log(`   • Created: ${result.created}`);
    console.log(`   • Updated: ${result.updated}`);
    console.log(`   • Skipped: ${result.skipped}`);
    if (result.errors.length > 0) {
      console.log(chalk.red(`   • Errors: ${result.errors.length}`));
    }
  });

  if (options.dryRun) {
    console.log(chalk.yellow('\n⚠️  This was a DRY RUN. No changes were made to the database.'));
  }
}

// 儲存日誌到檔案
async function saveLogsToFile(isError = false) {
  const { promises: fs } = await import('fs');
  const logDir = 'logs/scenario-init';
  const timestamp = new Date().toISOString().replace(/[:]/g, '-');
  const filename = `${logDir}/init-${timestamp}${isError ? '-ERROR' : ''}.log`;
  
  try {
    await fs.mkdir(logDir, { recursive: true });
    await fs.writeFile(filename, logs.join('\n'), 'utf8');
    console.log(chalk.gray(`\n📄 Logs saved to: ${filename}`));
  } catch (error) {
    console.error(chalk.red(`Failed to save logs: ${error}`));
  }
}

// 執行腳本
main().catch(error => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});