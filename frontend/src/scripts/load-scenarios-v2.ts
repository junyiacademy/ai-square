#!/usr/bin/env tsx

/**
 * Load scenarios from language-specific YAML files
 * Updated to handle new file structure
 */

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function loadPBLScenarios() {
  console.log('\n📚 Loading PBL Scenarios...');
  const baseDir = path.join(process.cwd(), 'public', 'pbl_data', 'scenarios');
  
  try {
    const items = await fs.readdir(baseDir);
    const scenarioDirs = [];
    
    // Filter only directories
    for (const item of items) {
      const stat = await fs.stat(path.join(baseDir, item));
      if (stat.isDirectory()) {
        scenarioDirs.push(item);
      }
    }
    
    const scenarios = [];
    
    for (const dir of scenarioDirs) {
      // Try to load English version first, then fallback to any available language
      const scenarioDir = path.join(baseDir, dir);
      const files = await fs.readdir(scenarioDir);
      
      // Find language files - match files like "ai_education_design_en.yaml"
      const langFiles = files.filter(f => f.endsWith('.yaml') && !f.includes('template'));
      console.log(`  Checking ${dir}: found ${langFiles.length} YAML files`);
      if (langFiles.length === 0) {
        console.log(`    No language files found in ${dir}`);
        continue;
      }
      
      // Prefer English, then Chinese, then any
      let selectedFile = langFiles.find(f => f.endsWith('_en.yaml')) ||
                        langFiles.find(f => f.endsWith('_zhTW.yaml')) ||
                        langFiles[0];
      
      const scenarioPath = path.join(scenarioDir, selectedFile);
      
      try {
        const content = await fs.readFile(scenarioPath, 'utf-8');
        const data = yaml.load(content) as any;
        
        if (!data.scenario_info) continue;
        
        const scenario = {
          id: uuidv4(),
          type: 'pbl',
          status: 'active',
          version: '1.0.0',
          difficulty_level: data.scenario_info.difficulty || 'intermediate',
          estimated_minutes: typeof data.scenario_info.estimated_duration === 'number' 
            ? data.scenario_info.estimated_duration 
            : parseInt(String(data.scenario_info.estimated_duration || '60').replace(/[^0-9]/g, '')),
          prerequisites: data.scenario_info.prerequisites || [],
          xp_rewards: { completion: 100 },
          unlock_requirements: {},
          tasks: (data.tasks || []).map((task: any, tIdx: number) => ({
            id: task.id || `task_${tIdx}`,
            type: task.category || 'question',
            title: task.title || task.description || `Task ${tIdx + 1}`,
            order: tIdx,
            content: task
          })),
          ai_modules: data.ai_modules || {},
          resources: [],
          metadata: {
            source: `pbl_data/scenarios/${dir}`,
            scenario_id: dir,
            title: data.scenario_info.title || dir.replace(/_/g, ' '),
            description: data.scenario_info.description || '',
            learning_objectives: data.scenario_info.learning_objectives || [],
            target_domains: data.scenario_info.target_domains || [],
            ksa_mappings: data.ksa_mapping || [],
            tasks_raw: data.tasks || [],
            available_languages: langFiles.map(f => f.match(/_([a-zA-Z]+)\.yaml$/)?.[1]).filter(Boolean)
          }
        };
        
        scenarios.push(scenario);
        console.log(`  ✓ Loaded: ${scenario.metadata.title} (${selectedFile})`);
        
      } catch (error) {
        console.log(`  ⚠️  Error loading ${selectedFile}: ${error}`);
      }
    }
    
    return scenarios;
  } catch (error) {
    console.error('Error loading PBL scenarios:', error);
    return [];
  }
}

async function insertScenarios(scenarios: any[]) {
  let inserted = 0;
  let skipped = 0;
  
  for (const scenario of scenarios) {
    try {
      // Check if scenario already exists by checking metadata->scenario_id
      const existing = await pool.query(
        `SELECT id FROM scenarios WHERE metadata->>'scenario_id' = $1`,
        [scenario.metadata.scenario_id]
      );
      
      if (existing.rows.length > 0) {
        console.log(`  → Skipping existing: ${scenario.metadata.title}`);
        skipped++;
        continue;
      }
      
      await pool.query(`
        INSERT INTO scenarios (
          id, type, status, version, difficulty_level,
          estimated_minutes, prerequisites, xp_rewards,
          unlock_requirements, tasks, ai_modules, resources, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )
      `, [
        scenario.id, scenario.type, scenario.status, scenario.version,
        scenario.difficulty_level, scenario.estimated_minutes,
        JSON.stringify(scenario.prerequisites), JSON.stringify(scenario.xp_rewards),
        JSON.stringify(scenario.unlock_requirements), JSON.stringify(scenario.tasks),
        JSON.stringify(scenario.ai_modules), JSON.stringify(scenario.resources),
        JSON.stringify(scenario.metadata)
      ]);
      
      console.log(`  ✅ Inserted: ${scenario.metadata.title}`);
      inserted++;
      
    } catch (error) {
      console.error(`  ❌ Error inserting ${scenario.metadata.title}:`, error);
    }
  }
  
  return { inserted, skipped };
}

async function main() {
  console.log('🚀 Loading Scenarios into Local Database');
  console.log('=======================================');
  console.log('Database:', process.env.DB_NAME || 'ai_square_db');
  console.log('Host:', process.env.DB_HOST || 'localhost');
  console.log('Port:', process.env.DB_PORT || '5432');
  
  try {
    // Test connection
    const result = await pool.query('SELECT version()');
    console.log('✅ Connected to database');
    
    // Load and insert PBL scenarios
    const pblScenarios = await loadPBLScenarios();
    
    if (pblScenarios.length === 0) {
      console.log('\n⚠️  No scenarios found to load');
      process.exit(0);
    }
    
    console.log('\n📝 Inserting scenarios to database...');
    const results = await insertScenarios(pblScenarios);
    
    // Summary
    console.log('\n📊 Summary');
    console.log('==========');
    const count = await pool.query('SELECT COUNT(*) FROM scenarios');
    console.log(`Total scenarios in database: ${count.rows[0].count}`);
    
    const byType = await pool.query(`
      SELECT type, COUNT(*) as count 
      FROM scenarios 
      GROUP BY type 
      ORDER BY type
    `);
    console.log('\nBy type:');
    byType.rows.forEach(row => {
      console.log(`  ${row.type}: ${row.count}`);
    });
    
    console.log(`\nInserted this run: ${results.inserted}`);
    console.log(`Skipped (existing): ${results.skipped}`);
    
    // List all scenario titles
    const allScenarios = await pool.query(`
      SELECT metadata->>'title' as title, metadata->>'scenario_id' as id
      FROM scenarios
      ORDER BY created_at
    `);
    console.log('\nAll scenarios:');
    allScenarios.rows.forEach(row => {
      console.log(`  - ${row.title} (${row.id})`);
    });
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);