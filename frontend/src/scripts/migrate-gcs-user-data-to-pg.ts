#!/usr/bin/env tsx
/**
 * Migrate GCS User Data to PostgreSQL
 * 將 GCS 中的用戶資料遷移到 PostgreSQL
 */

import { Pool } from 'pg';
import { Storage } from '@google-cloud/storage';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../../.env.local') });

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GCS setup
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucketName = process.env.GCS_BUCKET_NAME || process.env.GCS_BUCKET_NAME_V2 || 'ai-square-db-v2';
const bucket = storage.bucket(bucketName);

interface GCSUserData {
  id: string;
  userId: string;
  userEmail?: string;
  assessmentResults?: {
    tech: number;
    creative: number;
    business: number;
  } | null;
  achievements: {
    badges: Array<{
      id: string;
      name: string;
      description: string;
      imageUrl?: string;
      unlockedAt: string;
      category: string;
      xpReward: number;
    }>;
    totalXp: number;
    level: number;
    completedTasks: string[];
    achievements?: Array<{
      id: string;
      name: string;
      description: string;
      xpReward: number;
      earnedAt?: string;
    }>;
  };
  assessmentSessions: Array<{
    id: string;
    createdAt: string;
    results: {
      tech: number;
      creative: number;
      business: number;
    };
    answers?: Record<string, string[]>;
    generatedPaths?: string[];
  }>;
  lastUpdated: string;
  version: string;
}

interface MigrationResult {
  email: string;
  success: boolean;
  error?: string;
  details?: {
    userId?: string;
    sessionsCreated?: number;
    badgesCreated?: number;
  };
}

const results: MigrationResult[] = [];

async function listGCSUserDataFiles(): Promise<string[]> {
  console.log('📂 Listing GCS user data files...');
  console.log(`   Bucket: ${bucketName}`);
  console.log(`   Prefix: user_data/`);
  
  try {
    const [files] = await bucket.getFiles({
      prefix: 'user_data/',
      delimiter: '/'
    });
    
    const userFiles = files
      .filter(file => file.name.endsWith('.json'))
      .map(file => file.name);
    
    console.log(`Found ${userFiles.length} user data files`);
    return userFiles;
  } catch (error) {
    console.error('❌ Error listing GCS files:', error);
    // Check if bucket exists
    if ((error as { code: number }).code === 404) {
      console.log('   Bucket does not exist or no access');
      console.log('   This is expected if GCS was never used for user data');
    }
    return [];
  }
}

async function loadGCSUserData(filePath: string): Promise<GCSUserData | null> {
  try {
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    
    if (!exists) {
      console.log(`⚠️  File not found: ${filePath}`);
      return null;
    }
    
    const [contents] = await file.download();
    return JSON.parse(contents.toString());
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error);
    return null;
  }
}

