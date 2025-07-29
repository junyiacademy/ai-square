import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'yaml';
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'ai_square_db',
  user: 'postgres',
  password: 'postgres'
});

interface AssessmentYAML {
  assessment_config: any;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    time_limit_minutes: number;
    questions: Array<{
      id: string;
      domain: string;
      difficulty: string;
      type: string;
      correct_answer: string;
      question: string;
      options: Record<string, string>;
      explanation: string;
      ksa_mapping?: any;
    }>;
  }>;
}

async function directUpdateTaskTemplates() {
  console.log('🚀 Direct update of Assessment task_templates...');
  
  try {
    // Load English YAML as base
    const filePath = resolve('public/assessment_data/ai_literacy/ai_literacy_questions_en.yaml');
    const content = readFileSync(filePath, 'utf8');
    const yamlData = parse(content) as AssessmentYAML;
    
    console.log(`📋 Loaded ${yamlData.tasks.length} tasks from YAML`);
    
    // Prepare task templates with full question data
    const taskTemplates = yamlData.tasks.map(task => ({
      id: task.id,
      type: 'question',
      title: task.title,
      description: task.description,
      instructions: task.description,
      context: {
        timeLimit: task.time_limit_minutes * 60,
        questionCount: task.questions.length,
        domain: task.id
      },
      content: {
        questions: task.questions
      }
    }));
    
    console.log(`📊 Prepared ${taskTemplates.length} task templates`);
    console.log(`   Total questions: ${taskTemplates.reduce((sum, t) => sum + t.content.questions.length, 0)}`);
    
    // Update the scenario with configPath
    const updateQuery = `
      UPDATE scenarios
      SET task_templates = $1::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = '75cbb8d3-6d3d-4220-9b0c-7a12e4f3e0ad'
      RETURNING id, jsonb_array_length(task_templates) as task_count
    `;
    
    const result = await pool.query(updateQuery, [JSON.stringify(taskTemplates)]);
    
    if (result.rows.length > 0) {
      console.log(`✅ Updated scenario: ${result.rows[0].id}`);
      console.log(`   Task count: ${result.rows[0].task_count}`);
      
      // Verify the update
      const verifyQuery = `
        SELECT 
          task_templates->0->>'title' as first_task_title,
          task_templates->0->'content'->'questions'->0->>'question' as first_question
        FROM scenarios 
        WHERE id = '75cbb8d3-6d3d-4220-9b0c-7a12e4f3e0ad'
      `;
      
      const verifyResult = await pool.query(verifyQuery);
      if (verifyResult.rows.length > 0) {
        console.log(`\n✅ Verification successful:`);
        console.log(`   First task: ${verifyResult.rows[0].first_task_title}`);
        console.log(`   First question: ${verifyResult.rows[0].first_question?.substring(0, 60)}...`);
      }
    } else {
      console.log('❌ No scenario updated');
    }
    
  } catch (_error) {
    console.error('❌ Failed to update task templates:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the update
directUpdateTaskTemplates()
  .then(() => {
    console.log('\n✅ Task templates update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to update task templates:', error);
    process.exit(1);
  });