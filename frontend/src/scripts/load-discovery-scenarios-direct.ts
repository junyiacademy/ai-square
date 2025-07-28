#!/usr/bin/env tsx

/**
 * Load Discovery scenarios from YAML files into the database using direct SQL
 * This bypasses repository layer issues and loads directly
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';

interface DiscoveryData {
  path_id: string;
  category: string;
  difficulty_range: string;
  metadata: {
    title: string;
    short_description: string;
    long_description: string;
    estimated_hours: number;
    skill_focus: string[];
  };
  world_setting: {
    name: string;
    description: string;
    atmosphere: string;
    visual_theme: string;
  };
  starting_scenario: {
    title: string;
    description: string;
    initial_tasks: string[];
  };
  skill_tree: {
    core_skills: Array<{
      id: string;
      name: string;
      description: string;
      max_level: number;
      unlocks?: string[];
    }>;
    advanced_skills: Array<{
      id: string;
      name: string;
      description: string;
      max_level: number;
      requires: string[];
    }>;
  };
  milestone_quests: Array<{
    id: string;
    name: string;
    description: string;
    required_level: number;
    skills_tested: string[];
    xp_reward: number;
    unlocks: string[];
  }>;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    xp_reward: number;
    badge_type: string;
  }>;
  example_tasks: {
    beginner: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      skills_improved: string[];
      xp_reward: number;
    }>;
    intermediate: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      skills_improved: string[];
      xp_reward: number;
    }>;
    advanced: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      skills_improved: string[];
      xp_reward: number;
    }>;
  };
  learning_objectives: string[];
  career_outcomes: string[];
}

// Supported languages
const languages = ['en', 'zhTW', 'zhCN', 'ar', 'de', 'es', 'fr', 'id', 'it', 'ja', 'ko', 'pt', 'ru', 'th'];

// Career paths to process
const careerPaths = [
  'app_developer',
  'biotech_researcher', 
  'content_creator',
  'cybersecurity_specialist',
  'data_analyst',
  'environmental_scientist',
  'game_designer',
  'product_manager',
  'startup_founder',
  'tech_entrepreneur',
  'ux_designer',
  'youtuber'
];

// Create database connection
function createPool() {
  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbPort = parseInt(process.env.DB_PORT || '5433');
  const dbName = process.env.DB_NAME || 'ai_square_db';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'aisquare2025local';

  return new Pool({
    host: dbHost,
    port: dbPort,
    database: dbName,
    user: dbUser,
    password: dbPassword,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

async function loadDiscoveryScenarios() {
  const pool = createPool();
  
  try {
    console.log('🚀 Starting Discovery scenario loading from YAML files...');
    
    const discoveryDataPath = path.join(process.cwd(), 'public', 'discovery_data');
    let loadedCount = 0;
    
    for (const careerPath of careerPaths) {
      console.log(`\n📂 Processing ${careerPath}...`);
      
      // Load all language versions for this career path
      const multilangData: Record<string, DiscoveryData> = {};
      
      for (const lang of languages) {
        const filePath = path.join(discoveryDataPath, careerPath, `${careerPath}_${lang}.yml`);
        
        try {
          if (await fs.access(filePath).then(() => true).catch(() => false)) {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const data = yaml.load(fileContent) as DiscoveryData;
            multilangData[lang] = data;
            console.log(`  ✅ Loaded ${lang} version`);
          } else {
            console.log(`  ⚠️  Missing ${lang} version: ${filePath}`);
          }
        } catch (error) {
          console.error(`  ❌ Error loading ${lang} version:`, error);
        }
      }
      
      // Create multilingual scenario object
      if (multilangData.en) { // Require English as base language
        const enData = multilangData.en;
        
        // Build multilingual title and description objects
        const title: Record<string, string> = {};
        const description: Record<string, string> = {};
        const objectives: Record<string, string[]> = {};
        
        for (const [lang, data] of Object.entries(multilangData)) {
          title[lang] = data.metadata.title;
          description[lang] = data.metadata.short_description;
          objectives[lang] = data.learning_objectives;
        }
        
        // Create scenario using direct SQL
        const scenarioId = uuidv4();
        
        const insertQuery = `
          INSERT INTO scenarios (
            id, mode, status, version,
            source_type, source_path, source_id, source_metadata,
            title, description, objectives,
            difficulty, estimated_minutes, prerequisites,
            task_templates, xp_rewards, unlock_requirements,
            pbl_data, discovery_data, assessment_data,
            ai_modules, resources, metadata
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19,
            $20, $21, $22, $23
          )
        `;
        
        // Create proper task templates with multilingual support
        const createTaskTemplate = (task: { id: string; type: string; title: string; description: string; skills_improved: string[]; xp_reward: number }, difficulty: string, order: number) => {
          const taskTitle: Record<string, string> = {};
          const taskDescription: Record<string, string> = {};
          const taskInstructions: Record<string, string> = {};
          
          // Build multilingual content for each task
          for (const [lang, data] of Object.entries(multilangData)) {
            const langTasks = data.example_tasks[difficulty as keyof typeof data.example_tasks];
            const langTask = langTasks?.find((t) => t.id === task.id);
            if (langTask) {
              taskTitle[lang] = langTask.title;
              taskDescription[lang] = langTask.description;
              taskInstructions[lang] = `Complete this ${difficulty} level ${langTask.type} task`;
            }
          }
          
          return {
            id: task.id,
            type: task.type,
            order: order,
            title: taskTitle,
            description: taskDescription,
            instructions: taskInstructions,
            difficulty: difficulty,
            context: {
              taskId: task.id,
              skillsImproved: task.skills_improved,
              xpReward: task.xp_reward
            }
          };
        };
        
        // Create task templates with proper ordering
        let taskOrder = 0;
        const taskTemplates = [
          ...enData.example_tasks.beginner.map((task) => 
            createTaskTemplate(task, 'beginner', taskOrder++)
          ),
          ...enData.example_tasks.intermediate.map((task) => 
            createTaskTemplate(task, 'intermediate', taskOrder++)
          ),
          ...enData.example_tasks.advanced.map((task) => 
            createTaskTemplate(task, 'advanced', taskOrder++)
          )
        ];
        
        const discoveryData = {
          careerType: careerPath,
          pathId: enData.path_id,
          skillFocus: enData.metadata.skill_focus,
          worldSetting: enData.world_setting,
          startingScenario: enData.starting_scenario,
          skillTree: enData.skill_tree,
          milestoneQuests: enData.milestone_quests,
          achievements: enData.achievements,
          careerOutcomes: enData.career_outcomes
        };
        
        const aiModules = {
          tutor: {
            enabled: true,
            model: 'gemini-2.5-flash',
            personality: 'career_mentor',
            systemPrompt: `You are a ${enData.metadata.title.toLowerCase()} mentor in the ${enData.world_setting.name}. Guide learners through their career exploration journey with practical advice and encouragement.`
          },
          evaluator: {
            enabled: true,
            model: 'gemini-2.5-flash',
            criteria: ['understanding', 'application', 'creativity', 'career_readiness']
          }
        };
        
        const resources = {
          careerGuides: enData.career_outcomes.map(outcome => ({
            title: outcome,
            type: 'career_path',
            description: `Learn more about becoming a ${outcome.toLowerCase()}`
          })),
          skillResources: enData.metadata.skill_focus.map(skill => ({
            title: skill.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type: 'skill_development',
            description: `Resources for developing ${skill.replace(/_/g, ' ')} skills`
          }))
        };
        
        const metadata = {
          category: enData.category,
          skillFocus: enData.metadata.skill_focus,
          estimatedHours: enData.metadata.estimated_hours,
          difficultyRange: enData.difficulty_range,
          atmosphere: enData.world_setting.atmosphere,
          visualTheme: enData.world_setting.visual_theme
        };
        
        try {
          await pool.query(insertQuery, [
            scenarioId,
            'discovery',
            'active',
            '1.0.0',
            'yaml',
            `discovery_data/${careerPath}`,
            careerPath,
            JSON.stringify({
              careerPath,
              category: enData.category,
              difficultyRange: enData.difficulty_range,
              estimatedHours: enData.metadata.estimated_hours
            }),
            JSON.stringify(title),
            JSON.stringify(description),
            JSON.stringify(objectives),
            'intermediate',
            enData.metadata.estimated_hours * 60, // Convert hours to minutes
            JSON.stringify([]),
            JSON.stringify(taskTemplates),
            JSON.stringify({ completion: 100 }),
            JSON.stringify({}),
            JSON.stringify({}),
            JSON.stringify(discoveryData),
            JSON.stringify({}),
            JSON.stringify(aiModules),
            JSON.stringify(resources),
            JSON.stringify(metadata)
          ]);
          
          loadedCount++;
          console.log(`  ✅ Created scenario: ${title.en}`);
        } catch (error) {
          console.error(`  ❌ Failed to create scenario for ${careerPath}:`, error);
        }
      } else {
        console.error(`  ❌ Missing English base data for ${careerPath}`);
      }
    }
    
    console.log(`\n🎉 Successfully loaded ${loadedCount} Discovery scenarios from YAML files!`);
    
    // Verify the results
    const result = await pool.query("SELECT id, title->>'en' as title_en, source_id FROM scenarios WHERE mode = 'discovery' ORDER BY created_at");
    console.log(`\n📊 Database now contains ${result.rows.length} Discovery scenarios:`);
    
    for (const row of result.rows) {
      console.log(`  - ${row.title_en || 'Untitled'} (${row.source_id})`);
    }
    
  } catch (error) {
    console.error('❌ Error loading Discovery scenarios:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  loadDiscoveryScenarios()
    .then(() => {
      console.log('\n✅ Discovery scenario loading completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { loadDiscoveryScenarios };