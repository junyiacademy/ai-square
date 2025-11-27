#!/usr/bin/env npx tsx
/**
 * Production dry run script for weekly report
 * Generates report preview from production database without sending to Slack
 *
 * Usage: npm run report:weekly:dry:prod
 *
 * Security: Reads credentials from .env.production (not exposed in command line)
 */

import { Pool } from 'pg';
import { getWeeklyStats } from '../src/app/api/reports/lib/db-queries';
import { formatWeeklyReport } from '../src/app/api/reports/lib/report-formatter';
import dotenv from 'dotenv';

// Load production environment variables
dotenv.config({ path: '.env.production' });

async function main() {
  console.log('🔍 AI Square Weekly Report - Production Dry Run\n');

  // Production Cloud SQL connection details (direct IP for external access)
  const PROD_DB_CONFIG = {
    host: '34.81.99.179', // Production Cloud SQL public IP
    port: 5432,
    database: process.env.DB_NAME || 'ai_square_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD // Read from .env.production (secure)
  };

  if (!PROD_DB_CONFIG.password) {
    console.error('❌ Missing DB_PASSWORD in .env.production');
    process.exit(1);
  }

  console.log('🔐 Environment: Production');
  console.log('🗄️  Database:', PROD_DB_CONFIG.host);
  console.log('📍 Database Name:', PROD_DB_CONFIG.database);
  console.log('👤 User:', PROD_DB_CONFIG.user);
  console.log('🔒 Password: ****** (secured)');
  console.log('');

  try {
    // Create database connection to production
    const pool = new Pool({
      ...PROD_DB_CONFIG,
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000
    });

    console.log('📊 Fetching statistics from production database...');
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
    console.log(`   Total Completions: ${stats.learning.totalCompletions}`);
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
    console.log('✅ Production dry run completed successfully!');
    console.log('⚠️  This was a DRY RUN - no data was sent to Slack');
    console.log('💡 To send this report to Slack, it will be sent automatically every Monday 09:00');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
