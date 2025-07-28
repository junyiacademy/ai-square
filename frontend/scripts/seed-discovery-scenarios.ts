/**
 * 將 Discovery YAML scenarios 載入到資料庫
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

interface DiscoveryMetadata {
  title: string;
  short_description: string;
  long_description: string;
  estimated_hours: number;
  skill_focus: string[];
}

interface DiscoveryWorldSetting {
  name: string;
  description: string;
  atmosphere: string;
  visual_theme: string;
}

interface DiscoverySkill {
  id: string;
  name: string;
  description: string;
  max_level: number;
  prerequisites?: string[];
}

interface DiscoveryTask {
  id: string;
  title: string;
  description: string;
  objective: string;
  type: string;
  difficulty: string;
  estimated_minutes: number;
  instructions?: string;
  ai_assistance?: {
    mentor_personality: string;
    initial_context: string;
    guidance_style: string;
  };
}

interface DiscoveryScenarioYAML {
  path_id: string;
  category: string;
  difficulty_range: string;
  metadata: DiscoveryMetadata;
  world_setting: DiscoveryWorldSetting;
  starting_scenario: {
    title: string;
    description: string;
    initial_tasks: string[];
  };
  skill_tree: {
    core_skills: DiscoverySkill[];
    advanced_skills?: DiscoverySkill[];
  };
  career_insights: {
    job_market: {
      demand: string;
      growth_rate: string;
      salary_range: string;
      job_titles: string[];
    };
    required_skills: {
      technical: string[];
      soft: string[];
    };
    typical_day: string;
    career_progression: string[];
  };
  example_tasks?: {
    beginner?: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      skills_improved: string[];
      xp_reward: number;
    }>;
    intermediate?: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      skills_improved: string[];
      xp_reward: number;
    }>;
    advanced?: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      skills_improved: string[];
      xp_reward: number;
    }>;
  };
  portfolio_templates?: Array<{
    id: string;
    title: string;
    description: string;
    difficulty: string;
    deliverables: string[];
  }>;
}

async function removeTestScenarios() {
  console.log('Removing test scenarios...');
  
  try {
    const result = await pool.query(`
      DELETE FROM scenarios 
      WHERE mode = 'discovery' 
      AND (title::jsonb->>'en' LIKE '%Test%' 
           OR title::jsonb->>'en' LIKE '%test%'
           OR source_path IS NULL
           OR source_path = '')
    `);
    
    console.log(`✅ Removed ${result.rowCount} test scenarios\n`);
  } catch (error) {
    console.error('Error removing test scenarios:', error);
  }
}

async function loadCareerPath(careerPath: string) {
  const careerData: Record<string, any> = {};
  
  // 讀取各語言檔案
  for (const lang of LANGUAGES) {
    const langCode = lang === 'zhTW' ? 'zhTW' : lang === 'zhCN' ? 'zhCN' : lang;
    const filename = `${careerPath}_${langCode}.yml`;
    const filePath = join(process.cwd(), 'public', 'discovery_data', careerPath, filename);
    
    try {
      const yamlContent = readFileSync(filePath, 'utf8');
      const data = parse(yamlContent) as DiscoveryScenarioYAML;
      careerData[lang] = data;
    } catch (error) {
      console.warn(`  ⚠️  No ${lang} translation found for ${careerPath}`);
    }
  }
  
  return careerData;
}

async function loadDiscoveryScenarios() {
  try {
    console.log('Loading Discovery scenarios from YAML...\n');
    
    // 先移除測試資料
    await removeTestScenarios();

    // 取得所有職業路徑資料夾
    const discoveryDataPath = join(process.cwd(), 'public', 'discovery_data');
    const careerPaths = readdirSync(discoveryDataPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(`Found ${careerPaths.length} career paths:`);
    careerPaths.forEach(path => console.log(`  - ${path}`));

    console.log('\nProcessing career paths...\n');
    
    for (const careerPath of careerPaths) {
      try {
        console.log(`\n📁 Loading ${careerPath}...`);
        const careerData = await loadCareerPath(careerPath);
        
        // 必須至少有英文版本
        if (!careerData.en) {
          console.error(`  ❌ No English version found for ${careerPath}, skipping...`);
          continue;
        }
        
        const enData = careerData.en as DiscoveryScenarioYAML;
        const scenarioId = uuidv4();
        
        // 建立多語言資料結構
        const multiLangData: Record<string, any> = {};
        
        // 初始化多語言欄位
        const title: Record<string, string> = {};
        const description: Record<string, string> = {};
        const objectives: Record<string, string[]> = {};
        const worldSettingName: Record<string, string> = {};
        const worldSettingDesc: Record<string, string> = {};
        const startingScenarioTitle: Record<string, string> = {};
        const startingScenarioDesc: Record<string, string> = {};
        const typicalDay: Record<string, string> = {};
        
        // 處理每個語言版本
        for (const [lang, data] of Object.entries(careerData)) {
          if (!data) continue;
          
          const langData = data as DiscoveryScenarioYAML;
          
          title[lang] = langData.metadata.title;
          description[lang] = langData.metadata.long_description;
          worldSettingName[lang] = langData.world_setting.name;
          worldSettingDesc[lang] = langData.world_setting.description;
          startingScenarioTitle[lang] = langData.starting_scenario.title;
          startingScenarioDesc[lang] = langData.starting_scenario.description;
          typicalDay[lang] = langData.career_insights?.typical_day || '';
          
          // 動態生成學習目標
          objectives[lang] = [
            `Explore ${langData.metadata.title} career path`,
            `Develop ${langData.skill_tree.core_skills.length} core skills`,
            `Build portfolio projects`,
            `Understand industry insights`
          ];
        }

        // 建立 scenario 資料
        const scenarioData = {
          id: scenarioId,
          mode: 'discovery',
          status: 'active',
          source_type: 'yaml',
          source_path: `discovery_data/${careerPath}`,
          source_id: enData.path_id,
          title,
          description,
          objectives,
          difficulty: 'intermediate', // Discovery scenarios are generally intermediate level
          estimated_minutes: enData.metadata.estimated_hours * 60,
          discovery_data: {
            pathId: enData.path_id,
            category: enData.category,
            difficultyRange: enData.difficulty_range,
            worldSetting: {
              name: worldSettingName,
              description: worldSettingDesc,
              atmosphere: enData.world_setting.atmosphere,
              visualTheme: enData.world_setting.visual_theme
            },
            startingScenario: {
              title: startingScenarioTitle,
              description: startingScenarioDesc,
              initialTasks: enData.starting_scenario.initial_tasks
            },
            skillTree: enData.skill_tree,
            careerInsights: {
              ...enData.career_insights,
              typical_day: typicalDay
            },
            portfolioTemplates: enData.portfolio_templates || []
          },
          task_templates: (() => {
            // 整合所有難度等級的任務
            const allTasks: any[] = [];
            let order = 0;
            
            // 處理 example_tasks 的三個難度等級
            const difficulties = ['beginner', 'intermediate', 'advanced'] as const;
            
            for (const difficulty of difficulties) {
              const tasksAtLevel = enData.example_tasks?.[difficulty] || [];
              
              for (const task of tasksAtLevel) {
                // 建立任務的多語言資料
                const taskTitle: Record<string, string> = {};
                const taskDesc: Record<string, string> = {};
                
                // 收集各語言版本的任務資料
                for (const [lang, data] of Object.entries(careerData)) {
                  if (!data) continue;
                  const langData = data as DiscoveryScenarioYAML;
                  const langTasksAtLevel = langData.example_tasks?.[difficulty];
                  const langTask = langTasksAtLevel?.find(t => t.id === task.id);
                  
                  if (langTask) {
                    taskTitle[lang] = langTask.title;
                    taskDesc[lang] = langTask.description;
                  } else {
                    // 如果沒有翻譯，使用英文版本
                    taskTitle[lang] = task.title;
                    taskDesc[lang] = task.description;
                  }
                }
                
                allTasks.push({
                  order: order++,
                  type: task.type,
                  difficulty: difficulty,
                  title: taskTitle,
                  description: taskDesc,
                  instructions: {
                    en: `Complete this ${difficulty} level ${task.type} task`,
                    zhTW: `完成這個${difficulty === 'beginner' ? '初級' : difficulty === 'intermediate' ? '中級' : '高級'}${task.type}任務`
                  },
                  context: {
                    taskId: task.id,
                    skillsImproved: task.skills_improved,
                    xpReward: task.xp_reward
                  }
                });
              }
            }
            
            return allTasks;
          })(),
          metadata: {
            yamlId: enData.path_id,
            category: enData.category,
            skillFocus: enData.metadata.skill_focus,
            tags: ['career', enData.category, enData.path_id]
          }
        };

        // 插入到資料庫
        const insertQuery = `
          INSERT INTO scenarios (
            id, mode, status, source_type, source_path,
            title, description, objectives, difficulty,
            estimated_minutes, discovery_data, task_templates,
            metadata, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            discovery_data = EXCLUDED.discovery_data,
            task_templates = EXCLUDED.task_templates,
            updated_at = CURRENT_TIMESTAMP
        `;

        await pool.query(insertQuery, [
          scenarioData.id,
          scenarioData.mode,
          scenarioData.status,
          scenarioData.source_type,
          scenarioData.source_path,
          JSON.stringify(scenarioData.title),
          JSON.stringify(scenarioData.description),
          JSON.stringify(scenarioData.objectives),
          scenarioData.difficulty,
          scenarioData.estimated_minutes,
          JSON.stringify(scenarioData.discovery_data),
          JSON.stringify(scenarioData.task_templates),
          JSON.stringify(scenarioData.metadata)
        ]);

        console.log(`  ✅ Loaded: ${enData.metadata.title}`);
        console.log(`  📝 Languages: ${Object.keys(careerData).join(', ')}`);
        const totalTasks = (enData.example_tasks?.beginner?.length || 0) + 
                          (enData.example_tasks?.intermediate?.length || 0) + 
                          (enData.example_tasks?.advanced?.length || 0);
        console.log(`  📚 Tasks: ${totalTasks} (across all difficulty levels)`);
        console.log(`  🎯 Skills: ${enData.skill_tree.core_skills.length} core skills`);
      } catch (error) {
        console.error(`  ❌ Error loading ${careerPath}:`, error);
      }
    }

    console.log('\n✅ Discovery scenarios loaded successfully!');
    
    // 顯示統計
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM scenarios WHERE mode = 'discovery'"
    );
    console.log(`Total Discovery scenarios in database: ${countResult.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

// 執行
loadDiscoveryScenarios();