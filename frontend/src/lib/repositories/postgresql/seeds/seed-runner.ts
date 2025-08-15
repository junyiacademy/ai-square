#!/usr/bin/env node

/**
 * Database Seed Runner
 * Executes SQL seed files in order
 * 
 * Usage:
 *   npm run seed                  # Run all seeds
 *   npm run seed:accounts         # Only seed accounts
 *   npm run seed:scenarios        # Only seed scenarios
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get database configuration
function getPoolConfig() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const isCloudSQL = dbHost.startsWith('/cloudsql/');
  
  console.log('🔧 Database Configuration:');
  console.log(`   Host: ${dbHost}`);
  console.log(`   Port: ${process.env.DB_PORT || '5433'}`);
  console.log(`   Database: ${process.env.DB_NAME || 'ai_square_db'}`);
  
  if (isCloudSQL) {
    return {
      host: dbHost,
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    };
  } else {
    return {
      host: dbHost,
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    };
  }
}

// Execute SQL file
async function executeSQLFile(pool: Pool, filePath: string): Promise<void> {
  const fileName = path.basename(filePath);
  console.log(`\n📄 Executing: ${fileName}`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log(`✅ ${fileName} executed successfully`);
  } catch (error) {
    console.error(`❌ Failed to execute ${fileName}:`, error);
    throw error;
  }
}

// Get seed files to run
function getSeedFiles(filter?: string): string[] {
  const seedDir = __dirname;
  const files = fs.readdirSync(seedDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  if (filter === 'accounts') {
    return files.filter(f => f.includes('accounts'));
  } else if (filter === 'scenarios') {
    return files.filter(f => f.includes('scenarios'));
  }
  
  return files;
}

// Main seed function
async function runSeeds() {
  const args = process.argv.slice(2);
  const filter = args[0];
  
  console.log('🌱 Database Seed Runner\n');
  console.log('========================\n');
  
  const pool = new Pool(getPoolConfig());
  
  try {
    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log(`✅ Connected to database at ${testResult.rows[0].now}\n`);
    
    // Check schema version
    const versionResult = await pool.query(
      "SELECT value FROM system_config WHERE key = 'schema_version'"
    ).catch(() => ({ rows: [] }));
    
    if (versionResult.rows.length > 0) {
      console.log(`📌 Schema Version: ${versionResult.rows[0].value}`);
    }
    
    // Get seed files
    const seedFiles = getSeedFiles(filter);
    
    if (seedFiles.length === 0) {
      console.log('⚠️  No seed files found');
      return;
    }
    
    console.log(`\n📦 Found ${seedFiles.length} seed file(s)`);
    
    // Execute each seed file
    for (const file of seedFiles) {
      const filePath = path.join(__dirname, file);
      await executeSQLFile(pool, filePath);
    }
    
    // Verify seeded data
    console.log('\n🔍 Verifying Seeded Data...\n');
    
    const userResult = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      WHERE metadata->>'seeded' = 'true'
      GROUP BY role
      ORDER BY role
    `);
    
    if (userResult.rows.length > 0) {
      console.log('👥 Seeded Users by Role:');
      userResult.rows.forEach(row => {
        console.log(`   ${row.role}: ${row.count}`);
      });
    }
    
    const scenarioResult = await pool.query(`
      SELECT mode, status, COUNT(*) as count
      FROM scenarios
      WHERE source_type = 'seed'
      GROUP BY mode, status
      ORDER BY mode, status
    `);
    
    if (scenarioResult.rows.length > 0) {
      console.log('\n📖 Seeded Scenarios:');
      scenarioResult.rows.forEach(row => {
        console.log(`   ${row.mode} (${row.status}): ${row.count}`);
      });
    }
    
    console.log('\n✨ Seeding completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runSeeds().catch(console.error);
}

export { runSeeds };