/**
 * Sync PBL scenarios from YAML files to database
 * This ensures the unified architecture has all necessary data
 */

import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

interface YAMLScenario {
  scenario_info: {
    id: string;
    title: string;
    description: string;
    difficulty?: string;
    estimated_duration?: number;
    learning_objectives?: string[];
    target_domains?: string[];
    prerequisites?: string[];
  };
  ksa_mapping?: {
    knowledge?: string[];
    skills?: string[];
    attitudes?: string[];
  };
  tasks?: Array<{
    id: string;
    title: string;
    description: string;
    category?: string;
    type?: string;
    time_limit?: number;
    instructions?: string[];
    expected_outcome?: string;
    KSA_focus?: {
      primary?: string[];
      secondary?: string[];
    };
  }>;
}

async function loadYAMLFile(filePath: string): Promise<YAMLScenario | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return yaml.load(content) as YAMLScenario;
  } catch (_error) {
    console.error(`Failed to load ${filePath}:`, error);
    return null;
  }
}

async function syncPBLScenarios() {
  // Create database connection
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'ai_square_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  });

  try {
    console.log('🔄 Starting PBL scenarios sync...');
    
    // Get list of PBL scenario files
    const pblDataPath = resolve(process.cwd(), 'public/pbl_data/scenarios');
    const scenarioDirs = await fs.readdir(pblDataPath);
    
    let syncedCount = 0;
    
    for (const dir of scenarioDirs) {
      const dirPath = resolve(pblDataPath, dir);
      const stat = await fs.stat(dirPath);
      
      if (!stat.isDirectory()) continue;
      
      // Look for English YAML file first
      const enYamlPath = resolve(dirPath, `${dir}_en.yaml`);
      const scenario = await loadYAMLFile(enYamlPath);
      
      if (!scenario) {
        console.log(`⚠️  No English YAML found for ${dir}, skipping...`);
        continue;
      }
      
      const scenarioInfo = scenario.scenario_info;
      console.log(`📄 Processing scenario: ${scenarioInfo.id}`);
      
      // Check if scenario already exists
      const existingResult = await pool.query(
        'SELECT id FROM scenarios WHERE source_id = $1 AND mode = $2',
        [scenarioInfo.id, 'pbl']
      );
      
      if (existingResult.rows.length > 0) {
        console.log(`✅ Scenario ${scenarioInfo.id} already exists, skipping...`);
        continue;
      }
      
      // Create task templates
      const taskTemplates = (scenario.tasks || []).map((task, index) => ({
        id: task.id,
        title: { en: task.title },
        description: { en: task.description },
        type: task.type || task.category || 'analysis',
        estimatedTime: task.time_limit || 30,
        instructions: task.instructions || [],
        expectedOutcome: task.expected_outcome || '',
        order: index,
        ksaFocus: task.KSA_focus || {}
      }));
      
      // Ensure we have valid title and description
      const title = scenarioInfo.title || `PBL Scenario: ${scenarioInfo.id || dir}`;
      const description = scenarioInfo.description || `A problem-based learning scenario focused on real-world AI applications.`;
      
      // Insert scenario
      const insertResult = await pool.query(`
        INSERT INTO scenarios (
          mode, source_type, source_id, status,
          title, description, objectives,
          difficulty, estimated_minutes,
          task_templates, 
          pbl_data,
          metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        ) RETURNING id
      `, [
        'pbl',                                    // mode
        'yaml',                                   // source_type
        scenarioInfo.id || dir,                   // source_id
        'active',                                 // status
        JSON.stringify({ en: title }),            // title
        JSON.stringify({ en: description }),      // description
        JSON.stringify(scenarioInfo.learning_objectives || []), // objectives
        scenarioInfo.difficulty || 'intermediate', // difficulty
        scenarioInfo.estimated_duration || 60,     // estimated_minutes
        JSON.stringify(taskTemplates),            // task_templates
        JSON.stringify({                          // pbl_data
          targetDomains: scenarioInfo.target_domains || [],
          ksaMapping: scenario.ksa_mapping || {},
          prerequisites: scenarioInfo.prerequisites || []
        }),
        JSON.stringify({                          // metadata
          yamlId: scenarioInfo.id || dir,
          targetDomains: scenarioInfo.target_domains || [],
          estimatedDuration: scenarioInfo.estimated_duration || 60
        })
      ]);
      
      console.log(`✅ Created scenario ${scenarioInfo.id} with UUID: ${insertResult.rows[0].id}`);
      syncedCount++;
    }
    
    console.log(`\n✅ Sync completed! ${syncedCount} scenarios added to database.`);
    
    // Verify the results
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM scenarios WHERE mode = $1',
      ['pbl']
    );
    
    console.log(`📊 Total PBL scenarios in database: ${countResult.rows[0].count}`);
    
  } catch (_error) {
    console.error('❌ Error syncing scenarios:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the sync
syncPBLScenarios().catch(console.error);