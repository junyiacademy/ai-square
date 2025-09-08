import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import path from 'path';
import { promises as fs } from 'fs';
import { parse as yamlParse } from 'yaml';

// Admin key for staging
const ADMIN_KEY = process.env.ADMIN_KEY || 'staging-init-2025';

// Create PostgreSQL connection
function getPool() {
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ai_square_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

export async function POST(request: NextRequest) {
  let pool: Pool | null = null;
  
  try {
    // Check admin key
    const authHeader = request.headers.get('x-admin-key');
    if (authHeader !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action || 'check';
    
    pool = getPool();

    if (action === 'check') {
      // Check current status
      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('scenarios', 'users', 'programs', 'tasks', 'evaluations')
      `);

      const counts = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM scenarios WHERE mode = 'pbl') as pbl_count,
          (SELECT COUNT(*) FROM scenarios WHERE mode = 'assessment') as assessment_count,
          (SELECT COUNT(*) FROM scenarios WHERE mode = 'discovery') as discovery_count,
          (SELECT COUNT(*) FROM users) as user_count
      `).catch(() => ({ rows: [{ pbl_count: 0, assessment_count: 0, discovery_count: 0, user_count: 0 }] }));

      return NextResponse.json({
        success: true,
        tables: tables.rows.map(r => r.table_name),
        counts: counts.rows[0]
      });
    }

    if (action === 'reset-full' || action === 'init-full') {
      if (action === 'reset-full') {
        // Step 0: Clear all existing data
        console.log('Clearing all existing data...');
        await pool.query(`
          TRUNCATE TABLE evaluations, tasks, programs, scenarios, users CASCADE;
        `);
        console.log('Starting fresh initialization...');
      }
      // Step 1: Skip schema creation (already done via Cloud SQL import)
      console.log('Skipping schema creation (already exists)...');

      // Step 2: Load PBL scenarios from YAML files
      console.log('Loading PBL scenarios...');
      const pblDir = path.join(process.cwd(), 'public', 'pbl_data');
      const pblFiles = await fs.readdir(pblDir);
      const pblScenarioFiles = pblFiles.filter(f => f.endsWith('_scenario.yaml'));
      
      let pblCount = 0;
      for (const file of pblScenarioFiles) {
        try {
          const content = await fs.readFile(path.join(pblDir, file), 'utf-8');
          const data = yamlParse(content) as Record<string, unknown>;
          
          // Extract scenario ID from filename
          const scenarioId = file.replace('_scenario.yaml', '');
          
          // Check if scenario already exists
          const existing = await pool.query(
            'SELECT id FROM scenarios WHERE source_id = $1 AND mode = $2',
            [scenarioId, 'pbl']
          );
          
          if (existing.rows.length === 0) {
            // Insert scenario
            await pool.query(`
              INSERT INTO scenarios (
                mode, source_type, source_id, source_path,
                title, description, status,
                objectives, prerequisites, target_audience,
                duration_minutes, difficulty_level,
                pbl_data, task_templates,
                created_at, updated_at
              ) VALUES (
                'pbl', 'yaml', $1, $2,
                $3, $4, 'active',
                $5, $6, $7,
                $8, $9,
                $10, $11,
                NOW(), NOW()
              )
            `, [
              scenarioId,
              `pbl_data/${file}`,
              JSON.stringify({ 
                en: data.title || data.scenario_name || scenarioId,
                zh: data.title_zh || data.title || scenarioId
              }),
              JSON.stringify({ 
                en: data.description || data.scenario_description || 'PBL Scenario',
                zh: data.description_zh || data.description || 'PBL 場景'
              }),
              JSON.stringify(data.learning_objectives || []),
              JSON.stringify(data.prerequisites || []),
              JSON.stringify(data.target_audience || []),
              data.estimated_duration || 60,
              data.difficulty || 'intermediate',
              JSON.stringify(data),
              JSON.stringify(data.stages || [])
            ]);
            pblCount++;
          }
        } catch (error) {
          console.error(`Error loading PBL scenario ${file}:`, error);
        }
      }
      
      console.log(`Loaded ${pblCount} PBL scenarios`);

      // Step 3: Load Assessment scenarios
      console.log('Loading Assessment scenarios...');
      const assessmentDir = path.join(process.cwd(), 'public', 'assessment_data');
      let assessmentCount = 0;
      
      try {
        const assessmentFolders = await fs.readdir(assessmentDir, { withFileTypes: true });
        for (const folder of assessmentFolders.filter(f => f.isDirectory())) {
          try {
            // Look for config file
            const configFile = `${folder.name}_questions_en.yaml`;
            const configPath = path.join(assessmentDir, folder.name, configFile);
            const content = await fs.readFile(configPath, 'utf-8');
            const data = yamlParse(content) as Record<string, unknown>;
            
            // Check if already exists
            const existing = await pool.query(
              'SELECT id FROM scenarios WHERE source_id = $1 AND mode = $2',
              [folder.name, 'assessment']
            );
            
            if (existing.rows.length === 0) {
              await pool.query(`
                INSERT INTO scenarios (
                  mode, source_type, source_id, source_path,
                  title, description, status,
                  duration_minutes, assessment_data,
                  created_at, updated_at
                ) VALUES (
                  'assessment', 'yaml', $1, $2,
                  $3, $4, 'active',
                  $5, $6,
                  NOW(), NOW()
                )
              `, [
                folder.name,
                `assessment_data/${folder.name}/${configFile}`,
                JSON.stringify({ 
                  en: data.title || 'AI Literacy Assessment',
                  zh: data.title_zh || 'AI 素養評估'
                }),
                JSON.stringify({ 
                  en: data.description || 'Assessment for AI literacy competencies',
                  zh: data.description_zh || 'AI 素養能力評估'
                }),
                data.time_limit_minutes || 15,
                JSON.stringify({
                  totalQuestions: data.total_questions || 12,
                  passingScore: data.passing_score || 60,
                  domains: data.domains || [],
                  questionBank: data.questions || []
                })
              ]);
              assessmentCount++;
            }
          } catch (error) {
            console.error(`Error loading assessment ${folder.name}:`, error);
          }
        }
      } catch (error) {
        console.error('Error reading assessment directory:', error);
      }
      
      console.log(`Loaded ${assessmentCount} Assessment scenarios`);

      // Step 4: Load Discovery scenarios
      console.log('Loading Discovery scenarios...');
      const discoveryDir = path.join(process.cwd(), 'public', 'discovery_data');
      let discoveryCount = 0;
      
      try {
        const discoveryFiles = await fs.readdir(discoveryDir);
        const careerFiles = discoveryFiles.filter(f => f.endsWith('_career.yaml'));
        
        for (const file of careerFiles) {
          try {
            const content = await fs.readFile(path.join(discoveryDir, file), 'utf-8');
            const data = yamlParse(content) as Record<string, unknown>;
            const careerId = file.replace('_career.yaml', '');
            
            // Check if exists
            const existing = await pool.query(
              'SELECT id FROM scenarios WHERE source_id = $1 AND mode = $2',
              [careerId, 'discovery']
            );
            
            if (existing.rows.length === 0) {
              await pool.query(`
                INSERT INTO scenarios (
                  mode, source_type, source_id, source_path,
                  title, description, status,
                  duration_minutes, discovery_data,
                  created_at, updated_at
                ) VALUES (
                  'discovery', 'yaml', $1, $2,
                  $3, $4, 'active',
                  $5, $6,
                  NOW(), NOW()
                )
              `, [
                careerId,
                `discovery_data/${file}`,
                JSON.stringify({ 
                  en: data.career_name || careerId,
                  zh: data.career_name_zh || data.career_name || careerId
                }),
                JSON.stringify({ 
                  en: data.description || 'Career exploration path',
                  zh: data.description_zh || data.description || '職業探索路徑'
                }),
                90,
                JSON.stringify({
                  careerType: data.career_type || 'technology',
                  requiredSkills: data.required_skills || [],
                  learningPath: data.learning_path || [],
                  industryInsights: data.industry_insights || {}
                })
              ]);
              discoveryCount++;
            }
          } catch (error) {
            console.error(`Error loading discovery ${file}:`, error);
          }
        }
      } catch (error) {
        console.error('Error reading discovery directory:', error);
      }
      
      console.log(`Loaded ${discoveryCount} Discovery scenarios`);

      // Step 5: Create demo users (using valid roles from schema)
      await pool.query(`
        INSERT INTO users (id, email, password_hash, name, role, email_verified, created_at, updated_at)
        VALUES 
          ('550e8400-e29b-41d4-a716-446655440001', 'student@example.com', '$2b$10$K7L1OJ0TfPALHfRplJNYPOefsVTPLiFve0ic1YYRdRbGhPcDDiliS', 'Demo Student', 'student', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
          ('550e8400-e29b-41d4-a716-446655440002', 'teacher@example.com', '$2b$10$K7L1OJ0TfPALHfRplJNYPOefsVTPLiFve0ic1YYRdRbGhPcDDiliS', 'Demo Teacher', 'teacher', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
          ('550e8400-e29b-41d4-a716-446655440003', 'admin@example.com', '$2b$10$K7L1OJ0TfPALHfRplJNYPOefsVTPLiFve0ic1YYRdRbGhPcDDiliS', 'Demo Admin', 'admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (email) DO NOTHING
      `);

      // Get final counts
      const finalCounts = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM scenarios WHERE mode = 'pbl') as pbl_count,
          (SELECT COUNT(*) FROM scenarios WHERE mode = 'assessment') as assessment_count,
          (SELECT COUNT(*) FROM scenarios WHERE mode = 'discovery') as discovery_count,
          (SELECT COUNT(*) FROM users) as user_count,
          (SELECT COUNT(*) FROM scenarios) as total_scenarios
      `);

      return NextResponse.json({
        success: true,
        message: action === 'reset-full' ? 'Database reset and reinitialized successfully' : 'Database initialized successfully',
        counts: finalCounts.rows[0],
        details: {
          pbl: `${pblCount} scenarios loaded from ${pblScenarioFiles.length} files`,
          assessment: `${assessmentCount} scenarios loaded`,
          discovery: `${discoveryCount} scenarios loaded`
        }
      });
    }

    if (action === 'clear-all') {
      // Clear all data but don't reinitialize
      console.log('Clearing all data only...');
      await pool.query(`
        TRUNCATE TABLE evaluations, tasks, programs, scenarios, users CASCADE;
      `);
      
      return NextResponse.json({
        success: true,
        message: 'Database cleared successfully',
        counts: {
          pbl_count: 0,
          assessment_count: 0,
          discovery_count: 0,
          user_count: 0,
          total_scenarios: 0
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Database init error:', error);
    return NextResponse.json(
      { 
        error: 'Database initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}