async function migrateUserData(userData: GCSUserData): Promise<MigrationResult> {
  const email = userData.userEmail || userData.userId;
  
  // In dry-run mode, just simulate the migration
  if (isDryRun) {
    console.log(`   📧 Email: ${email}`);
    console.log(`   📊 Assessment Sessions: ${userData.assessmentSessions?.length || 0}`);
    console.log(`   🏆 Badges: ${userData.achievements?.badges?.length || 0}`);
    console.log(`   🎯 Achievements: ${userData.achievements?.achievements?.length || 0}`);
    
    return {
      email,
      success: true,
      details: {
        userId: 'dry-run-id',
        sessionsCreated: userData.assessmentSessions?.length || 0,
        badgesCreated: userData.achievements?.badges?.length || 0
      }
    };
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Find or create user
    const userQuery = `
      INSERT INTO users (email, name, preferred_language, level, total_xp)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET
        level = GREATEST(users.level, EXCLUDED.level),
        total_xp = GREATEST(users.total_xp, EXCLUDED.total_xp)
      RETURNING id
    `;
    
    const userResult = await client.query(userQuery, [
      email,
      email.split('@')[0], // Default name from email
      'en', // Default language
      userData.achievements?.level || 1,
      userData.achievements?.totalXp || 0
    ]);
    
    const userId = userResult.rows[0].id;
    
    // 2. Migrate assessment sessions
    let sessionsCreated = 0;
    if (userData.assessmentSessions && userData.assessmentSessions.length > 0) {
      for (const session of userData.assessmentSessions) {
        const sessionQuery = `
          INSERT INTO assessment_sessions (
            user_id, session_key, tech_score, creative_score, business_score, 
            answers, generated_paths, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT DO NOTHING
        `;
        
        await client.query(sessionQuery, [
          userId,
          session.id,
          session.results.tech,
          session.results.creative,
          session.results.business,
          JSON.stringify(session.answers || {}),
          JSON.stringify(session.generatedPaths || []),
          session.createdAt
        ]);
        sessionsCreated++;
      }
    }
    
    // 3. Migrate badges
    let badgesCreated = 0;
    if (userData.achievements?.badges && userData.achievements.badges.length > 0) {
      for (const badge of userData.achievements.badges) {
        const badgeQuery = `
          INSERT INTO user_badges (
            user_id, badge_id, name, description, image_url, 
            category, xp_reward, unlocked_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (user_id, badge_id) DO NOTHING
        `;
        
        await client.query(badgeQuery, [
          userId,
          badge.id,
          badge.name,
          badge.description || '',
          badge.imageUrl,
          badge.category || 'learning',
          badge.xpReward || 0,
          badge.unlockedAt
        ]);
        badgesCreated++;
      }
    }
    
    // 4. Migrate achievements to the achievements system if needed
    if (userData.achievements?.achievements && userData.achievements.achievements.length > 0) {
      for (const achievement of userData.achievements.achievements) {
        // First ensure the achievement exists
        const achQuery = `
          INSERT INTO achievements (code, achievement_type, xp_reward, criteria)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (code) DO NOTHING
          RETURNING id
        `;
        
        await client.query(achQuery, [
          achievement.id,
          'legacy',
          achievement.xpReward || 0,
          JSON.stringify({ name: achievement.name, description: achievement.description })
        ]);
        
        // Then link to user
        const userAchQuery = `
          INSERT INTO user_achievements (user_id, achievement_id, earned_at)
          SELECT $1, id, $2
          FROM achievements
          WHERE code = $3
          ON CONFLICT DO NOTHING
        `;
        
        await client.query(userAchQuery, [
          userId,
          achievement.earnedAt || userData.lastUpdated,
          achievement.id
        ]);
      }
    }
    
    await client.query('COMMIT');
    
    return {
      email,
      success: true,
      details: {
        userId,
        sessionsCreated,
        badgesCreated
      }
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    return {
      email,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    client.release();
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\nTotal Users: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ FAILED MIGRATIONS:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`\n- ${r.email}`);
      if (r.error) console.log(`  Error: ${r.error}`);
    });
  }
  
  console.log('\n✅ SUCCESSFUL MIGRATIONS:');
  results.filter(r => r.success).forEach(r => {
    console.log(`\n- ${r.email}`);
    if (r.details) {
      console.log(`  Sessions: ${r.details.sessionsCreated || 0}`);
      console.log(`  Badges: ${r.details.badgesCreated || 0}`);
    }
  });
}

async function main() {
  console.log('🚀 Starting GCS to PostgreSQL User Data Migration\n');
  
  try {
    // List all user data files
    const userFiles = await listGCSUserDataFiles();
    
    if (userFiles.length === 0) {
      console.log('⚠️  No user data files found in GCS');
      return;
    }
    
    console.log(`\n📦 Processing ${userFiles.length} user files...\n`);
    
    // Process each user file
    for (const filePath of userFiles) {
      console.log(`\n📄 Processing: ${filePath}`);
      
      const userData = await loadGCSUserData(filePath);
      if (!userData) {
        console.log('⚠️  Skipping - failed to load data');
        continue;
      }
      
      const result = await migrateUserData(userData);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ Migrated successfully`);
      } else {
        console.log(`❌ Migration failed: ${result.error}`);
      }
    }
    
  } catch (error) {
    console.error('\n💥 Critical error during migration:', error);
  } finally {
    await printSummary();
    await pool.end();
  }
}

// Add dry run option
const isDryRun = process.argv.includes('--dry-run');
if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No actual migration will be performed\n');
}

// Run migration
main().catch(console.error);