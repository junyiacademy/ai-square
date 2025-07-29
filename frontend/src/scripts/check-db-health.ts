#!/usr/bin/env node
/**
 * Database Health Check
 * 檢查 PostgreSQL 和 GCS 連線狀態
 */

import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import chalk from 'chalk';
import ora from 'ora';

async function checkHealth() {
  console.log(chalk.blue('\n🏥 AI Square Storage Health Check\n'));

  const spinner = ora('Checking storage systems...').start();

  try {
    // Run health check
    const health = await repositoryFactory.healthCheck();

    spinner.stop();

    // PostgreSQL Status
    console.log(chalk.yellow('📊 PostgreSQL Status:'));
    if (health.postgresql) {
      console.log(chalk.green('  ✓ Connected'));
      console.log(chalk.gray(`  Time: ${(health.details as any).postgresql?.time}`));
    } else {
      console.log(chalk.red('  ✗ Connection Failed'));
      console.log(chalk.red(`  Error: ${(health.details as any).postgresql?.error}`));
    }

    // GCS Status
    console.log(chalk.yellow('\n☁️  Google Cloud Storage Status:'));
    if (health.gcs) {
      console.log(chalk.green('  ✓ Connected'));
      console.log(chalk.gray(`  Buckets Accessible: ${(health.details as any).gcs?.bucketsAccessible}`));
    } else {
      console.log(chalk.red('  ✗ Connection Failed'));
      console.log(chalk.red(`  Error: ${(health.details as any).gcs?.error}`));
    }

    // Quick database stats
    if (health.postgresql) {
      console.log(chalk.yellow('\n📈 Database Statistics:'));
      
      const userRepo = repositoryFactory.getUserRepository();
      const programRepo = repositoryFactory.getProgramRepository();
      const scenarioRepo = repositoryFactory.getScenarioRepository();
      
      await userRepo.findAll({ limit: 1 });
      await programRepo.findByUser('dummy'); // Just to test connection
      const scenarios = await scenarioRepo.findActive?.() || [];
      
      console.log(chalk.gray(`  Active Scenarios: ${scenarios.length}`));
      console.log(chalk.gray(`  Database: Connected and operational`));
    }

    // Overall status
    console.log(chalk.blue('\n🎯 Overall Status:'));
    if (health.postgresql && health.gcs) {
      console.log(chalk.green('  ✅ All systems operational'));
    } else if (health.postgresql) {
      console.log(chalk.yellow('  ⚠️  PostgreSQL working, GCS issues'));
    } else if (health.gcs) {
      console.log(chalk.yellow('  ⚠️  GCS working, PostgreSQL issues'));
    } else {
      console.log(chalk.red('  ❌ Both systems have issues'));
    }

  } catch (_error) {
    spinner.fail('Health check failed');
    console.error(chalk.red('\n❌ Error:'), error);
    process.exit(1);
  } finally {
    await repositoryFactory.shutdown();
  }
}

// Run health check
if (require.main === module) {
  checkHealth().catch(console.error);
}