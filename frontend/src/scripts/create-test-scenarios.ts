#!/usr/bin/env tsx

/**
 * Create test scenarios directly in database for all three modes
 * Purpose: Test database functionality without relying on YAML files
 */

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Assessment scenarios
const assessmentScenarios = [
  {
    id: uuidv4(),
    mode: 'assessment',
    status: 'active',
    title: { en: 'AI Literacy Assessment', zh: 'AI 素養評估' },
    description: { en: 'Comprehensive AI literacy evaluation', zh: '全面的 AI 素養評估' },
    difficulty: 'intermediate',
    estimated_minutes: 30,
    task_templates: [
      {
        id: 'q1',
        type: 'question',
        title: 'AI Basics',
        content: {
          question: 'What is artificial intelligence?',
          options: ['A computer program', 'Machine learning', 'Human-like thinking by machines', 'Data processing'],
          correct_answer: 2
        }
      },
      {
        id: 'q2',
        type: 'question',
        title: 'AI Ethics',
        content: {
          question: 'Which is the most important ethical consideration in AI?',
          options: ['Speed', 'Bias prevention', 'Cost', 'Complexity'],
          correct_answer: 1
        }
      }
    ],
    assessment_data: {
      assessmentType: 'diagnostic',
      questionBank: [
        { domain: 'engaging_with_ai', weight: 0.3 },
        { domain: 'creating_with_ai', weight: 0.2 },
        { domain: 'managing_ai', weight: 0.3 },
        { domain: 'designing_ai', weight: 0.2 }
      ],
      scoringRubric: {
        beginner: '0-50',
        intermediate: '51-75',
        advanced: '76-90',
        expert: '91-100'
      }
    }
  },
  {
    id: uuidv4(),
    mode: 'assessment',
    status: 'active',
    title: { en: 'AI Ethics Quick Check', zh: 'AI 倫理快速檢測' },
    description: { en: 'Quick assessment of AI ethics understanding', zh: '快速評估 AI 倫理理解' },
    difficulty: 'beginner',
    estimated_minutes: 15,
    task_templates: [
      {
        id: 'ethics1',
        type: 'question',
        title: 'Bias in AI',
        content: {
          question: 'What causes bias in AI systems?',
          options: ['Training data', 'Algorithms', 'Human decisions', 'All of the above'],
          correct_answer: 3
        }
      }
    ],
    assessment_data: {
      assessmentType: 'formative',
      focus: 'ethics',
      domains: ['managing_ai']
    }
  }
];

