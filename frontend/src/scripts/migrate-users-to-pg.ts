#!/usr/bin/env node
/**
 * Migrate Users from GCS to PostgreSQL
 * 將既有的用戶資料（包含示範帳號）從 GCS 遷移到 PostgreSQL
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

interface Achievement {
  id: string;
  name: string;
  description?: string;
  earned_at: string;
}

interface UserData {
  id?: string;
  email: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  lastActiveAt?: string;
  preferredLanguage?: string;
  language?: string;
  level?: number;
  totalXp?: number;
  xp?: number;
  achievements?: Achievement[];
  preferences?: Record<string, unknown>;
  learningPreferences?: Record<string, unknown>;
  onboardingCompleted?: boolean;
  metadata?: Record<string, unknown>;
}

async function migrateUsers() {
  console.log(chalk.blue('\n🚀 Starting User Migration from GCS to PostgreSQL\n'));

  const spinner = ora('Scanning GCS for user data...').start();
  const stats = {
    found: 0,
    migrated: 0,
    failed: 0,
    skipped: 0
  };

  try {
    // 1. Find all user data files
    const [files] = await bucket.getFiles();
    const userFiles = files.filter(file => 
      file.name.includes('user_data') || 
      file.name.includes('users/') ||
      file.name.endsWith('user_data.json')
    );

    spinner.succeed(`Found ${userFiles.length} potential user files`);
    stats.found = userFiles.length;

    // 2. Process each user file
    for (const file of userFiles) {
      try {
        console.log(chalk.gray(`\nProcessing: ${file.name}`));
        
        // Download and parse user data
        const [content] = await file.download();
        const userData = JSON.parse(content.toString()) as UserData;

        // Skip if no email
        if (!userData.email) {
          console.log(chalk.yellow('  ⚠️  No email found, skipping'));
          stats.skipped++;
          continue;
        }

        // Prepare user data for PostgreSQL
        const pgUserData = {
          email: userData.email.toLowerCase(),
          name: userData.name || userData.email.split('@')[0],
          preferred_language: userData.preferredLanguage || userData.language || 'en',
          level: userData.level || 1,
          total_xp: userData.totalXp || userData.xp || 0,
          learning_preferences: userData.learningPreferences || userData.preferences || {},
          onboarding_completed: userData.onboardingCompleted || false,
          last_active_at: userData.lastActiveAt || userData.updatedAt || new Date().toISOString(),
          metadata: {
            original_file: file.name,
            migrated_from: 'gcs',
            migrated_at: new Date().toISOString(),
            ...userData.metadata
          }
        };

        // Insert into PostgreSQL
        const result = await pool.query(`
          INSERT INTO users (
            email, name, preferred_language, level, total_xp,
            learning_preferences, onboarding_completed, last_active_at, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (email) DO UPDATE SET
            name = COALESCE(EXCLUDED.name, users.name),
            preferred_language = COALESCE(EXCLUDED.preferred_language, users.preferred_language),
            level = GREATEST(EXCLUDED.level, users.level),
            total_xp = GREATEST(EXCLUDED.total_xp, users.total_xp),
            learning_preferences = users.learning_preferences || EXCLUDED.learning_preferences,
            onboarding_completed = EXCLUDED.onboarding_completed OR users.onboarding_completed,
            last_active_at = GREATEST(EXCLUDED.last_active_at, users.last_active_at),
            metadata = users.metadata || EXCLUDED.metadata,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id, email, created_at, updated_at
        `, [
          pgUserData.email,
          pgUserData.name,
          pgUserData.preferred_language,
          pgUserData.level,
          pgUserData.total_xp,
          JSON.stringify(pgUserData.learning_preferences),
          pgUserData.onboarding_completed,
          pgUserData.last_active_at,
          JSON.stringify(pgUserData.metadata)
        ]);

        const migratedUser = result.rows[0];
        console.log(chalk.green(`  ✓ Migrated: ${migratedUser.email} (ID: ${migratedUser.id})`));
        stats.migrated++;

        // Migrate achievements if any
        if (userData.achievements && Array.isArray(userData.achievements)) {
          for (const achievement of userData.achievements) {
            try {
              // First ensure achievement exists
              await pool.query(`
                INSERT INTO achievements (code, achievement_type, xp_reward)
                VALUES ($1, $2, $3)
                ON CONFLICT (code) DO NOTHING
              `, [
                achievement.code || achievement.id || 'unknown',
                achievement.type || 'imported',
                achievement.xpReward || achievement.xp || 0
              ]);

              // Then link to user
              await pool.query(`
                INSERT INTO user_achievements (user_id, achievement_id, earned_at)
                SELECT $1, id, $2
                FROM achievements
                WHERE code = $3
                ON CONFLICT (user_id, achievement_id) DO NOTHING
              `, [
                migratedUser.id,
                achievement.earnedAt || achievement.unlockedAt || new Date().toISOString(),
                achievement.code || achievement.id || 'unknown'
              ]);
            } catch {
              console.warn(chalk.yellow(`    ⚠️  Failed to migrate achievement: ${achievement.code}`));
            }
          }
        }

      } catch (error) {
        console.error(chalk.red(`  ✗ Failed to migrate ${file.name}:`), error.message);
        stats.failed++;
      }
    }

    // 3. Add demo accounts if not exist
    console.log(chalk.blue('\n📌 Ensuring demo accounts exist...'));
    
    const demoAccounts = [
      {
        email: 'demo@ai-square.com',
        name: 'Demo User',
        preferred_language: 'en',
        level: 5,
        total_xp: 2500,
        learning_preferences: { difficulty: 'intermediate', pace: 'normal' },
        onboarding_completed: true
      },
      {
        email: 'teacher@example.com',
        name: 'Teacher Demo',
        preferred_language: 'zhTW',
        level: 10,
        total_xp: 5000,
        learning_preferences: { difficulty: 'advanced', pace: 'fast' },
        onboarding_completed: true
      },
      {
        email: 'student@example.com',
        name: 'Student Demo',
        preferred_language: 'zhTW',
        level: 1,
        total_xp: 100,
        learning_preferences: { difficulty: 'beginner', pace: 'slow' },
        onboarding_completed: false
      }
    ];

    for (const demo of demoAccounts) {
      try {
        const result = await pool.query(`
          INSERT INTO users (
            email, name, preferred_language, level, total_xp,
            learning_preferences, onboarding_completed
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (email) DO UPDATE SET
            updated_at = CURRENT_TIMESTAMP
          RETURNING id, email
        `, [
          demo.email,
          demo.name,
          demo.preferred_language,
          demo.level,
          demo.total_xp,
          JSON.stringify(demo.learning_preferences),
          demo.onboarding_completed
        ]);
        
        console.log(chalk.green(`  ✓ Demo account ready: ${result.rows[0].email}`));
      } catch (error) {
        console.error(chalk.red(`  ✗ Failed to create demo account ${demo.email}:`), error.message);
      }
    }

    // 4. Summary
    console.log(chalk.blue('\n📊 Migration Summary:'));
    console.log(chalk.gray(`  Found: ${stats.found} files`));
    console.log(chalk.green(`  Migrated: ${stats.migrated} users`));
    console.log(chalk.yellow(`  Skipped: ${stats.skipped} files`));
    console.log(chalk.red(`  Failed: ${stats.failed} files`));

    // 5. Verify migration
    const { rows: userCount } = await pool.query('SELECT COUNT(*) FROM users');
    const { rows: topUsers } = await pool.query(`
      SELECT email, name, level, total_xp, preferred_language
      FROM users
      ORDER BY total_xp DESC
      LIMIT 10
    `);

    console.log(chalk.blue('\n📈 Current Database Status:'));
    console.log(chalk.gray(`  Total users: ${userCount[0].count}`));
    console.log(chalk.gray('\n  Top users by XP:'));
    topUsers.forEach(user => {
      console.log(chalk.gray(`    ${user.email} - Level ${user.level} (${user.total_xp} XP) - ${user.preferred_language}`));
    });

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
  migrateUsers().catch(console.error);
}