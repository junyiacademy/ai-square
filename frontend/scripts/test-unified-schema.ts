/**
 * Test script for unified schema
 * Run with: npx tsx scripts/test-unified-schema.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function testUnifiedSchema() {
  console.log('🧪 Testing Unified Schema...\n');

  try {
    // 1. Create test user
    console.log('1️⃣ Creating test user...');
    const userResult = await pool.query(`
      INSERT INTO users (email, name, preferred_language, level, total_xp)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, email, name
    `, ['test@unified-schema.com', 'Schema Test User', 'en', 1, 0]);
    
    const userId = userResult.rows[0].id;
    console.log('✅ User created:', userResult.rows[0]);

    // 2. Create scenarios for each mode
    console.log('\n2️⃣ Creating scenarios for all modes...');
    
    // PBL Scenario
    const pblScenarioResult = await pool.query(`
      INSERT INTO scenarios (
        mode, status, version,
        source_type, source_path, source_id, source_metadata,
        title, description, objectives,
        difficulty, estimated_minutes,
        task_templates, pbl_data, ai_modules
      ) VALUES (
        'pbl', 'active', '1.0.0',
        'yaml', 'pbl_data/test-scenario.yaml', 'pbl-test-scenario', $1,
        $2, $3, $4,
        'intermediate', 45,
        $5, $6, $7
      ) RETURNING id, mode, source_id, title->>'en' as title
    `, [
      JSON.stringify({ originalId: 'test-scenario', pbl: { yamlId: 'test-scenario' } }),
      JSON.stringify({ en: 'Test PBL Scenario', zh: '測試 PBL 情境' }),
      JSON.stringify({ en: 'Test scenario for unified schema', zh: '統一架構測試情境' }),
      JSON.stringify(['Learn unified architecture', 'Practice with new schema']),
      JSON.stringify([
        { id: 'task1', title: 'Understand Schema', type: 'analysis', description: 'Analyze the new schema' },
        { id: 'task2', title: 'Practice Queries', type: 'creation', description: 'Write SQL queries' }
      ]),
      JSON.stringify({
        ksaMapping: {
          knowledge: ['K1.1', 'K2.1'],
          skills: ['S1.1', 'S2.2'],
          attitudes: ['A1.1']
        }
      }),
      JSON.stringify({
        mentor: { role: 'database_expert', persona: 'Experienced DBA' }
      })
    ]);
    console.log('✅ PBL Scenario created:', pblScenarioResult.rows[0]);

    // Discovery Scenario
    const discoveryScenarioResult = await pool.query(`
      INSERT INTO scenarios (
        mode, status, version,
        source_type, source_path, source_id, source_metadata,
        title, description, objectives,
        difficulty, estimated_minutes,
        task_templates, discovery_data
      ) VALUES (
        'discovery', 'active', '1.0.0',
        'yaml', 'discovery_data/test-career/path.yaml', 'discovery-test-career', $1,
        $2, $3, $4,
        'beginner', 90,
        $5, $6
      ) RETURNING id, mode, source_id, title->>'en' as title
    `, [
      JSON.stringify({ originalId: 'test-career', discovery: { careerType: 'test_developer' } }),
      JSON.stringify({ en: 'Test Developer Journey', zh: '測試開發者之旅' }),
      JSON.stringify({ en: 'Explore test development', zh: '探索測試開發' }),
      JSON.stringify(['Master testing basics', 'Build test portfolio']),
      JSON.stringify([
        { id: 'explore1', title: 'First Test Suite', type: 'exploration', description: 'Create your first test' },
        { id: 'challenge1', title: 'Coverage Challenge', type: 'challenge', description: 'Achieve 90% coverage' }
      ]),
      JSON.stringify({
        careerInfo: { avgSalary: '$75,000', demandLevel: 'high' },
        skillTree: { core: ['Unit Testing', 'Integration Testing'], advanced: ['Performance Testing'] },
        xpRewards: { completion: 150, challenge: 75 }
      })
    ]);
    console.log('✅ Discovery Scenario created:', discoveryScenarioResult.rows[0]);

    // Assessment Scenario
    const assessmentScenarioResult = await pool.query(`
      INSERT INTO scenarios (
        mode, status, version,
        source_type, source_path, source_id, source_metadata,
        title, description, objectives,
        difficulty, estimated_minutes,
        task_templates, assessment_data
      ) VALUES (
        'assessment', 'active', '1.0.0',
        'yaml', 'assessment_data/test-assessment/config.yml', 'assessment-test-quiz', $1,
        $2, $3, $4,
        'intermediate', 20,
        $5, $6
      ) RETURNING id, mode, source_id, title->>'en' as title
    `, [
      JSON.stringify({ originalId: 'test-quiz', assessment: { assessmentType: 'quiz' } }),
      JSON.stringify({ en: 'Schema Knowledge Quiz', zh: '架構知識測驗' }),
      JSON.stringify({ en: 'Test your schema knowledge', zh: '測試你的架構知識' }),
      JSON.stringify(['Assess understanding', 'Identify gaps']),
      JSON.stringify([
        { id: 'q1', title: 'What is ENUM?', type: 'question', question: 'What is PostgreSQL ENUM?' },
        { id: 'q2', title: 'JSONB vs JSON', type: 'question', question: 'Difference between JSONB and JSON?' }
      ]),
      JSON.stringify({
        questionBank: { total: 10, byDomain: { technical: 10 } },
        scoringRubric: { passingScore: 60, excellentScore: 85 }
      })
    ]);
    console.log('✅ Assessment Scenario created:', assessmentScenarioResult.rows[0]);

    // 3. Create programs for each scenario
    console.log('\n3️⃣ Creating programs...');
    
    const programResults = await Promise.all([
      pool.query(`
        INSERT INTO programs (
          user_id, scenario_id, status, total_task_count,
          pbl_data
        ) VALUES ($1, $2, 'active', 2, $3)
        RETURNING id, scenario_id
      `, [userId, pblScenarioResult.rows[0].id, JSON.stringify({ notes: [] })]),
      
      pool.query(`
        INSERT INTO programs (
          user_id, scenario_id, status, total_task_count,
          discovery_data, xp_earned
        ) VALUES ($1, $2, 'active', 2, $3, 0)
        RETURNING id, scenario_id
      `, [userId, discoveryScenarioResult.rows[0].id, JSON.stringify({ path: [] })]),
      
      pool.query(`
        INSERT INTO programs (
          user_id, scenario_id, status, total_task_count,
          assessment_data
        ) VALUES ($1, $2, 'active', 2, $3)
        RETURNING id, scenario_id
      `, [userId, assessmentScenarioResult.rows[0].id, JSON.stringify({ answers: {} })])
    ]);

    console.log('✅ Programs created:', programResults.map(r => r.rows[0].id));

    // 4. Create tasks
    console.log('\n4️⃣ Creating tasks...');
    
    // PBL Tasks
    await pool.query(`
      INSERT INTO tasks (
        program_id, task_index, title, description, type, status,
        content, pbl_data
      ) VALUES 
      ($1, 0, 'Schema Analysis', 'Analyze the unified schema', 'analysis', 'active',
       $2, $3)
    `, [
      programResults[0].rows[0].id,
      JSON.stringify({ instructions: 'Review and analyze the new unified schema structure' }),
      JSON.stringify({ ksaFocus: { primary: ['K1.1'], secondary: ['S1.1'] } })
    ]);

    // Discovery Tasks
    await pool.query(`
      INSERT INTO tasks (
        program_id, task_index, title, description, type, status,
        content, discovery_data
      ) VALUES 
      ($1, 0, 'Explore Testing', 'Explore testing frameworks', 'exploration', 'active',
       $2, $3)
    `, [
      programResults[1].rows[0].id,
      JSON.stringify({ instructions: 'Explore Jest, Vitest, and Playwright' }),
      JSON.stringify({ skillRequirements: { testing: 1, programming: 2 } })
    ]);

    // Assessment Tasks
    await pool.query(`
      INSERT INTO tasks (
        program_id, task_index, title, description, type, status,
        content, assessment_data, time_limit_seconds
      ) VALUES 
      ($1, 0, 'ENUM Question', 'Answer about PostgreSQL ENUM', 'question', 'active',
       $2, $3, 120)
    `, [
      programResults[2].rows[0].id,
      JSON.stringify({ 
        question: 'What is the main benefit of using ENUM in PostgreSQL?',
        options: ['Type safety', 'Faster queries', 'Less storage', 'Better joins']
      }),
      JSON.stringify({ correctAnswer: 0 })
    ]);

    console.log('✅ Tasks created for all programs');

    // 5. Test queries
    console.log('\n5️⃣ Testing queries...');

    // Query scenarios with source info
    const scenariosWithSource = await pool.query(`
      SELECT 
        mode,
        source_type,
        source_path,
        source_id,
        title->>'en' as title,
        difficulty,
        task_count
      FROM scenarios
      ORDER BY mode
    `);
    console.log('\n📊 Scenarios with source info:');
    console.table(scenariosWithSource.rows);

    // Query programs with mode-specific data
    const programsWithData = await pool.query(`
      SELECT 
        p.id,
        s.mode,
        p.status,
        p.total_task_count,
        p.xp_earned,
        CASE 
          WHEN s.mode = 'pbl' THEN p.pbl_data
          WHEN s.mode = 'discovery' THEN p.discovery_data
          WHEN s.mode = 'assessment' THEN p.assessment_data
        END as mode_data
      FROM programs p
      JOIN scenarios s ON p.scenario_id = s.id
      WHERE p.user_id = $1
    `, [userId]);
    console.log('\n📊 Programs with mode-specific data:');
    console.table(programsWithData.rows);

    // Test computed fields
    const computedFields = await pool.query(`
      SELECT 
        task_count,
        jsonb_array_length(task_templates) as calculated_count
      FROM scenarios
    `);
    console.log('\n📊 Computed fields test:');
    console.table(computedFields.rows);

    // Test ENUM types
    const enumTypes = await pool.query(`
      SELECT 
        t.typname as type_name,
        string_agg(e.enumlabel::text, ', ' ORDER BY e.enumsortorder) as values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname IN ('learning_mode', 'task_type', 'difficulty_level')
      GROUP BY t.typname
    `);
    console.log('\n📊 ENUM types:');
    enumTypes.rows.forEach(row => {
      console.log(`${row.type_name}: ${row.values}`);
    });

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testUnifiedSchema().catch(console.error);