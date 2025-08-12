#!/usr/bin/env npx tsx
/**
 * Initialize Assessment scenarios in staging database
 * This script loads assessment questions from YAML files into the database
 */

import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Staging database configuration
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function initAssessmentScenarios() {
  console.log('🚀 Initializing Assessment scenarios in database...\n');
  console.log('Database config:', {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || '5433',
    database: process.env.DB_NAME || 'ai_square_db'
  });

  try {
    // Check existing assessment scenarios
    const existing = await pool.query(`
      SELECT id, source_id, (title::jsonb)->>'en' as title_en
      FROM scenarios 
      WHERE mode = 'assessment' AND source_id = 'ai_literacy'
    `);

    if (existing.rows.length > 0) {
      console.log('⚠️  AI Literacy assessment already exists, updating...');
      
      // Load the YAML file
      const yamlPath = 'public/assessment_data/ai_literacy/ai_literacy_questions_en.yaml';
      const yamlContent = readFileSync(yamlPath, 'utf8');
      const data = parse(yamlContent);

      // Prepare assessment_data with questions
      const assessmentData = {
        assessmentType: 'ai_literacy',
        totalQuestions: data.assessment_config.total_questions,
        timeLimitMinutes: data.assessment_config.time_limit_minutes,
        passingScore: data.assessment_config.passing_score,
        domains: data.assessment_config.domains,
        // Include the actual questions from tasks
        questionBank: data.tasks.map((task: any) => ({
          id: task.id,
          domain: task.domain,
          questions: task.questions.map((q: any) => ({
            id: q.id,
            text: q.text,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            ksa_codes: q.ksa_codes
          }))
        }))
      };

      // Update existing scenario
      await pool.query(`
        UPDATE scenarios 
        SET assessment_data = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [
        JSON.stringify(assessmentData),
        existing.rows[0].id
      ]);

      console.log('✅ Updated existing AI Literacy assessment with questions');
      console.log(`  📚 Question banks: ${assessmentData.questionBank.length}`);
      console.log(`  ❓ Total questions: ${assessmentData.totalQuestions}`);

    } else {
      console.log('Creating new AI Literacy assessment scenario...');
      
      // Load the YAML file
      const yamlPath = 'public/assessment_data/ai_literacy/ai_literacy_questions_en.yaml';
      const yamlContent = readFileSync(yamlPath, 'utf8');
      const data = parse(yamlContent);

      const scenarioId = uuidv4();
      
      // Prepare multilingual title and description
      const title = { en: 'AI Literacy Assessment' };
      const description = { en: 'Test your understanding of AI concepts and applications' };

      // Convert tasks to task templates
      const taskTemplates = [{
        id: 'assessment-task',
        title: { en: 'Complete Assessment' },
        type: 'question'
      }];

      // Prepare assessment_data with questions
      const assessmentData = {
        assessmentType: 'ai_literacy',
        totalQuestions: data.assessment_config.total_questions,
        timeLimitMinutes: data.assessment_config.time_limit_minutes,
        passingScore: data.assessment_config.passing_score,
        domains: data.assessment_config.domains,
        // Include the actual questions from tasks
        questionBank: data.tasks.map((task: any) => ({
          id: task.id,
          domain: task.domain,
          questions: task.questions.map((q: any) => ({
            id: q.id,
            text: q.text,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            ksa_codes: q.ksa_codes
          }))
        }))
      };

      // Insert scenario
      await pool.query(`
        INSERT INTO scenarios (
          id, mode, status, version,
          source_type, source_path, source_id,
          source_metadata,
          title, description, objectives,
          difficulty, estimated_minutes, prerequisites,
          task_templates,
          xp_rewards, unlock_requirements,
          pbl_data, discovery_data, assessment_data,
          ai_modules, resources,
          created_at, updated_at, metadata
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7,
          $8,
          $9, $10, $11,
          $12, $13, $14,
          $15,
          $16, $17,
          $18, $19, $20,
          $21, $22,
          NOW(), NOW(), $23
        )
      `, [
        scenarioId,                                    // id
        'assessment',                                  // mode
        'active',                                      // status
        '1.0',                                        // version
        'yaml',                                       // source_type
        'assessment_data/ai_literacy',               // source_path
        'ai_literacy',                                // source_id
        JSON.stringify({                             // source_metadata
          configPath: yamlPath,
          assessmentName: 'ai_literacy',
          assessmentType: 'standard'
        }),
        JSON.stringify(title),                        // title
        JSON.stringify(description),                  // description
        JSON.stringify([                             // objectives
          'Evaluate AI knowledge',
          'Identify strengths and gaps',
          'Get personalized recommendations'
        ]),
        'intermediate',                               // difficulty
        data.assessment_config.time_limit_minutes,   // estimated_minutes
        JSON.stringify([]),                          // prerequisites
        JSON.stringify(taskTemplates),               // task_templates
        JSON.stringify({ completion: 50 }),          // xp_rewards
        JSON.stringify({}),                          // unlock_requirements
        JSON.stringify({}),                          // pbl_data
        JSON.stringify({}),                          // discovery_data
        JSON.stringify(assessmentData),              // assessment_data (with questions!)
        JSON.stringify({}),                          // ai_modules
        JSON.stringify([]),                          // resources
        JSON.stringify({})                           // metadata
      ]);

      console.log(`✅ Created: AI Literacy Assessment`);
      console.log(`  📚 Question banks: ${assessmentData.questionBank.length}`);
      console.log(`  ❓ Total questions: ${assessmentData.totalQuestions}`);
      console.log(`  ⏱️  Time limit: ${assessmentData.timeLimitMinutes} minutes`);
    }

    // Check total scenarios
    const result = await pool.query('SELECT COUNT(*) FROM scenarios WHERE mode = $1', ['assessment']);
    console.log(`\n✅ Assessment scenarios initialized successfully!`);
    console.log(`Total Assessment scenarios in database: ${result.rows[0].count}\n`);

  } catch (error) {
    console.error('❌ Error initializing assessment scenarios:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the initialization
initAssessmentScenarios();