// PBL scenarios (direct DB creation, not from YAML)
const pblScenarios = [
  {
    id: uuidv4(),
    mode: 'pbl',
    status: 'active',
    title: { en: 'AI Chatbot for Customer Service', zh: 'AI 客服聊天機器人' },
    description: { en: 'Design and implement an AI chatbot for customer service', zh: '設計並實現 AI 客服聊天機器人' },
    difficulty: 'intermediate',
    estimated_minutes: 120,
    task_templates: [
      {
        id: 'research',
        type: 'analysis',
        title: 'Research Phase',
        content: {
          instructions: 'Research existing chatbot solutions and identify key requirements',
          deliverables: ['Market analysis', 'Requirements document'],
          ai_assistance: true
        }
      },
      {
        id: 'design',
        type: 'creation',
        title: 'Design Phase',
        content: {
          instructions: 'Create chatbot conversation flows and user interface mockups',
          deliverables: ['Conversation flow diagram', 'UI mockups'],
          ai_assistance: true
        }
      },
      {
        id: 'implementation',
        type: 'creation',
        title: 'Implementation',
        content: {
          instructions: 'Build a prototype chatbot using AI tools',
          deliverables: ['Working prototype', 'Testing results'],
          ai_assistance: true
        }
      }
    ],
    pbl_data: {
      ksaMapping: {
        knowledge: ['K1', 'K5', 'K12'],
        skills: ['S3', 'S8', 'S15'],
        attitudes: ['A2', 'A7', 'A11']
      },
      aiMentorGuidelines: {
        supportLevel: 'moderate',
        interventionTriggers: ['stuck_for_10_minutes', 'wrong_direction'],
        feedbackStyle: 'socratic'
      },
      realWorldContext: 'E-commerce customer support',
      stakeholders: ['customers', 'support_team', 'management']
    }
  },
  {
    id: uuidv4(),
    mode: 'pbl',
    status: 'active',
    title: { en: 'AI-Powered Content Moderation', zh: 'AI 驅動的內容審核' },
    description: { en: 'Develop an AI system for social media content moderation', zh: '開發社交媒體內容審核的 AI 系統' },
    difficulty: 'advanced',
    estimated_minutes: 180,
    task_templates: [
      {
        id: 'ethics_analysis',
        type: 'analysis',
        title: 'Ethical Considerations',
        content: {
          instructions: 'Analyze ethical implications of automated content moderation',
          focus_areas: ['bias', 'censorship', 'cultural_sensitivity'],
          ai_assistance: true
        }
      },
      {
        id: 'algorithm_design',
        type: 'creation',
        title: 'Algorithm Design',
        content: {
          instructions: 'Design content moderation algorithms with human oversight',
          considerations: ['accuracy', 'transparency', 'appeal_process'],
          ai_assistance: true
        }
      }
    ],
    pbl_data: {
      ksaMapping: {
        knowledge: ['K3', 'K8', 'K14'],
        skills: ['S1', 'S9', 'S12'],
        attitudes: ['A1', 'A4', 'A9']
      },
      complexity: 'high',
      ethicalFocus: true
    }
  }
];

