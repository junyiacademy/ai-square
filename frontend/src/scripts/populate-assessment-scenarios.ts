/* eslint-disable @typescript-eslint/no-unused-vars */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'yaml';
import { repositoryFactory } from '../lib/repositories/base/repository-factory';
import { 
  IScenario, 
  LearningMode, 
  SourceType, 
  ScenarioStatus
} from '../types/unified-learning';

interface AssessmentQuestion {
  id: string;
  domain: string;
  difficulty: string;
  type: string;
  correct_answer: string;
  question: string;
  options: Record<string, string>;
  explanation: string;
  ksa_mapping?: {
    knowledge?: string[];
    skills?: string[];
    attitudes?: string[];
  };
}

interface AssessmentTask {
  id: string;
  title: string;
  description: string;
  time_limit_minutes: number;
  questions: AssessmentQuestion[];
}

interface AssessmentYAML {
  assessment_config: {
    id: string;
    title: string;
    description: string;
    total_questions: number;
    time_limit_minutes: number;
    passing_score: number;
    domains: Record<string, {
      description: string;
      questions: number;
    }>;
  };
  tasks: AssessmentTask[];
}

// Language codes to process - skip zhTW and zhCN due to YAML parsing issues
const LANGUAGES = ['en', 'es', 'pt', 'ar', 'id', 'th', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];

async function loadAssessmentData(language: string): Promise<AssessmentYAML | null> {
  try {
    const filePath = resolve(`public/assessment_data/ai_literacy/ai_literacy_questions_${language}.yaml`);
    console.log(`Loading assessment data for language: ${language}`);
    const content = readFileSync(filePath, 'utf8');
    return parse(content);
  } catch (_error) {
    console.error(`Failed to load assessment data for ${language}:`, error);
    return null;
  }
}

async function populateAssessmentScenarios() {
  console.log('🚀 Starting Assessment scenarios population...');
  
  const scenarioRepo = repositoryFactory.getScenarioRepository();
  
  try {
    // Load all language versions
    const assessmentDataByLanguage: Record<string, AssessmentYAML> = {};
    
    for (const lang of LANGUAGES) {
      const data = await loadAssessmentData(lang);
      if (data) {
        assessmentDataByLanguage[lang] = data;
      }
    }
    
    if (Object.keys(assessmentDataByLanguage).length === 0) {
      console.error('❌ No assessment data loaded');
      return;
    }
    
    // Use English as the base
    const baseData = assessmentDataByLanguage.en;
    if (!baseData) {
      console.error('❌ English assessment data is required');
      return;
    }
    
    // Prepare multilingual fields
    const title: Record<string, string> = {};
    const description: Record<string, string> = {};
    const objectives: Record<string, string[]> = {};
    
    // Extract questions in all languages
    const questionsByLanguage: Record<string, AssessmentQuestion[]> = {};
    
    for (const [lang, data] of Object.entries(assessmentDataByLanguage)) {
      const langCode = lang === 'zhTW' ? 'zh-TW' : lang === 'zhCN' ? 'zh-CN' : lang;
      title[langCode] = data.assessment_config.title;
      description[langCode] = data.assessment_config.description;
      objectives[langCode] = [
        'Understand AI capabilities and limitations',
        'Develop skills for effective AI interaction',
        'Learn responsible AI usage practices',
        'Build strategic thinking about AI applications'
      ];
      
      // Flatten all questions from all tasks
      const allQuestions: AssessmentQuestion[] = [];
      if (data.tasks && Array.isArray(data.tasks)) {
        for (const task of data.tasks) {
          if (task.questions && Array.isArray(task.questions)) {
            allQuestions.push(...task.questions);
          }
        }
      }
      questionsByLanguage[langCode] = allQuestions;
    }
    
    // Check if assessment scenario already exists
    const existingScenarios = await scenarioRepo.findByMode('assessment');
    const existingScenario = existingScenarios.find(s => s.sourcePath === 'ai_literacy_questions');
    
    if (existingScenario) {
      console.log('📝 Assessment scenario already exists, updating...');
      
      // Update with multilingual questions
      const updatedData: Partial<IScenario> = {
        title,
        description,
        objectives,
        assessmentData: {
          config: baseData.assessment_config,
          domains: baseData.assessment_config.domains,
          questions: questionsByLanguage,
          tasks: baseData.tasks.map(task => ({
            ...task,
            questions: undefined // Remove questions from task level, they're stored at top level
          }))
        },
        updatedAt: new Date()
      };
      
      await scenarioRepo.update(existingScenario.id, updatedData);
      console.log('✅ Updated existing assessment scenario with questions');
    } else {
      // Create new assessment scenario
      const scenarioData: IScenario = {
        id: '', // Will be generated
        mode: 'assessment' as LearningMode,
        status: 'active' as ScenarioStatus,
        sourceType: 'yaml' as SourceType,
        sourcePath: 'ai_literacy_questions',
        sourceMetadata: {
          folderName: 'ai_literacy',
          languages: LANGUAGES
        },
        title,
        description,
        objectives,
        difficulty: 'intermediate', // Assessment adapts to user level
        estimatedTime: baseData.assessment_config.time_limit_minutes,
        taskTemplates: baseData.tasks.map(task => ({
          id: task.id,
          type: 'question',
          title: task.title,
          instructions: task.description,
          context: {
            timeLimit: task.time_limit_minutes,
            questionCount: task.questions.length
          }
        })),
        assessmentData: {
          config: baseData.assessment_config,
          domains: baseData.assessment_config.domains,
          questions: questionsByLanguage,
          tasks: baseData.tasks.map(task => ({
            ...task,
            questions: undefined // Remove questions from task level
          }))
        },
        resources: [],
        aiModules: {
          evaluation: {
            enabled: true,
            model: 'gemini-2.5-flash',
            temperature: 0.3,
            maxTokens: 1000,
            systemPrompt: 'Evaluate assessment responses and provide constructive feedback'
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const created = await scenarioRepo.create(scenarioData);
      console.log(`✅ Created assessment scenario: ${created.id}`);
    }
    
    // Verify the data
    const assessmentScenarios = await scenarioRepo.findByMode('assessment');
    console.log(`\n📊 Total assessment scenarios in database: ${assessmentScenarios.length}`);
    
    for (const scenario of assessmentScenarios) {
      const questionCount = scenario.assessmentData?.questions?.en?.length || 0;
      console.log(`  - ${scenario.title.en}: ${questionCount} questions`);
    }
    
  } catch (_error) {
    console.error('❌ Failed to populate assessment scenarios:', error);
    throw error;
  } finally {
    // Repository factory doesn't have a close method, it uses singleton pattern
  }
}

// Run the population
populateAssessmentScenarios()
  .then(() => {
    console.log('\n✅ Assessment scenarios population completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to populate assessment scenarios:', error);
    process.exit(1);
  });