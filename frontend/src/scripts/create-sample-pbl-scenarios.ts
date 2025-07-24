#!/usr/bin/env tsx

/**
 * Create sample PBL scenarios in staging database
 */

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.staging') });
config({ path: path.join(process.cwd(), '.env.staging.local'), override: true });

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'ai_square_staging',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'staging2025',
});

const pblScenarios = [
  {
    source_id: 'ai_education_design',
    title: {
      en: 'AI in Education Design',
      zh: 'AI 教育設計'
    },
    description: {
      en: 'Design AI-powered educational tools and experiences',
      zh: '設計 AI 驅動的教育工具和體驗'
    },
    targetDomains: ['Creating_with_AI', 'Designing_AI'],
    difficulty: 'intermediate',
    estimated_minutes: 90
  },
  {
    source_id: 'ai_job_search',
    title: {
      en: 'AI-Powered Job Search',
      zh: 'AI 求職助手'
    },
    description: {
      en: 'Use AI tools to enhance your job search and career planning',
      zh: '使用 AI 工具增強求職和職業規劃'
    },
    targetDomains: ['Engaging_with_AI', 'Managing_AI'],
    difficulty: 'beginner',
    estimated_minutes: 60
  },
  {
    source_id: 'ai_robotics_development',
    title: {
      en: 'AI Robotics Development',
      zh: 'AI 機器人開發'
    },
    description: {
      en: 'Build intelligent robots using AI and machine learning',
      zh: '使用 AI 和機器學習構建智能機器人'
    },
    targetDomains: ['Creating_with_AI', 'Designing_AI'],
    difficulty: 'advanced',
    estimated_minutes: 120
  },
  {
    source_id: 'ai_stablecoin_trading',
    title: {
      en: 'AI in Cryptocurrency Trading',
      zh: 'AI 加密貨幣交易'
    },
    description: {
      en: 'Explore AI applications in cryptocurrency and trading',
      zh: '探索 AI 在加密貨幣和交易中的應用'
    },
    targetDomains: ['Managing_AI', 'Engaging_with_AI'],
    difficulty: 'advanced',
    estimated_minutes: 90
  },
  {
    source_id: 'high_school_creative_arts',
    title: {
      en: 'AI Creative Arts Workshop',
      zh: 'AI 創意藝術工作坊'
    },
    description: {
      en: 'Create art, music, and stories with AI tools',
      zh: '使用 AI 工具創作藝術、音樂和故事'
    },
    targetDomains: ['Creating_with_AI'],
    difficulty: 'beginner',
    estimated_minutes: 60
  },
  {
    source_id: 'high_school_digital_wellness',
    title: {
      en: 'Digital Wellness with AI',
      zh: 'AI 數位健康'
    },
    description: {
      en: 'Learn to use AI for mental health and digital wellness',
      zh: '學習使用 AI 促進心理健康和數位健康'
    },
    targetDomains: ['Managing_AI', 'Engaging_with_AI'],
    difficulty: 'intermediate',
    estimated_minutes: 75
  },
  {
    source_id: 'high_school_health_assistant',
    title: {
      en: 'AI Health Assistant',
      zh: 'AI 健康助理'
    },
    description: {
      en: 'Build a personal health assistant using AI',
      zh: '使用 AI 構建個人健康助理'
    },
    targetDomains: ['Creating_with_AI', 'Managing_AI'],
    difficulty: 'intermediate',
    estimated_minutes: 90
  },
  {
    source_id: 'high_school_smart_city',
    title: {
      en: 'Smart City with AI',
      zh: 'AI 智慧城市'
    },
    description: {
      en: 'Design smart city solutions using AI technology',
      zh: '使用 AI 技術設計智慧城市解決方案'
    },
    targetDomains: ['Designing_AI', 'Managing_AI'],
    difficulty: 'intermediate',
    estimated_minutes: 90
  }
];

async function main() {
  console.log('🚀 Creating Sample PBL Scenarios');
  console.log('================================');
  
  try {
    let inserted = 0;
    let skipped = 0;
    
    for (const scenario of pblScenarios) {
      // Check if already exists
      const existing = await pool.query(
        'SELECT id FROM scenarios WHERE source_id = $1 AND mode = $2',
        [scenario.source_id, 'pbl']
      );
      
      if (existing.rows.length > 0) {
        console.log(`  → Skipping existing: ${scenario.title.en}`);
        skipped++;
        continue;
      }
      
      const newScenario = {
        id: uuidv4(),
        mode: 'pbl',
        status: 'active',
        version: '1.0',
        source_type: 'yaml',
        source_path: `pbl_data/scenarios/${scenario.source_id}`,
        source_id: scenario.source_id,
        source_metadata: {
          configPath: `pbl_data/scenarios/${scenario.source_id}/${scenario.source_id}_scenario.yaml`,
          lastSync: new Date().toISOString()
        },
        title: scenario.title,
        description: scenario.description,
        objectives: [
          'Apply AI concepts to real-world problems',
          'Develop critical thinking skills',
          'Create innovative solutions',
          'Reflect on ethical implications'
        ],
        difficulty: scenario.difficulty,
        estimated_minutes: scenario.estimated_minutes,
        prerequisites: [],
        task_templates: [],
        xp_rewards: { completion: 100 },
        unlock_requirements: {},
        pbl_data: {
          targetDomains: scenario.targetDomains,
          ksaMapping: [
            {
              competency: 'C1.1',
              knowledge: ['K1.1.1', 'K1.1.2'],
              skills: ['S1.1.1'],
              attitudes: ['A1.1.1']
            }
          ],
          programs: []
        },
        discovery_data: {},
        assessment_data: {},
        ai_modules: {
          chat: { enabled: true },
          feedback: { enabled: true }
        },
        resources: []
      };
      
      await pool.query(`
        INSERT INTO scenarios (
          id, mode, status, version, source_type, source_path, source_id,
          source_metadata, title, description, objectives, difficulty,
          estimated_minutes, prerequisites, task_templates, xp_rewards,
          unlock_requirements, pbl_data, discovery_data, assessment_data,
          ai_modules, resources
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22
        )
      `, [
        newScenario.id, newScenario.mode, newScenario.status, newScenario.version,
        newScenario.source_type, newScenario.source_path, newScenario.source_id,
        JSON.stringify(newScenario.source_metadata), JSON.stringify(newScenario.title),
        JSON.stringify(newScenario.description), JSON.stringify(newScenario.objectives),
        newScenario.difficulty, newScenario.estimated_minutes,
        JSON.stringify(newScenario.prerequisites), JSON.stringify(newScenario.task_templates),
        JSON.stringify(newScenario.xp_rewards), JSON.stringify(newScenario.unlock_requirements),
        JSON.stringify(newScenario.pbl_data), JSON.stringify(newScenario.discovery_data),
        JSON.stringify(newScenario.assessment_data), JSON.stringify(newScenario.ai_modules),
        JSON.stringify(newScenario.resources)
      ]);
      
      console.log(`  ✅ Created: ${scenario.title.en}`);
      inserted++;
    }
    
    // Summary
    console.log('\n📊 Summary');
    console.log('==========');
    const count = await pool.query('SELECT COUNT(*) FROM scenarios WHERE mode = $1', ['pbl']);
    console.log(`Total PBL scenarios: ${count.rows[0].count}`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Skipped: ${skipped}`);
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);