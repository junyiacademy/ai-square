#!/usr/bin/env node
/**
 * Verify PostgreSQL Migration
 * 檢查遷移後的資料狀態
 */

import { Pool } from 'pg';
import chalk from 'chalk';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function verifyMigration() {
  console.log(chalk.blue('\n🔍 Verifying PostgreSQL Migration Status\n'));

  try {
    // 1. User Summary
    console.log(chalk.yellow('📊 User Summary:'));
    const { rows: userStats } = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN onboarding_completed THEN 1 END) as onboarded_users,
        AVG(level) as avg_level,
        AVG(total_xp) as avg_xp,
        COUNT(DISTINCT preferred_language) as languages_used
      FROM users
    `);
    console.log(chalk.gray(`  Total Users: ${userStats[0].total_users}`));
    console.log(chalk.gray(`  Onboarded: ${userStats[0].onboarded_users}`));
    console.log(chalk.gray(`  Average Level: ${parseFloat(userStats[0].avg_level).toFixed(1)}`));
    console.log(chalk.gray(`  Average XP: ${parseFloat(userStats[0].avg_xp).toFixed(0)}`));
    console.log(chalk.gray(`  Languages Used: ${userStats[0].languages_used}`));

    // 2. Program Summary
    console.log(chalk.yellow('\n📊 Program Summary:'));
    const { rows: programStats } = await pool.query(`
      SELECT 
        COUNT(*) as total_programs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'abandoned' THEN 1 END) as abandoned,
        COUNT(DISTINCT scenario_id) as unique_scenarios
      FROM programs
    `);
    console.log(chalk.gray(`  Total Programs: ${programStats[0].total_programs}`));
    console.log(chalk.green(`  Completed: ${programStats[0].completed}`));
    console.log(chalk.blue(`  Active: ${programStats[0].active}`));
    console.log(chalk.red(`  Abandoned: ${programStats[0].abandoned}`));
    console.log(chalk.gray(`  Unique Scenarios: ${programStats[0].unique_scenarios}`));

    // 3. Task Summary
    console.log(chalk.yellow('\n📊 Task Summary:'));
    const { rows: taskStats } = await pool.query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        AVG(score) as avg_score,
        AVG(time_spent_seconds) as avg_time_seconds,
        SUM(attempt_count) as total_attempts
      FROM tasks
    `);
    console.log(chalk.gray(`  Total Tasks: ${taskStats[0].total_tasks}`));
    console.log(chalk.green(`  Completed: ${taskStats[0].completed}`));
    console.log(chalk.gray(`  Average Score: ${taskStats[0].avg_score ? parseFloat(taskStats[0].avg_score).toFixed(1) : 'N/A'}`));
    console.log(chalk.gray(`  Average Time: ${taskStats[0].avg_time_seconds ? Math.round(taskStats[0].avg_time_seconds / 60) : 0} minutes`));
    console.log(chalk.gray(`  Total Attempts: ${taskStats[0].total_attempts || 0}`));

    // 4. Scenario Distribution
    console.log(chalk.yellow('\n📊 Scenario Distribution:'));
    const { rows: scenarioTypes } = await pool.query(`
      SELECT 
        type,
        COUNT(*) as count
      FROM scenarios
      GROUP BY type
      ORDER BY count DESC
    `);
    scenarioTypes.forEach(st => {
      console.log(chalk.gray(`  ${st.type}: ${st.count}`));
    });

    // 5. Top Users by XP
    console.log(chalk.yellow('\n🏆 Top Users by XP:'));
    const { rows: topUsers } = await pool.query(`
      SELECT 
        email,
        name,
        level,
        total_xp,
        (SELECT COUNT(*) FROM programs WHERE user_id = users.id AND status = 'completed') as completed_programs
      FROM users
      ORDER BY total_xp DESC
      LIMIT 5
    `);
    topUsers.forEach((user, index) => {
      console.log(chalk.gray(`  ${index + 1}. ${user.name} (${user.email})`));
      console.log(chalk.gray(`     Level ${user.level} | ${user.total_xp} XP | ${user.completed_programs} completed programs`));
    });

    // 6. Recent Activity
    console.log(chalk.yellow('\n⏰ Recent Activity:'));
    const { rows: recentPrograms } = await pool.query(`
      SELECT 
        p.id,
        u.email,
        s.type as scenario_type,
        p.status,
        p.last_activity_at
      FROM programs p
      JOIN users u ON p.user_id = u.id
      JOIN scenarios s ON p.scenario_id = s.id
      ORDER BY p.last_activity_at DESC
      LIMIT 5
    `);
    recentPrograms.forEach(prog => {
      const date = new Date(prog.last_activity_at).toLocaleString();
      console.log(chalk.gray(`  ${prog.email} - ${prog.scenario_type} (${prog.status}) - ${date}`));
    });

    // 7. Data Integrity Check
    console.log(chalk.yellow('\n✅ Data Integrity Check:'));
    
    // Check for orphaned tasks
    const { rows: orphanedTasks } = await pool.query(`
      SELECT COUNT(*) as count
      FROM tasks t
      WHERE NOT EXISTS (SELECT 1 FROM programs p WHERE p.id = t.program_id)
    `);
    console.log(chalk.gray(`  Orphaned Tasks: ${orphanedTasks[0].count}`));

    // Check for programs without scenarios
    const { rows: programsNoScenario } = await pool.query(`
      SELECT COUNT(*) as count
      FROM programs p
      WHERE NOT EXISTS (SELECT 1 FROM scenarios s WHERE s.id = p.scenario_id)
    `);
    console.log(chalk.gray(`  Programs without Scenarios: ${programsNoScenario[0].count}`));

    // 8. Migration Metadata
    console.log(chalk.yellow('\n📋 Migration Metadata:'));
    const { rows: migrationInfo } = await pool.query(`
      SELECT 
        COUNT(*) as count,
        MIN((metadata->>'imported_at')::timestamp) as first_import,
        MAX((metadata->>'imported_at')::timestamp) as last_import
      FROM programs
      WHERE metadata->>'imported_at' IS NOT NULL
    `);
    if (migrationInfo[0].count > 0) {
      console.log(chalk.gray(`  Imported Programs: ${migrationInfo[0].count}`));
      console.log(chalk.gray(`  First Import: ${new Date(migrationInfo[0].first_import).toLocaleString()}`));
      console.log(chalk.gray(`  Last Import: ${new Date(migrationInfo[0].last_import).toLocaleString()}`));
    } else {
      console.log(chalk.gray(`  No imported programs found`));
    }

    console.log(chalk.green('\n✅ Migration verification complete!\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Verification failed:'), error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run verification
if (require.main === module) {
  verifyMigration().catch(console.error);
}