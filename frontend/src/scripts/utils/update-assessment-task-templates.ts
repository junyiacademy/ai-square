import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'yaml';
import { repositoryFactory } from '../lib/repositories/base/repository-factory';

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

async function updateAssessmentTaskTemplates() {
  console.log('🚀 Updating Assessment task_templates...');
  
  const scenarioRepo = repositoryFactory.getScenarioRepository();
  
  try {
    // Load English YAML as base
    const filePath = resolve('public/assessment_data/ai_literacy/ai_literacy_questions_en.yaml');
    const content = readFileSync(filePath, 'utf8');
    const yamlData = parse(content) as AssessmentYAML;
    
    console.log(`📋 Loaded ${yamlData.tasks.length} tasks from YAML`);
    
    // Get existing assessment scenarios
    const scenarios = await scenarioRepo.findByMode('assessment');
    console.log(`🔍 Found ${scenarios.length} assessment scenarios`);
    
    for (const scenario of scenarios) {
      // Process all assessment scenarios
      console.log(`   Source metadata:`, scenario.sourceMetadata);
      
      console.log(`\n📝 Updating scenario: ${scenario.id}`);
      console.log(`   Title: ${scenario.title.en || scenario.title}`);
      
      // Prepare task templates with full question data
      const taskTemplates = yamlData.tasks.map(task => ({
        id: task.id,
        type: 'question' as const,
        title: task.title,
        description: task.description,
        instructions: task.description,
        context: {
          timeLimit: task.time_limit_minutes * 60, // Convert to seconds
          questionCount: task.questions.length,
          domain: task.id
        },
        // Include the full questions data
        content: {
          questions: task.questions
        }
      }));
      
      // Update scenario with full task templates
      await scenarioRepo.update(scenario.id, {
        task_templates: taskTemplates,
        updatedAt: new Date()
      });
      
      console.log(`✅ Updated task_templates with ${taskTemplates.length} tasks`);
      
      // Verify update
      const updated = await scenarioRepo.findById(scenario.id);
      if (updated?.task_templates && Array.isArray(updated.task_templates)) {
        console.log(`✅ Verified: ${updated.task_templates.length} task templates saved`);
        const totalQuestions = updated.task_templates.reduce((sum, t) => 
          sum + (t.content?.questions?.length || 0), 0
        );
        console.log(`📊 Total questions across all tasks: ${totalQuestions}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to update task templates:', error);
    throw error;
  }
}

// Run the update
updateAssessmentTaskTemplates()
  .then(() => {
    console.log('\n✅ Task templates update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to update task templates:', error);
    process.exit(1);
  });