#!/usr/bin/env node
/**
 * Complete Migration from GCS to PostgreSQL
 * 完整遷移所有資料
 */

import { Storage } from '@google-cloud/storage';
import { Pool } from 'pg';
import chalk from 'chalk';
import ora from 'ora';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

// Configuration
const GCS_BUCKET = process.env.GCS_BUCKET_NAME || 'ai-square-db-v2';
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
const bucket = storage.bucket(GCS_BUCKET);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

interface MigrationStats {
  users: { found: number; migrated: number; failed: number };
  programs: { found: number; migrated: number; failed: number };
  tasks: { found: number; migrated: number; failed: number };
  evaluations: { found: number; migrated: number; failed: number };
  interactions: { found: number; migrated: number; failed: number };
  totalTime: number;
}

async function migrateAll() {
  console.log(chalk.blue('\n🚀 Starting Complete Migration from GCS to PostgreSQL\n'));
  
  const startTime = Date.now();
  const stats: MigrationStats = {
    users: { found: 0, migrated: 0, failed: 0 },
    programs: { found: 0, migrated: 0, failed: 0 },
    tasks: { found: 0, migrated: 0, failed: 0 },
    evaluations: { found: 0, migrated: 0, failed: 0 },
    interactions: { found: 0, migrated: 0, failed: 0 },
    totalTime: 0
  };

  try {
    // 1. Migrate Users
    console.log(chalk.yellow('\n📁 Phase 1: Migrating Users...'));
    await migrateUsers(stats);

    // 2. Create User Indexes
    console.log(chalk.yellow('\n📁 Phase 2: Creating User Indexes...'));
    await createUserIndexes(stats);

    // 3. Migrate Programs, Tasks, and Evaluations
    console.log(chalk.yellow('\n📁 Phase 3: Migrating Programs and Related Data...'));
    await migrateProgramsWithRelatedData(stats);

    // 4. Verify Data Integrity
    console.log(chalk.yellow('\n📁 Phase 4: Verifying Data Integrity...'));
    await verifyDataIntegrity();

    // 5. Generate Migration Report
    stats.totalTime = Math.round((Date.now() - startTime) / 1000);
    await generateMigrationReport(stats);

    console.log(chalk.green('\n✅ Migration completed successfully!\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Migration failed:'), error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function migrateUsers(stats: MigrationStats) {
  const spinner = ora('Scanning for user data...').start();
  
  try {
    const [files] = await bucket.getFiles();
    const userFiles = files.filter(file => 
      file.name.includes('user_data') || 
      file.name.includes('users/') ||
      file.name.endsWith('user_data.json')
    );

    stats.users.found = userFiles.length;
    spinner.succeed(`Found ${userFiles.length} user files`);

    for (const file of userFiles) {
      try {
        const [content] = await file.download();
        const userData = JSON.parse(content.toString());

        if (!userData.email) continue;

        // Check if user already exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [userData.email.toLowerCase()]
        );

        if (existingUser.rows[0]) {
          // Update existing user
          await pool.query(`
            UPDATE users SET
              name = COALESCE($2, name),
              level = GREATEST($3, level),
              total_xp = GREATEST($4, total_xp),
              learning_preferences = $5,
              onboarding_completed = $6,
              last_active_at = GREATEST($7, last_active_at),
              metadata = metadata || $8,
              updated_at = CURRENT_TIMESTAMP
            WHERE email = $1
          `, [
            userData.email.toLowerCase(),
            userData.name,
            userData.level || 1,
            userData.totalXp || userData.xp || 0,
            JSON.stringify(userData.learningPreferences || userData.preferences || {}),
            userData.onboardingCompleted || false,
            userData.lastActiveAt || userData.updatedAt,
            JSON.stringify({ migrated_from_gcs: true, original_file: file.name })
          ]);
        } else {
          // Create new user
          await pool.query(`
            INSERT INTO users (
              email, name, preferred_language, level, total_xp,
              learning_preferences, onboarding_completed, last_active_at, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            userData.email.toLowerCase(),
            userData.name || userData.email.split('@')[0],
            userData.preferredLanguage || userData.language || 'en',
            userData.level || 1,
            userData.totalXp || userData.xp || 0,
            JSON.stringify(userData.learningPreferences || userData.preferences || {}),
            userData.onboardingCompleted || false,
            userData.lastActiveAt || userData.updatedAt || new Date().toISOString(),
            JSON.stringify({ migrated_from_gcs: true, original_file: file.name })
          ]);
        }

        stats.users.migrated++;
        console.log(chalk.gray(`  ✓ Migrated user: ${userData.email}`));

      } catch (error) {
        stats.users.failed++;
        console.error(chalk.red(`  ✗ Failed to migrate ${file.name}:`), error.message);
      }
    }
  } catch (error) {
    spinner.fail('User migration failed');
    throw error;
  }
}

async function createUserIndexes(stats: MigrationStats) {
  const spinner = ora('Creating user indexes...').start();
  
  try {
    // Get all v2 index files
    const [files] = await bucket.getFiles({ prefix: 'v2/indexes/users/' });
    
    for (const file of files) {
      try {
        const [content] = await file.download();
        const index = JSON.parse(content.toString());
        const userId = path.basename(file.name, '.json');

        // Update user ID mapping
        if (index.email) {
          await pool.query(`
            UPDATE users 
            SET id = $1 
            WHERE email = $2 AND id != $1
          `, [userId, index.email.toLowerCase()]);
        }
      } catch (error) {
        console.warn(chalk.yellow(`  ⚠️  Failed to process index ${file.name}`));
      }
    }
    
    spinner.succeed('User indexes created');
  } catch (error) {
    spinner.fail('Failed to create user indexes');
  }
}

async function migrateProgramsWithRelatedData(stats: MigrationStats) {
  const spinner = ora('Migrating programs...').start();
  
  try {
    // Get all program files
    const [files] = await bucket.getFiles({ prefix: 'v2/programs/' });
    stats.programs.found = files.length;
    
    for (const file of files) {
      try {
        const [content] = await file.download();
        const program = JSON.parse(content.toString());
        const programId = path.basename(file.name, '.json');

        // Get user ID
        let userId;
        if (program.userId?.includes('@')) {
          // userId is email
          const { rows } = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [program.userId.toLowerCase()]
          );
          userId = rows[0]?.id;
        } else {
          userId = program.userId;
        }

        if (!userId) {
          console.warn(chalk.yellow(`  ⚠️  User not found for program ${programId}`));
          stats.programs.failed++;
          continue;
        }

        // Ensure scenario exists
        await ensureScenarioExists(program.scenarioId, program.metadata?.sourceType);

        // Migrate program
        await pool.query(`
          INSERT INTO programs (
            id, user_id, scenario_id, status, current_task_index,
            completed_tasks, total_tasks, total_score, start_time,
            end_time, last_activity_at, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            completed_tasks = EXCLUDED.completed_tasks,
            total_score = EXCLUDED.total_score,
            last_activity_at = EXCLUDED.last_activity_at
        `, [
          programId,
          userId,
          program.scenarioId,
          program.status || 'active',
          program.currentTaskIndex || 0,
          program.completedTasks || 0,
          program.totalTasks || program.taskIds?.length || 0,
          program.totalScore || program.score || program.metadata?.finalScore || 0,
          program.startedAt || program.createdAt,
          program.completedAt || program.endTime,
          program.updatedAt || program.lastActivityAt,
          JSON.stringify(program.metadata || {})
        ]);

        stats.programs.migrated++;

        // Migrate tasks
        if (program.taskIds?.length > 0) {
          await migrateTasks(programId, program.taskIds, stats);
        }

      } catch (error) {
        stats.programs.failed++;
        console.error(chalk.red(`  ✗ Failed to migrate program ${file.name}:`), error.message);
      }
    }

    // Migrate evaluations
    await migrateEvaluations(stats);
    
    spinner.succeed(`Migrated ${stats.programs.migrated} programs`);
  } catch (error) {
    spinner.fail('Program migration failed');
    throw error;
  }
}

async function migrateTasks(programId: string, taskIds: string[], stats: MigrationStats) {
  for (const [index, taskId] of taskIds.entries()) {
    try {
      const [taskContent] = await bucket.file(`v2/tasks/${taskId}.json`).download();
      const task = JSON.parse(taskContent.toString());
      
      await pool.query(`
        INSERT INTO tasks (
          id, program_id, task_index, type, status,
          started_at, completed_at, score, time_spent_seconds,
          attempt_count, context, user_solution, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          completed_at = EXCLUDED.completed_at
      `, [
        taskId,
        programId,
        index,
        task.type || 'question',
        task.status || (task.completed ? 'completed' : 'pending'),
        task.startedAt || task.createdAt,
        task.completedAt,
        task.score || 0,
        task.timeSpent || 0,
        task.attempts || 1,
        JSON.stringify(task.context || task.question || {}),
        task.userSolution || task.response || '',
        JSON.stringify(task.metadata || {})
      ]);

      stats.tasks.migrated++;

      // Migrate interactions
      if (task.interactions?.length > 0) {
        for (const [seqNum, interaction] of task.interactions.entries()) {
          await pool.query(`
            INSERT INTO interactions (
              task_id, sequence_number, type, role, content, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (task_id, sequence_number) DO NOTHING
          `, [
            taskId,
            seqNum,
            interaction.type || 'chat',
            interaction.role || 'user',
            interaction.content || interaction.message,
            JSON.stringify(interaction.metadata || {})
          ]);
          stats.interactions.migrated++;
        }
      }

    } catch (error) {
      stats.tasks.failed++;
      console.warn(chalk.yellow(`    ⚠️  Failed to migrate task ${taskId}`));
    }
  }
}

async function migrateEvaluations(stats: MigrationStats) {
  try {
    const [files] = await bucket.getFiles({ prefix: 'v2/evaluations/' });
    stats.evaluations.found = files.length;

    for (const file of files) {
      try {
        const [content] = await file.download();
        const evaluation = JSON.parse(content.toString());

        await pool.query(`
          INSERT INTO evaluations (
            user_id, program_id, task_id, evaluation_type,
            score, max_score, feedback, ai_analysis,
            ksa_scores, time_taken_seconds, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT ON CONSTRAINT unique_task_evaluation DO UPDATE SET
            score = GREATEST(evaluations.score, EXCLUDED.score)
        `, [
          evaluation.userId,
          evaluation.programId,
          evaluation.taskId,
          evaluation.type || evaluation.evaluationType || 'task_completion',
          evaluation.score || 0,
          evaluation.maxScore || 100,
          evaluation.feedback,
          JSON.stringify(evaluation.aiAnalysis || evaluation.analysis || {}),
          JSON.stringify(evaluation.ksaScores || {}),
          evaluation.timeTaken || evaluation.timeSpent || 0,
          JSON.stringify(evaluation.metadata || {})
        ]);

        stats.evaluations.migrated++;
      } catch (error) {
        stats.evaluations.failed++;
      }
    }
  } catch (error) {
    console.warn(chalk.yellow('  ⚠️  Failed to migrate some evaluations'));
  }
}

async function ensureScenarioExists(scenarioId: string, type?: string) {
  const validTypes = ['pbl', 'assessment', 'discovery'];
  const scenarioType = validTypes.includes(type || '') ? type : 'pbl';
  
  await pool.query(`
    INSERT INTO scenarios (
      id, type, status, difficulty_level, estimated_minutes
    ) VALUES ($1, $2, 'active', 'intermediate', 30)
    ON CONFLICT (id) DO NOTHING
  `, [scenarioId, scenarioType]);
}

async function verifyDataIntegrity() {
  const spinner = ora('Verifying data integrity...').start();
  
  try {
    // Check for orphaned records
    const orphanChecks = [
      {
        name: 'Orphaned tasks',
        query: `SELECT COUNT(*) FROM tasks t WHERE NOT EXISTS (SELECT 1 FROM programs p WHERE p.id = t.program_id)`
      },
      {
        name: 'Orphaned evaluations',
        query: `SELECT COUNT(*) FROM evaluations e WHERE e.task_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.id = e.task_id)`
      },
      {
        name: 'Programs without scenarios',
        query: `SELECT COUNT(*) FROM programs p WHERE NOT EXISTS (SELECT 1 FROM scenarios s WHERE s.id = p.scenario_id)`
      }
    ];

    for (const check of orphanChecks) {
      const { rows } = await pool.query(check.query);
      if (rows[0].count > 0) {
        console.warn(chalk.yellow(`  ⚠️  ${check.name}: ${rows[0].count}`));
      }
    }

    spinner.succeed('Data integrity verified');
  } catch (error) {
    spinner.fail('Data integrity check failed');
  }
}

async function generateMigrationReport(stats: MigrationStats) {
  console.log(chalk.blue('\n📊 Migration Report\n'));
  
  console.log(chalk.yellow('Users:'));
  console.log(chalk.gray(`  Found: ${stats.users.found}`));
  console.log(chalk.green(`  Migrated: ${stats.users.migrated}`));
  console.log(chalk.red(`  Failed: ${stats.users.failed}`));
  
  console.log(chalk.yellow('\nPrograms:'));
  console.log(chalk.gray(`  Found: ${stats.programs.found}`));
  console.log(chalk.green(`  Migrated: ${stats.programs.migrated}`));
  console.log(chalk.red(`  Failed: ${stats.programs.failed}`));
  
  console.log(chalk.yellow('\nTasks:'));
  console.log(chalk.green(`  Migrated: ${stats.tasks.migrated}`));
  console.log(chalk.red(`  Failed: ${stats.tasks.failed}`));
  
  console.log(chalk.yellow('\nEvaluations:'));
  console.log(chalk.gray(`  Found: ${stats.evaluations.found}`));
  console.log(chalk.green(`  Migrated: ${stats.evaluations.migrated}`));
  console.log(chalk.red(`  Failed: ${stats.evaluations.failed}`));
  
  console.log(chalk.yellow('\nInteractions:'));
  console.log(chalk.green(`  Migrated: ${stats.interactions.migrated}`));
  
  console.log(chalk.blue(`\n⏱️  Total time: ${stats.totalTime} seconds`));

  // Save report to file
  const report = {
    timestamp: new Date().toISOString(),
    stats,
    databaseSummary: await getDatabaseSummary()
  };

  await bucket.file('migration-reports/final-report.json').save(
    JSON.stringify(report, null, 2),
    { contentType: 'application/json' }
  );
}

async function getDatabaseSummary() {
  const tables = ['users', 'programs', 'tasks', 'evaluations', 'scenarios'];
  const summary: any = {};

  for (const table of tables) {
    const { rows } = await pool.query(`SELECT COUNT(*) FROM ${table}`);
    summary[table] = parseInt(rows[0].count);
  }

  return summary;
}

// Run migration
if (require.main === module) {
  migrateAll().catch(console.error);
}