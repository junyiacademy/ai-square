#!/usr/bin/env node
/**
 * Migrate Programs, Tasks, and Evaluations from GCS to PostgreSQL
 * 將既有的學習記錄從 GCS 遷移到 PostgreSQL
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

interface ProgramData {
  id?: string;
  userId?: string;
  scenarioId?: string;
  scenario?: string;
  scenarioType?: string;
  startTime?: string;
  endTime?: string;
  lastActivityAt?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  status?: string;
  totalTasks?: number;
  completedTasks?: number;
  totalScore?: number;
  score?: number;
  totalXpEarned?: number;
  xpEarned?: number;
  taskIds?: string[];
  tasks?: Array<Record<string, unknown>>;
  evaluations?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  const { rows } = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  return rows[0]?.id || null;
}

async function ensureScenarioExists(scenarioData: Record<string, unknown>): Promise<string> {
  const scenarioId = scenarioData.id || scenarioData.scenarioId || `imported-${Date.now()}`;
  
  // Validate scenario type
  const validTypes = ['pbl', 'assessment', 'discovery'];
  let scenarioType = scenarioData.type || scenarioData.scenarioType || 'pbl';
  
  // Map sourceType to valid scenario type
  if (scenarioType === 'imported' || !validTypes.includes(scenarioType)) {
    scenarioType = 'pbl'; // default to pbl
  }
  
  await pool.query(`
    INSERT INTO scenarios (
      id, type, difficulty_level, status, 
      estimated_minutes, prerequisites, tasks, 
      xp_rewards, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (id) DO UPDATE SET
      updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `, [
    scenarioId,
    scenarioType,
    scenarioData.difficulty || 'intermediate',
    'active',
    scenarioData.estimatedDuration || scenarioData.estimatedMinutes || 30,
    JSON.stringify(scenarioData.prerequisites || []),
    JSON.stringify(scenarioData.tasks || []),
    JSON.stringify(scenarioData.xpRewards || { completion: 100 }),
    JSON.stringify({
      imported_at: new Date().toISOString(),
      original_source: 'gcs',
      original_type: scenarioData.type,
      ...scenarioData
    })
  ]);
  
  return scenarioId;
}

async function processSingleProgram(
  programId: string, 
  programData: ProgramData, 
  userId: string, 
  stats: Record<string, unknown>
) {
  try {
    console.log(chalk.gray(`    Processing program: ${programId}`));
    stats.programs_found++;

    // Ensure scenario exists
    const scenarioType = programData.metadata?.sourceType || programData.scenarioType || 'pbl';
    console.log(chalk.gray(`      Scenario type: ${scenarioType}`));
    
    const scenarioId = await ensureScenarioExists({
      id: programData.scenarioId || programData.scenario,
      type: scenarioType,
      ...programData.metadata?.scenario
    });

    // Insert program
    await pool.query(`
      INSERT INTO programs (
        id, user_id, scenario_id, start_time, end_time,
        last_activity_at, status, total_tasks, completed_tasks,
        total_score, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        last_activity_at = EXCLUDED.last_activity_at,
        status = EXCLUDED.status,
        completed_tasks = GREATEST(programs.completed_tasks, EXCLUDED.completed_tasks),
        total_score = GREATEST(programs.total_score, EXCLUDED.total_score),
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [
      programId,
      userId,
      scenarioId,
      programData.startTime || programData.startedAt || programData.createdAt || new Date().toISOString(),
      programData.endTime || programData.completedAt,
      programData.lastActivityAt || programData.updatedAt || new Date().toISOString(),
      programData.status || 'active',
      programData.totalTasks || programData.taskIds?.length || 0,
      programData.completedTasks || 0,
      programData.totalScore || programData.score || programData.metadata?.finalScore || 0,
      JSON.stringify({
        original_file: `v2/programs/${programId}.json`,
        imported_at: new Date().toISOString(),
        totalXpEarned: programData.totalXpEarned || programData.xpEarned || programData.metadata?.totalXP || 0,
        ...programData.metadata
      })
    ]);

    console.log(chalk.green(`    ✓ Migrated program: ${programId}`));
    stats.programs_migrated++;

    // Migrate tasks if taskIds exist
    if (programData.taskIds && Array.isArray(programData.taskIds)) {
      for (const [index, taskId] of programData.taskIds.entries()) {
        try {
          // Download task file
          const taskFile = bucket.file(`v2/tasks/${taskId}.json`);
          const [taskExists] = await taskFile.exists();
          
          if (!taskExists) {
            console.log(chalk.yellow(`      ⚠️  Task file not found: ${taskId}`));
            continue;
          }

          const [taskContent] = await taskFile.download();
          const task = JSON.parse(taskContent.toString());
          
          await pool.query(`
            INSERT INTO tasks (
              id, program_id, task_index, type, status,
              started_at, completed_at, score, time_spent_seconds,
              attempt_count, allowed_attempts, context, user_solution, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              score = GREATEST(tasks.score, EXCLUDED.score),
              updated_at = CURRENT_TIMESTAMP
          `, [
            taskId,
            programId,
            index,
            task.type || 'question',
            task.status || (task.completed ? 'completed' : 'pending'),
            task.startTime || task.startedAt || task.createdAt,
            task.endTime || task.completedAt,
            task.score || 0,
            task.timeSpent || task.duration || 0,
            task.attempts || task.attemptCount || 1,
            task.maxAttempts || task.allowedAttempts || 3,
            JSON.stringify(task.context || task.question || {}),
            task.userSolution || task.response || task.answer || '',
            JSON.stringify({
              response: task.response || task.answer,
              ...task.metadata
            })
          ]);

          stats.tasks_migrated++;

          // Migrate interactions if any
          if (task.interactions && Array.isArray(task.interactions)) {
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
              stats.interactions_migrated++;
            }
          }
        } catch (taskError) {
          console.warn(chalk.yellow(`      ⚠️  Failed to migrate task: ${taskId}`), taskError.message);
        }
      }
    }
  } catch (error) {
    throw error;
  }
}

async function migratePrograms() {
  console.log(chalk.blue('\n🚀 Starting Program Migration from GCS to PostgreSQL\n'));

  const spinner = ora('Scanning GCS for program data...').start();
  const stats = {
    programs_found: 0,
    programs_migrated: 0,
    tasks_migrated: 0,
    evaluations_migrated: 0,
    interactions_migrated: 0,
    failed: 0
  };

  try {
    // 1. Find all user index files to get user-program mappings
    const [files] = await bucket.getFiles();
    const userIndexFiles = files.filter(file => 
      file.name.includes('v2/indexes/users/') && 
      file.name.endsWith('.json')
    );

    console.log(chalk.blue(`\nFound ${userIndexFiles.length} user index files`));

    // If no user indexes found, try to process programs directly
    if (userIndexFiles.length === 0) {
      console.log(chalk.yellow('No user indexes found, processing programs directly...'));
      
      const programFiles = files.filter(file => 
        file.name.includes('v2/programs/') && 
        file.name.endsWith('.json')
      );
      
      spinner.succeed(`Found ${programFiles.length} program files`);
      
      for (const programFile of programFiles) {
        try {
          const [content] = await programFile.download();
          const programData = JSON.parse(content.toString()) as ProgramData;
          const programId = path.basename(programFile.name, '.json');
          
          if (!programData.userId) {
            console.log(chalk.yellow(`  ⚠️  No userId in program: ${programId}`));
            continue;
          }
          
          // Check if user exists - userId in programs is actually email
          const userEmail = programData.userId.toLowerCase();
          const userId = await getUserIdByEmail(userEmail);
          
          if (!userId) {
            console.log(chalk.yellow(`  ⚠️  User not found: ${userEmail}`));
            continue;
          }
          
          // Process this program with the actual UUID userId
          await processSingleProgram(programId, programData, userId, stats);
          
        } catch (error) {
          console.error(chalk.red(`  ✗ Failed to process ${programFile.name}:`), error.message);
          stats.failed++;
        }
      }
    }

    // 2. Process each user's programs from indexes
    for (const userIndexFile of userIndexFiles) {
      try {
        const [content] = await userIndexFile.download();
        const userIndex = JSON.parse(content.toString());
        
        // Get user ID from filename
        const userId = path.basename(userIndexFile.name, '.json');
        
        // Check if user exists in PostgreSQL
        const { rows: userRows } = await pool.query(
          'SELECT id, email FROM users WHERE id = $1',
          [userId]
        );
        
        if (!userRows[0]) {
          console.log(chalk.yellow(`  ⚠️  User not found in PostgreSQL: ${userId}`));
          continue;
        }

        console.log(chalk.blue(`\nProcessing programs for user: ${userRows[0].email}`));

        // Process user's programs
        if (userIndex.programIds && Array.isArray(userIndex.programIds)) {
          for (const programId of userIndex.programIds) {
            try {
              // Download program file
              const programFile = bucket.file(`v2/programs/${programId}.json`);
              const [exists] = await programFile.exists();
              
              if (!exists) {
                console.log(chalk.yellow(`  ⚠️  Program file not found: ${programId}`));
                continue;
              }

              // Download and parse program data
              const [programContent] = await programFile.download();
              const programData = JSON.parse(programContent.toString()) as ProgramData;

              // Use the shared function to process this program
              await processSingleProgram(programId, programData, userId, stats);

            } catch (programError) {
              console.error(chalk.red(`    ✗ Failed to migrate program ${programId}:`), programError.message);
              stats.failed++;
            }
          }
        }

      } catch (userError) {
        console.error(chalk.red(`  ✗ Failed to process user index ${userIndexFile.name}:`), userError.message);
      }
    }

    // 3. Process standalone evaluations
    spinner.text = 'Processing evaluations...';
    const evaluationFiles = files.filter(file => 
      file.name.includes('v2/evaluations/') && 
      file.name.endsWith('.json')
    );

    for (const evalFile of evaluationFiles) {
      try {
        const [evalContent] = await evalFile.download();
        const evaluation = JSON.parse(evalContent.toString());
        
        await pool.query(`
          INSERT INTO evaluations (
            user_id, program_id, task_id, evaluation_type,
            score, max_score, feedback, ai_analysis,
            ksa_scores, time_taken_seconds, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT ON CONSTRAINT unique_task_evaluation DO UPDATE SET
            score = GREATEST(evaluations.score, EXCLUDED.score),
            updated_at = CURRENT_TIMESTAMP
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
        stats.evaluations_migrated++;
      } catch {
        console.warn(chalk.yellow(`  ⚠️  Failed to migrate evaluation`));
      }
    }

    // Summary
    console.log(chalk.blue('\n📊 Migration Summary:'));
    console.log(chalk.gray(`  Programs found: ${stats.programs_found}`));
    console.log(chalk.green(`  Programs migrated: ${stats.programs_migrated}`));
    console.log(chalk.green(`  Tasks migrated: ${stats.tasks_migrated}`));
    console.log(chalk.green(`  Evaluations migrated: ${stats.evaluations_migrated}`));
    console.log(chalk.green(`  Interactions migrated: ${stats.interactions_migrated}`));
    console.log(chalk.red(`  Failed: ${stats.failed}`));

    // Verify migration
    const { rows: programCount } = await pool.query('SELECT COUNT(*) FROM programs');
    const { rows: taskCount } = await pool.query('SELECT COUNT(*) FROM tasks');
    const { rows: evalCount } = await pool.query('SELECT COUNT(*) FROM evaluations');

    console.log(chalk.blue('\n📈 Current Database Status:'));
    console.log(chalk.gray(`  Total programs: ${programCount[0].count}`));
    console.log(chalk.gray(`  Total tasks: ${taskCount[0].count}`));
    console.log(chalk.gray(`  Total evaluations: ${evalCount[0].count}`));

  } catch (error) {
    spinner.fail('Migration failed');
    console.error(chalk.red('\n❌ Error:'), error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
if (require.main === module) {
  migratePrograms().catch(console.error);
}