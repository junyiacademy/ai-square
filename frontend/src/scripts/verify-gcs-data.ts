/**
 * Quick script to verify GCS data and show summary
 */

import {
  getScenarioRepository,
  getProgramRepository,
  getTaskRepository,
  getEvaluationRepository,
} from '@/lib/implementations/gcs-v2';

async function verifyAndSummarize() {
  console.log('\n📊 GCS Data Verification Report\n');
  console.log('Bucket:', process.env.GCS_BUCKET_NAME || 'not configured');
  console.log('Project:', process.env.GOOGLE_CLOUD_PROJECT || 'not configured');
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // Get all data
    const scenarios = await getScenarioRepository().listAll();
    const programs = await getProgramRepository().listAll();
    const tasks = await getTaskRepository().listAll();
    const evaluations = await getEvaluationRepository().listAll();

    // Summary
    console.log('📁 Data Summary:');
    console.log(`- Scenarios: ${scenarios.length}`);
    console.log(`- Programs: ${programs.length}`);
    console.log(`- Tasks: ${tasks.length}`);
    console.log(`- Evaluations: ${evaluations.length}`);
    console.log('\n' + '='.repeat(60) + '\n');

    // Show scenarios
    console.log('🎯 Scenarios:');
    for (const scenario of scenarios) {
      console.log(`\n[${scenario.sourceType.toUpperCase()}] ${scenario.title}`);
      console.log(`ID: ${scenario.id}`);
      console.log(`Created: ${scenario.createdAt}`);
      console.log(`Tasks: ${scenario.taskTemplates.length}`);
      
      // Find related programs
      const relatedPrograms = programs.filter(p => p.scenarioId === scenario.id);
      console.log(`Programs using this scenario: ${relatedPrograms.length}`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Show programs with details
    console.log('👥 Programs:');
    for (const program of programs) {
      console.log(`\nProgram ID: ${program.id}`);
      console.log(`User: ${program.userId}`);
      console.log(`Status: ${program.status}`);
      console.log(`Started: ${program.startedAt}`);
      
      // Find scenario
      const scenario = scenarios.find(s => s.id === program.scenarioId);
      console.log(`Scenario: ${scenario?.title || 'Unknown'}`);
      
      // Find tasks
      const programTasks = tasks.filter(t => t.programId === program.id);
      console.log(`Tasks: ${programTasks.length}`);
      
      // Show task details
      if (programTasks.length > 0) {
        console.log('  Task Details:');
        for (const task of programTasks) {
          console.log(`  - ${task.title} (${task.status})`);
          console.log(`    Interactions: ${task.interactions.length}`);
        }
      }
      
      // Find evaluations
      const programEvals = evaluations.filter(e => 
        (e.targetType === 'program' && e.targetId === program.id) ||
        (e.targetType === 'task' && programTasks.some(t => t.id === e.targetId))
      );
      console.log(`Evaluations: ${programEvals.length}`);
      
      if (programEvals.length > 0) {
        const avgScore = programEvals.reduce((sum, e) => sum + (e.score || 0), 0) / programEvals.length;
        console.log(`Average Score: ${avgScore.toFixed(1)}`);
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Show sample interaction
    const tasksWithInteractions = tasks.filter(t => t.interactions.length > 0);
    if (tasksWithInteractions.length > 0) {
      console.log('💬 Sample Task Interaction:');
      const sampleTask = tasksWithInteractions[0];
      console.log(`\nTask: ${sampleTask.title}`);
      console.log('Interactions:');
      
      for (const interaction of sampleTask.interactions.slice(0, 2)) {
        console.log(`\n[${interaction.type}] ${new Date(interaction.timestamp).toLocaleTimeString()}`);
        if (interaction.content.message) {
          console.log(interaction.content.message.substring(0, 200) + '...');
        }
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // GCS commands
    console.log('🔍 Useful GCS Commands:\n');
    console.log('# List all files:');
    console.log('gsutil ls -r gs://ai-square-db-v2/v2/\n');
    
    if (scenarios.length > 0) {
      console.log('# View a scenario:');
      console.log(`gsutil cat gs://ai-square-db-v2/v2/scenarios/${scenarios[0].id}.json | jq\n`);
    }
    
    if (tasks.length > 0) {
      console.log('# View a task with interactions:');
      console.log(`gsutil cat gs://ai-square-db-v2/v2/tasks/${tasks[0].id}.json | jq\n`);
    }

    console.log('# Count total files:');
    console.log('gsutil ls -r gs://ai-square-db-v2/v2/ | grep -c ".json"\n');

    console.log('✅ Verification complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Set environment variables if running directly
if (require.main === module) {
  process.env.GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'ai-square-463013';
  process.env.GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ai-square-db-v2';
  process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS || '/Users/young/project/ai-square/ai-square-key.json';
}

verifyAndSummarize();