/* eslint-disable @typescript-eslint/no-unused-vars */
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

async function fixAssessmentTaskTemplates() {
  console.log('🚀 Fixing Assessment task_templates...');
  
  const scenarioRepo = repositoryFactory.getScenarioRepository();
  
  try {
    // Load English YAML as base
    const filePath = resolve('public/assessment_data/ai_literacy/ai_literacy_questions_en.yaml');
    const content = readFileSync(filePath, 'utf8');
    const yamlData = parse(content) as AssessmentYAML;
    
    console.log(`📋 Loaded ${yamlData.tasks.length} tasks from YAML`);
    
    // Target the specific scenario with configPath
    const targetId = '75cbb8d3-6d3d-4220-9b0c-7a12e4f3e0ad';
    
    console.log(`\n📝 Updating scenario: ${targetId}`);
    
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
    
    console.log(`📊 Prepared ${taskTemplates.length} task templates`);
    console.log(`   Total questions: ${taskTemplates.reduce((sum, t) => sum + t.content.questions.length, 0)}`);
    
    // Update scenario with full task templates
    const updateData = {
      taskTemplates: taskTemplates, // Note: camelCase for TypeScript interface
      updatedAt: new Date()
    };
    
    await scenarioRepo.update(targetId, updateData);
    
    console.log(`✅ Updated task_templates with ${taskTemplates.length} tasks`);
    
    // Verify update
    const updated = await scenarioRepo.findById(targetId);
    if (updated?.task_templates && Array.isArray(updated.task_templates)) {
      console.log(`✅ Verified: ${updated.task_templates.length} task templates saved`);
      const totalQuestions = updated.task_templates.reduce((sum: number, t: any) => 
        sum + (t.content?.questions?.length || 0), 0
      );
      console.log(`📊 Total questions across all tasks: ${totalQuestions}`);
      
      // Show first task as example
      const firstTask = updated.task_templates[0];
      console.log(`\n📋 Example task: ${firstTask.title}`);
      console.log(`   Questions: ${firstTask.content?.questions?.length || 0}`);
      if (firstTask.content?.questions?.[0]) {
        console.log(`   First question: ${firstTask.content.questions[0].question.substring(0, 60)}...`);
      }
    }
    
  } catch (_error) {
    console.error('❌ Failed to update task templates:', error);
    throw error;
  }
}

// Run the update
fixAssessmentTaskTemplates()
  .then(() => {
    console.log('\n✅ Task templates update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to update task templates:', error);
    process.exit(1);
  });