// Discovery scenarios
const discoveryScenarios = [
  {
    id: uuidv4(),
    mode: 'discovery',
    status: 'active',
    title: { en: 'AI Career Explorer', zh: 'AI 職涯探索' },
    description: { en: 'Explore careers in AI and understand required skills', zh: '探索 AI 職涯並了解所需技能' },
    difficulty: 'beginner',
    estimated_minutes: 60,
    task_templates: [
      {
        id: 'career_research',
        type: 'exploration',
        title: 'Career Research',
        content: {
          instructions: 'Research different AI career paths',
          areas: ['data_scientist', 'ml_engineer', 'ai_ethicist', 'product_manager'],
          ai_assistance: true
        }
      },
      {
        id: 'skill_assessment',
        type: 'interactive',
        title: 'Skill Gap Analysis',
        content: {
          instructions: 'Assess your current skills against career requirements',
          self_reflection: true,
          ai_guidance: true
        }
      },
      {
        id: 'learning_path',
        type: 'interactive',
        title: 'Personalized Learning Path',
        content: {
          instructions: 'Create a personalized learning roadmap',
          adaptive: true,
          ai_assistance: true
        }
      }
    ],
    discovery_data: {
      careerType: 'ai_general',
      careerInfo: {
        roles: ['Data Scientist', 'ML Engineer', 'AI Researcher', 'AI Product Manager'],
        industries: ['tech', 'healthcare', 'finance', 'education'],
        skill_categories: ['technical', 'analytical', 'communication', 'ethical_reasoning']
      },
      explorationMode: 'guided',
      adaptiveContent: true,
      careerAssessment: {
        dimensions: ['interest', 'aptitude', 'values', 'lifestyle'],
        recommendationEngine: 'ai_powered'
      }
    }
  },
  {
    id: uuidv4(),
    mode: 'discovery',
    status: 'active',
    title: { en: 'AI Innovation Challenge', zh: 'AI 創新挑戰' },
    description: { en: 'Discover AI applications through hands-on innovation challenges', zh: '透過實作創新挑戰探索 AI 應用' },
    difficulty: 'intermediate',
    estimated_minutes: 90,
    task_templates: [
      {
        id: 'problem_identification',
        type: 'exploration',
        title: 'Problem Discovery',
        content: {
          instructions: 'Identify real-world problems that AI could solve',
          brainstorming: true,
          collaboration: true
        }
      },
      {
        id: 'solution_design',
        type: 'experiment',
        title: 'Solution Experimentation',
        content: {
          instructions: 'Experiment with AI tools to prototype solutions',
          tools: ['no_code_ai', 'apis', 'datasets'],
          iterative: true
        }
      },
      {
        id: 'impact_evaluation',
        type: 'reflection',
        title: 'Impact Assessment',
        content: {
          instructions: 'Evaluate potential impact and ethical considerations',
          frameworks: ['sustainability', 'equity', 'feasibility'],
          critical_thinking: true
        }
      }
    ],
    discovery_data: {
      careerType: 'ai_innovation',
      innovationFocus: {
        domains: ['social_good', 'business_efficiency', 'creative_arts', 'scientific_research'],
        methodologies: ['design_thinking', 'lean_startup', 'agile_development'],
        success_metrics: ['user_impact', 'technical_feasibility', 'ethical_score']
      },
      gamification: {
        points: true,
        badges: ['problem_solver', 'innovator', 'ethical_thinker'],
        leaderboard: true
      }
    }
  },
  {
    id: uuidv4(),
    mode: 'discovery',
    status: 'active',
    title: { en: 'AI Entrepreneurship Bootcamp', zh: 'AI 創業訓練營' },
    description: { en: 'Discover entrepreneurial opportunities in AI', zh: '探索 AI 創業機會' },
    difficulty: 'advanced',
    estimated_minutes: 150,
    task_templates: [
      {
        id: 'market_analysis',
        type: 'exploration',
        title: 'Market Research',
        content: {
          instructions: 'Analyze AI market opportunities and trends',
          research_areas: ['emerging_tech', 'market_gaps', 'competition'],
          data_driven: true
        }
      },
      {
        id: 'business_model',
        type: 'challenge',
        title: 'Business Model Canvas',
        content: {
          instructions: 'Create AI-powered business model using canvas methodology',
          framework: 'business_model_canvas',
          validation: 'customer_interviews'
        }
      },
      {
        id: 'pitch_development',
        type: 'challenge',
        title: 'Investor Pitch',
        content: {
          instructions: 'Develop and practice investor pitch presentation',
          components: ['problem', 'solution', 'market', 'traction', 'ask'],
          feedback: 'ai_analysis'
        }
      }
    ],
    discovery_data: {
      careerType: 'ai_entrepreneur',
      entrepreneurshipFocus: {
        business_areas: ['b2b_saas', 'consumer_apps', 'enterprise_solutions', 'ai_consulting'],
        skill_development: ['business_strategy', 'fundraising', 'team_building', 'product_management'],
        success_indicators: ['mvp_creation', 'customer_validation', 'pitch_quality']
      },
      mentorship: {
        ai_mentor: true,
        peer_feedback: true,
        expert_review: true
      }
    }
  }
];

