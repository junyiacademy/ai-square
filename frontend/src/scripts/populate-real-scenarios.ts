/* eslint-disable @typescript-eslint/no-unused-vars */
#!/usr/bin/env npx tsx

import { readFile } from 'fs/promises';
import * as yaml from 'js-yaml';
import dotenv from 'dotenv';
import path from 'path';
import { repositoryFactory } from '../lib/repositories/base/repository-factory';
import { IScenario, LearningMode, SourceType, ScenarioStatus } from '../types/unified-learning';

// Load environment variables from frontend directory
const envPath = path.join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

interface PBLYAMLScenario {
  scenario_info: {
    id: string;
    difficulty: string;
    estimated_duration: number;
    target_domains: string[];
    title: string;
    description: string;
    prerequisites: string[];
    learning_objectives: string[];
  };
  ksa_mapping: {
    knowledge: string[];
    skills: string[];
    attitudes: string[];
  };
  tasks: unknown[];
  [key: string]: unknown;
}

interface DiscoveryYAML {
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
  world_setting: unknown;
  starting_scenario: unknown;
  skill_tree: unknown;
  [key: string]: unknown;
}

async function loadYAMLFile(filePath: string): Promise<unknown> {
  try {
    const content = await readFile(filePath, 'utf8');
    return yaml.load(content);
  } catch (_error) {
    console.error(`Error loading ${filePath}:`, error);
    return null;
  }
}

async function clearExistingScenarios(mode: LearningMode) {
  const scenarioRepo = repositoryFactory.getScenarioRepository();
  
  console.log(`\n🗑️  Clearing existing ${mode} scenarios...`);
  
  const existingScenarios = await scenarioRepo.findByMode(mode);
  console.log(`Found ${existingScenarios.length} existing ${mode} scenarios`);
  
  for (const scenario of existingScenarios) {
    try {
      await scenarioRepo.delete(scenario.id);
      console.log(`  ✅ Deleted: ${scenario.id}`);
    } catch (_error) {
      console.error(`  ❌ Failed to delete ${scenario.id}:`, error);
    }
  }
}

