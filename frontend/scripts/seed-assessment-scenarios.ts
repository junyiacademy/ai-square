/**
 * 將 Assessment YAML scenarios 載入到資料庫
 */

import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// 資料庫配置
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function loadAssessmentScenarios() {
  console.log('Loading Assessment scenarios from YAML...\n');

  try {
    // 讀取英文版本作為基準
    const yamlPath = 'public/assessment_data/ai_literacy/ai_literacy_questions_en.yaml';
    const yamlContent = readFileSync(yamlPath, 'utf8');
    const data = parse(yamlContent);

    const scenarioId = uuidv4();

    // 準備多語言標題和描述
    const title = { en: data.assessment_config.title };
    const description = { en: data.assessment_config.description };

    // 轉換任務為任務模板
    const taskTemplates = data.tasks.map((task: any) => ({
      id: task.id,
      title: { en: task.title },
      description: { en: task.description },
      type: 'assessment',
      timeLimit: task.time_limit_minutes * 60,
      questions: task.questions
    }));

    // 準備 assessment_data
    const assessmentData = {
      assessmentType: 'ai_literacy',
      totalQuestions: data.assessment_config.total_questions,
      timeLimitMinutes: data.assessment_config.time_limit_minutes,
      passingScore: data.assessment_config.passing_score,
      domains: data.assessment_config.domains,
      questionBank: data.tasks
    };

    // 插入場景
    await pool.query(`
      INSERT INTO scenarios (
        id, mode, status, source_type, source_path,
        title, description,
        difficulty, estimated_minutes,
        task_templates, assessment_data,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      scenarioId,
      'assessment',
      'active',
      'yaml',
      yamlPath,
      JSON.stringify(title),
      JSON.stringify(description),
      'intermediate',
      data.assessment_config.time_limit_minutes,
      JSON.stringify(taskTemplates),
      JSON.stringify(assessmentData),
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    console.log(`✅ Loaded: ${data.assessment_config.title}`);
    console.log(`  📝 Tasks: ${taskTemplates.length}`);
    console.log(`  📚 Questions: ${data.assessment_config.total_questions}`);
    console.log(`  ⏱️  Time limit: ${data.assessment_config.time_limit_minutes} minutes\n`);

    // 檢查總數
    const result = await pool.query('SELECT COUNT(*) FROM scenarios WHERE mode = $1', ['assessment']);
    console.log(`✅ Assessment scenarios loaded successfully!`);
    console.log(`Total Assessment scenarios in database: ${result.rows[0].count}\n`);

  } catch (error) {
    console.error('Error loading assessment scenarios:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

loadAssessmentScenarios();