async function insertScenarios() {
  console.log('🚀 Creating Test Scenarios in Database');
  console.log('====================================');

  let totalInserted = 0;

  // Insert Assessment scenarios
  console.log('\n📊 Creating Assessment Scenarios...');
  for (const scenario of assessmentScenarios) {
    try {
      await pool.query(`
        INSERT INTO scenarios (
          id, mode, status, version, source_type, source_id,
          title, description, difficulty, estimated_minutes, prerequisites,
          task_templates, xp_rewards, unlock_requirements,
          pbl_data, discovery_data, assessment_data, ai_modules, resources, metadata
        ) VALUES (
          $1, $2, $3, '1.0.0', 'api', $4, $5, $6, $7, $8, '[]'::jsonb,
          $9, '{"completion": 100}'::jsonb, '{}'::jsonb,
          '{}'::jsonb, '{}'::jsonb, $10, '{}'::jsonb, '[]'::jsonb, $11
        )
      `, [
        scenario.id, scenario.mode, scenario.status, `test_${scenario.mode}_${Date.now()}`,
        JSON.stringify(scenario.title), JSON.stringify(scenario.description),
        scenario.difficulty, scenario.estimated_minutes,
        JSON.stringify(scenario.task_templates),
        JSON.stringify(scenario.assessment_data),
        JSON.stringify({ source: 'direct_creation', type: 'test_scenario' })
      ]);
      
      console.log(`  ✅ Created: ${scenario.title.en}`);
      totalInserted++;
    } catch (_error) {
      console.error(`  ❌ Error creating ${scenario.title.en}:`, error);
    }
  }

  // Insert PBL scenarios
  console.log('\n🎯 Creating PBL Scenarios...');
  for (const scenario of pblScenarios) {
    try {
      await pool.query(`
        INSERT INTO scenarios (
          id, mode, status, version, source_type, source_id,
          title, description, difficulty, estimated_minutes, prerequisites,
          task_templates, xp_rewards, unlock_requirements,
          pbl_data, discovery_data, assessment_data, ai_modules, resources, metadata
        ) VALUES (
          $1, $2, $3, '1.0.0', 'api', $4, $5, $6, $7, $8, '[]'::jsonb,
          $9, '{"completion": 150}'::jsonb, '{}'::jsonb,
          $10, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, $11
        )
      `, [
        scenario.id, scenario.mode, scenario.status, `test_${scenario.mode}_${Date.now()}`,
        JSON.stringify(scenario.title), JSON.stringify(scenario.description),
        scenario.difficulty, scenario.estimated_minutes,
        JSON.stringify(scenario.task_templates),
        JSON.stringify(scenario.pbl_data),
        JSON.stringify({ source: 'direct_creation', type: 'test_scenario' })
      ]);
      
      console.log(`  ✅ Created: ${scenario.title.en}`);
      totalInserted++;
    } catch (_error) {
      console.error(`  ❌ Error creating ${scenario.title.en}:`, error);
    }
  }

  // Insert Discovery scenarios
  console.log('\n🔍 Creating Discovery Scenarios...');
  for (const scenario of discoveryScenarios) {
    try {
      await pool.query(`
        INSERT INTO scenarios (
          id, mode, status, version, source_type, source_id,
          title, description, difficulty, estimated_minutes, prerequisites,
          task_templates, xp_rewards, unlock_requirements,
          pbl_data, discovery_data, assessment_data, ai_modules, resources, metadata
        ) VALUES (
          $1, $2, $3, '1.0.0', 'api', $4, $5, $6, $7, $8, '[]'::jsonb,
          $9, '{"completion": 200}'::jsonb, '{}'::jsonb,
          '{}'::jsonb, $10, '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, $11
        )
      `, [
        scenario.id, scenario.mode, scenario.status, `test_${scenario.mode}_${Date.now()}`,
        JSON.stringify(scenario.title), JSON.stringify(scenario.description),
        scenario.difficulty, scenario.estimated_minutes,
        JSON.stringify(scenario.task_templates),
        JSON.stringify(scenario.discovery_data),
        JSON.stringify({ source: 'direct_creation', type: 'test_scenario' })
      ]);
      
      console.log(`  ✅ Created: ${scenario.title.en}`);
      totalInserted++;
    } catch (_error) {
      console.error(`  ❌ Error creating ${scenario.title.en}:`, error);
    }
  }

  return totalInserted;
}

async function main() {
  try {
    // Test connection
    await pool.query('SELECT version()');
    console.log('✅ Connected to database');

    // Create scenarios
    const inserted = await insertScenarios();

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
    
    console.log(`\nInserted this run: ${inserted}`);
    console.log('\n✅ Test scenarios created successfully!');
    
    // Test query to verify structure
    console.log('\n🧪 Testing database queries...');
    const testQuery = await pool.query(`
      SELECT id, mode, title->>'en' as title, difficulty, estimated_minutes
      FROM scenarios 
      WHERE source_type = 'api'
      ORDER BY mode, title->>'en'
    `);
    
    console.log('✅ Database queries working correctly');
    console.log(`Found ${testQuery.rows.length} API-created scenarios`);

  } catch (_error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}