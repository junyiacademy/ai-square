/* eslint-disable @typescript-eslint/no-unused-vars */
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
      const selectedFile = langFiles.find(f => f.endsWith('_en.yaml')) ||
                        langFiles.find(f => f.endsWith('_zhTW.yaml')) ||
                        langFiles[0];
      
      const scenarioPath = path.join(scenarioDir, selectedFile);
      
      try {
        const content = await fs.readFile(scenarioPath, 'utf-8');
        const data = yaml.load(content) as any;
        
        if (!data.scenario_info) continue;
        
        const scenario = {
          id: uuidv4(),
          mode: 'pbl',
          status: 'active',
          version: '1.0.0',
          source_type: 'yaml',
          source_path: `pbl_data/scenarios/${dir}/${selectedFile}`,
          source_id: dir,
          source_metadata: {
            available_languages: langFiles.map(f => f.match(/_([a-zA-Z]+)\.yaml$/)?.[1]).filter(Boolean)
          },
          title: { en: data.scenario_info.title || dir.replace(/_/g, ' ') },
          description: { en: data.scenario_info.description || '' },
          objectives: data.scenario_info.learning_objectives || [],
          difficulty: data.scenario_info.difficulty || 'intermediate',
          estimated_minutes: typeof data.scenario_info.estimated_duration === 'number' 
            ? data.scenario_info.estimated_duration 
            : parseInt(String(data.scenario_info.estimated_duration || '60').replace(/[^0-9]/g, '')),
          prerequisites: data.scenario_info.prerequisites || [],
          task_templates: (data.tasks || []).map((task: any, tIdx: number) => ({
            id: task.id || `task_${tIdx}`,
            type: task.category || 'interactive',
            title: task.title || task.description || `Task ${tIdx + 1}`,
            order: tIdx,
            content: task
          })),
          xp_rewards: { completion: 100 },
          unlock_requirements: {},
          pbl_data: {
            ksaMapping: data.ksa_mapping || [],
            aiMentorGuidelines: data.ai_modules || {}
          },
          discovery_data: {},
          assessment_data: {},
          ai_modules: data.ai_modules || {},
          resources: [],
          metadata: {
            source: `pbl_data/scenarios/${dir}`,
            scenario_id: dir,
            tasks_raw: data.tasks || []
          }
        };
        
        scenarios.push(scenario);
        console.log(`  ✓ Loaded: ${scenario.title.en} (${selectedFile})`);
        
      } catch (_error) {
        console.log(`  ⚠️  Error loading ${selectedFile}: ${error}`);
      }
    }
    
    return scenarios;
  } catch (_error) {
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
        console.log(`  → Skipping existing: ${scenario.title.en}`);
        skipped++;
        continue;
      }
      
      await pool.query(`
        INSERT INTO scenarios (
          id, mode, status, version, source_type, source_path, source_id, source_metadata,
          title, description, objectives, difficulty, estimated_minutes, prerequisites,
          task_templates, xp_rewards, unlock_requirements, 
          pbl_data, discovery_data, assessment_data, ai_modules, resources, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        )
      `, [
        scenario.id, scenario.mode, scenario.status, scenario.version,
        scenario.source_type, scenario.source_path, scenario.source_id, JSON.stringify(scenario.source_metadata),
        JSON.stringify(scenario.title), JSON.stringify(scenario.description), JSON.stringify(scenario.objectives),
        scenario.difficulty, scenario.estimated_minutes, JSON.stringify(scenario.prerequisites),
        JSON.stringify(scenario.task_templates), JSON.stringify(scenario.xp_rewards), JSON.stringify(scenario.unlock_requirements),
        JSON.stringify(scenario.pbl_data), JSON.stringify(scenario.discovery_data), JSON.stringify(scenario.assessment_data),
        JSON.stringify(scenario.ai_modules), JSON.stringify(scenario.resources), JSON.stringify(scenario.metadata)
      ]);
      
      console.log(`  ✅ Inserted: ${scenario.title.en}`);
      inserted++;
      
    } catch (_error) {
      console.error(`  ❌ Error inserting ${scenario.title.en}:`, error);
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
    await pool.query('SELECT version()');
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
    
    const byMode = await pool.query(`
      SELECT mode, COUNT(*) as count 
      FROM scenarios 
      GROUP BY mode 
      ORDER BY mode
    `);
    console.log('\nBy mode:');
    byMode.rows.forEach(row => {
      console.log(`  ${row.mode}: ${row.count}`);
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
    
  } catch (_error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);