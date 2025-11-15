/**
 * 將 PBL YAML scenarios 載入到資料庫
 * 支援多語言 YAML 檔案結構
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
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

// 支援的語言
const LANGUAGES = ['en', 'zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];

async function loadPBLScenarios() {
  console.log('Loading PBL scenarios from YAML...\n');

  try {
    // 清理測試場景
    console.log('Removing test scenarios...');
    await pool.query("DELETE FROM scenarios WHERE mode = 'pbl' AND (title->>'en' LIKE '%test%' OR title->>'en' LIKE '%Test%')");
    const cleanupResult = await pool.query("SELECT COUNT(*) FROM scenarios WHERE mode = 'pbl'");
    console.log(`✅ Removed ${cleanupResult.rows[0].count} test scenarios\n`);

    const scenariosDir = 'public/pbl_data/scenarios';
    const scenarioFolders = readdirSync(scenariosDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
      .map(dirent => dirent.name);

    console.log(`Found ${scenarioFolders.length} PBL scenarios:`);
    scenarioFolders.forEach(folder => console.log(`  - ${folder}`));
    console.log('\nProcessing PBL scenarios...\n');

    for (const scenarioFolder of scenarioFolders) {
      console.log(`📁 Loading ${scenarioFolder}...`);

      const scenarioPath = join(scenariosDir, scenarioFolder);

      // 讀取英文版本作為基準
      const enFile = join(scenarioPath, `${scenarioFolder}_en.yaml`);
      const enContent = readFileSync(enFile, 'utf8');
      const enData = parse(enContent);

      // 讀取所有語言版本
      const multilingualData: Record<string, any> = {};

      for (const lang of LANGUAGES) {
        const langFile = join(scenarioPath, `${scenarioFolder}_${lang}.yaml`);
        try {
          const langContent = readFileSync(langFile, 'utf8');
          const langData = parse(langContent);
          multilingualData[lang] = langData;
        } catch (error) {
          console.log(`    ⚠️ Missing ${lang} version, using English fallback`);
          multilingualData[lang] = enData;
        }
      }

      // 構建多語言標題和描述
      const title: Record<string, string> = {};
      const description: Record<string, string> = {};
      const objectives: Record<string, string[]> = {};

      for (const lang of LANGUAGES) {
        const data = multilingualData[lang];
        title[lang] = data.scenario_info?.title || enData.scenario_info?.title || `PBL Scenario: ${scenarioFolder}`;
        description[lang] = data.scenario_info?.description || enData.scenario_info?.description || 'Problem-based learning scenario';
        objectives[lang] = data.scenario_info?.learning_objectives || enData.scenario_info?.learning_objectives || [];
      }

      // 準備任務模板
      const taskTemplates = enData.tasks?.map((task: any, index: number) => ({
        id: task.id || `task_${index + 1}`,
        title: LANGUAGES.reduce((acc, lang) => {
          const data = multilingualData[lang];
          acc[lang] = data.tasks?.[index]?.title || task.title || `Task ${index + 1}`;
          return acc;
        }, {} as Record<string, string>),
        description: LANGUAGES.reduce((acc, lang) => {
          const data = multilingualData[lang];
          acc[lang] = data.tasks?.[index]?.description || task.description || '';
          return acc;
        }, {} as Record<string, string>),
        type: task.type || 'interactive',
        estimatedTime: task.estimated_duration || 30,
        instructions: task.instructions || [],
        expectedOutcome: task.expected_outcome || '',
        aiModule: task.ai_module || {}
      })) || [];

      // 準備 pbl_data
      const pblData = {
        ksaMapping: enData.ksa_mapping || {},
        targetDomains: enData.scenario_info?.target_domains || [],
        prerequisites: enData.scenario_info?.prerequisites || [],
        aiMentorGuidelines: enData.ai_mentor || {},
        evaluationCriteria: enData.evaluation_criteria || {},
        phases: enData.phases || []
      };

      const scenarioId = uuidv4();

      // 插入場景
      await pool.query(`
        INSERT INTO scenarios (
          id, mode, status, source_type, source_path,
          title, description, objectives,
          difficulty, estimated_minutes,
          task_templates, pbl_data,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        scenarioId,
        'pbl',
        'active',
        'yaml',
        enFile,
        JSON.stringify(title),
        JSON.stringify(description),
        JSON.stringify(objectives),
        enData.scenario_info?.difficulty || 'intermediate',
        enData.scenario_info?.estimated_duration || 90,
        JSON.stringify(taskTemplates),
        JSON.stringify(pblData),
        new Date().toISOString(),
        new Date().toISOString()
      ]);

      console.log(`  ✅ Loaded: ${title.en}`);
      console.log(`  📝 Languages: ${LANGUAGES.join(', ')}`);
      console.log(`  📚 Tasks: ${taskTemplates.length}`);
      console.log(`  🎯 Target Domains: ${pblData.targetDomains.length}`);
      console.log('');
    }

    // 檢查總數
    const result = await pool.query('SELECT COUNT(*) FROM scenarios WHERE mode = $1', ['pbl']);
    console.log(`✅ PBL scenarios loaded successfully!`);
    console.log(`Total PBL scenarios in database: ${result.rows[0].count}\n`);

  } catch (error) {
    console.error('Error loading PBL scenarios:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

loadPBLScenarios();
