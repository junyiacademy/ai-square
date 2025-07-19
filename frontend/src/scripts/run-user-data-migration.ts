#!/usr/bin/env tsx
/**
 * Run User Data Table Migration
 * 執行用戶資料表遷移
 */

import { Pool } from 'pg';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../../.env.local') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  console.log('🚀 Running User Data Table Migration\n');
  
  const client = await pool.connect();
  
  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'create-user-data-tables.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    console.log('📝 Executing migration SQL...\n');
    
    // Execute the migration
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify tables were created
    const verifyQuery = `
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public' 
        AND table_name IN ('assessment_sessions', 'user_badges', 'user_latest_assessment_view', 'user_badges_summary_view')
      ORDER BY table_name;
    `;
    
    const result = await client.query(verifyQuery);
    
    console.log('📊 Created objects:');
    result.rows.forEach(row => {
      const icon = row.table_type === 'BASE TABLE' ? '📋' : '👁️';
      console.log(`${icon} ${row.table_name} (${row.table_type})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});