async function importPBLScenarios() {
  const scenarioRepo = repositoryFactory.getScenarioRepository();
  const scenarioFolders = [
    'ai_education_design',
    'ai_job_search',
    'ai_robotics_development',
    'ai_stablecoin_trading',
    'high_school_climate_change',
    'high_school_creative_arts',
    'high_school_digital_wellness',
    'high_school_health_assistant',
    'high_school_smart_city'
  ];
  
  console.log('\n📚 Importing PBL scenarios...');
  
  for (const folder of scenarioFolders) {
    console.log(`\nProcessing PBL scenario: ${folder}`);
    
    // Load English version for base data
    const enPath = path.join(process.cwd(), 'public/pbl_data/scenarios', folder, `${folder}_en.yaml`);
    const enData = await loadYAMLFile(enPath) as PBLYAMLScenario;
    
    if (!enData) {
      console.error(`❌ Failed to load English file for ${folder}`);
      continue;
    }
    
    // Build multilingual title and description
    const title: Record<string, string> = { en: enData.scenario_info.title };
    const description: Record<string, string> = { en: enData.scenario_info.description };
    
    // Load other languages
    const languages = ['zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];
    for (const lang of languages) {
      const langPath = path.join(process.cwd(), 'public/pbl_data/scenarios', folder, `${folder}_${lang}.yaml`);
      const langData = await loadYAMLFile(langPath) as PBLYAMLScenario;
      
      if (langData && langData.scenario_info) {
        title[lang] = langData.scenario_info.title;
        description[lang] = langData.scenario_info.description;
      }
    }
    
    // Create scenario in database
    const scenario: Omit<IScenario, 'id' | 'createdAt' | 'updatedAt'> = {
      mode: 'pbl',
      status: 'active' as ScenarioStatus,
      sourceType: 'yaml' as SourceType,
      sourcePath: `pbl_data/scenarios/${folder}`,
      sourceMetadata: {
        folder: folder,
        originalId: enData.scenario_info.id || folder,
        difficulty: enData.scenario_info.difficulty,
        estimated_duration: enData.scenario_info.estimated_duration,
        target_domains: enData.scenario_info.target_domains
      },
      title,
      description,
      objectives: enData.scenario_info.learning_objectives || [],
      taskTemplates: enData.tasks || [],
      pblData: {
        ksaMapping: enData.ksa_mapping,
        prerequisites: enData.scenario_info.prerequisites || [],
        originalData: enData
      },
      aiModules: enData.ai_modules || {},
      resources: enData.resources || {}
    };
    
    try {
      const created = await scenarioRepo.create(scenario);
      console.log(`  ✅ Created PBL scenario: ${created.id} - ${title.en}`);
    } catch (_error) {
      console.error(`  ❌ Failed to create PBL scenario ${folder}:`, error);
    }
  }
}

async function importDiscoveryScenarios() {
  const scenarioRepo = repositoryFactory.getScenarioRepository();
  const careerTypes = [
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
  
  console.log('\n🚀 Importing Discovery scenarios...');
  
  for (const careerType of careerTypes) {
    console.log(`\nProcessing Discovery scenario: ${careerType}`);
    
    // Load English version for base data
    const enPath = path.join(process.cwd(), 'public/discovery_data', careerType, `${careerType}_en.yml`);
    const enData = await loadYAMLFile(enPath) as DiscoveryYAML;
    
    if (!enData || !enData.metadata) {
      console.error(`❌ Failed to load English file for ${careerType}`);
      continue;
    }
    
    // Build multilingual title and description
    const title: Record<string, string> = { en: enData.metadata.title };
    const description: Record<string, string> = { en: enData.metadata.short_description };
    
    // Load other languages
    const languages = ['zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];
    for (const lang of languages) {
      const langPath = path.join(process.cwd(), 'public/discovery_data', careerType, `${careerType}_${lang}.yml`);
      const langData = await loadYAMLFile(langPath) as DiscoveryYAML;
      
      if (langData && langData.metadata) {
        title[lang] = langData.metadata.title;
        description[lang] = langData.metadata.short_description;
      }
    }
    
    // Create scenario in database
    const scenario: Omit<IScenario, 'id' | 'createdAt' | 'updatedAt'> = {
      mode: 'discovery',
      status: 'active' as ScenarioStatus,
      sourceType: 'yaml' as SourceType,
      sourcePath: `discovery_data/${careerType}`,
      sourceMetadata: {
        careerType: careerType,
        originalId: enData.path_id || careerType,
        skillFocus: enData.metadata.skill_focus || [],
        category: enData.category || 'general',
        estimated_hours: enData.metadata.estimated_hours
      },
      title,
      description,
      objectives: {},
      taskTemplates: [],
      discoveryData: {
        careerType: careerType,
        skillFocus: enData.metadata.skill_focus || [],
        category: enData.category || 'general',
        worldSetting: enData.world_setting,
        startingScenario: enData.starting_scenario,
        skillTree: enData.skill_tree,
        originalData: enData
      },
      aiModules: {},
      resources: {}
    };
    
    try {
      const created = await scenarioRepo.create(scenario);
      console.log(`  ✅ Created Discovery scenario: ${created.id} - ${title.en}`);
    } catch (_error) {
      console.error(`  ❌ Failed to create Discovery scenario ${careerType}:`, error);
    }
  }
}

async function main() {
  console.log('🚀 Starting real scenarios import...');
  console.log('📊 Database:', process.env.DB_NAME);
  
  try {
    // Clear existing scenarios
    await clearExistingScenarios('pbl');
    await clearExistingScenarios('discovery');
    
    // Import new scenarios from YAML
    await importPBLScenarios();
    await importDiscoveryScenarios();
    
    // Verify final counts
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const pblCount = (await scenarioRepo.findByMode('pbl')).length;
    const discoveryCount = (await scenarioRepo.findByMode('discovery')).length;
    const assessmentCount = (await scenarioRepo.findByMode('assessment')).length;
    
    console.log('\n✅ Import completed!');
    console.log(`📊 Final counts:`);
    console.log(`  - PBL scenarios: ${pblCount}`);
    console.log(`  - Discovery scenarios: ${discoveryCount}`);
    console.log(`  - Assessment scenarios: ${assessmentCount}`);
    
  } catch (_error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);