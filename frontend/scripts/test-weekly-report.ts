#!/usr/bin/env npx tsx
/**
 * Dry run script for weekly report
 * Generates report preview without sending to Slack
 */

import { Pool } from 'pg';
import { getWeeklyStats } from '../src/app/api/reports/lib/db-queries';
import { formatWeeklyReport } from '../src/app/api/reports/lib/report-formatter';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('🔍 AI Square Weekly Report - Dry Run\n');

  try {
    // Create database connection
    const pool = new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000
    });

    console.log('📊 Fetching statistics from database...');
    const stats = await getWeeklyStats(pool);

    console.log('✅ Statistics fetched successfully!\n');
    console.log('📈 User Growth:');
    console.log(`   Total Users: ${stats.userGrowth.totalUsers}`);
    console.log(`   New This Week: ${stats.userGrowth.newThisWeek}`);
    console.log(`   Week-over-Week: ${stats.userGrowth.weekOverWeekGrowth.toFixed(1)}%`);
    console.log(`   Avg Per Day: ${stats.userGrowth.avgPerDay.toFixed(1)}\n`);

    console.log('👥 Engagement:');
    console.log(`   Weekly Active: ${stats.engagement.weeklyActiveUsers}`);
    console.log(`   Daily Avg: ${stats.engagement.dailyAvgActive}`);
    console.log(`   Retention: ${stats.engagement.retentionRate.toFixed(1)}%\n`);

    console.log('📚 Learning:');
    console.log(`   Assessment: ${stats.learning.assessmentCompletions}`);
    console.log(`   PBL: ${stats.learning.pblCompletions}`);
    console.log(`   Discovery: ${stats.learning.discoveryCompletions}`);
    console.log(`   Completion Rate: ${stats.learning.completionRate.toFixed(1)}%\n`);

    console.log('🚀 System Health:');
    console.log(`   API Success Rate: ${stats.systemHealth.apiSuccessRate.toFixed(1)}%`);
    console.log(`   Avg Response: ${stats.systemHealth.avgResponseTime}ms`);
    console.log(`   Uptime: ${stats.systemHealth.uptime.toFixed(2)}%\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 FORMATTED REPORT (Slack Format):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const report = formatWeeklyReport(stats);
    console.log(report);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Dry run completed successfully!');
    console.log('💡 To send this report to Slack, run: npm run report:weekly');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
