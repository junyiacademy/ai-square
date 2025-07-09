/**
 * Example usage of the new GCS V2 repositories
 * This demonstrates how to use the unified learning architecture
 */

import {
  getScenarioRepository,
  getProgramRepository,
  getTaskRepository,
  getEvaluationRepository,
} from './repository-factory';

async function examplePBLFlow() {
  // 1. Create a scenario from a PBL YAML file
  const scenarioRepo = getScenarioRepository();
  const scenario = await scenarioRepo.create({
    sourceType: 'pbl',
    sourceRef: {
      type: 'yaml',
      path: 'pbl_data/smart-city-sustainability_scenario.yaml',
      metadata: {},
    },
    title: 'Smart City Sustainability Project',
    description: 'Work with AI to design sustainable smart city solutions',
    objectives: [
      'Understand AI applications in urban planning',
      'Learn about sustainability metrics',
      'Design AI-powered solutions'
    ],
    taskTemplates: [
      {
        id: 'task-1',
        title: 'Research Phase',
        type: 'chat',
      },
      {
        id: 'task-2',
        title: 'Design Phase',
        type: 'chat',
      },
      {
        id: 'task-3',
        title: 'Implementation Planning',
        type: 'chat',
      }
    ],
  });

  console.log('Created scenario:', scenario.id);

  // 2. User starts a program (instance of the scenario)
  const programRepo = getProgramRepository();
  const program = await programRepo.create({
    scenarioId: scenario.id,
    userId: 'user@example.com',
    metadata: {
      startReason: 'Learning about AI in urban planning',
      userLevel: 'intermediate',
    },
  });

  console.log('Started program:', program.id);

  // 3. Create tasks for the program
  const taskRepo = getTaskRepository();
  const taskIds: string[] = [];

  for (let i = 0; i < scenario.taskTemplates.length; i++) {
    const template = scenario.taskTemplates[i];
    const task = await taskRepo.create({
      programId: program.id,
      scenarioTaskIndex: i,
      title: template.title,
      type: template.type as 'chat',
      content: {
        instructions: 'Work with AI to complete this phase',
      },
    });
    taskIds.push(task.id);
  }

  // Update program with task IDs
  await programRepo.updateTaskIds(program.id, taskIds);

  // 4. User interacts with first task
  const firstTask = taskIds[0];
  await taskRepo.addInteraction(firstTask, {
    timestamp: new Date().toISOString(),
    type: 'user_input',
    content: {
      message: 'What are the key sustainability metrics for smart cities?',
    },
  });

  await taskRepo.addInteraction(firstTask, {
    timestamp: new Date().toISOString(),
    type: 'ai_response',
    content: {
      message: 'Key sustainability metrics for smart cities include...',
      metadata: {
        model: 'gemini-2.5-flash',
        tokens: 150,
      },
    },
  });

  // 5. Complete and evaluate the task
  await taskRepo.complete(firstTask);

  const evaluationRepo = getEvaluationRepository();
  const taskEvaluation = await evaluationRepo.create({
    targetType: 'task',
    targetId: firstTask,
    evaluationType: 'pbl_task',
    score: 85,
    feedback: 'Excellent understanding of sustainability metrics',
    dimensions: [
      {
        name: 'Understanding',
        score: 90,
        feedback: 'Demonstrated clear understanding',
      },
      {
        name: 'Application',
        score: 80,
        feedback: 'Good practical examples',
      },
    ],
    metadata: {
      programId: program.id,
      evaluatedBy: 'ai',
    },
  });

  // 6. Complete the program after all tasks
  await programRepo.updateProgress(program.id, 3);
  await programRepo.complete(program.id);

  // 7. Final program evaluation
  const programEvaluation = await evaluationRepo.create({
    targetType: 'program',
    targetId: program.id,
    evaluationType: 'pbl_completion',
    score: 88,
    feedback: 'Successfully completed the Smart City Sustainability project',
    metadata: {
      completionTime: '2 hours',
      totalInteractions: 15,
    },
  });

  // 8. Query data
  const userPrograms = await programRepo.findByUser('user@example.com');
  console.log('User has', userPrograms.length, 'programs');

  const programTasks = await taskRepo.findByProgram(program.id);
  console.log('Program has', programTasks.length, 'tasks');

  const evaluations = await evaluationRepo.findByProgram(program.id);
  console.log('Found', evaluations.length, 'evaluations');
}

// Example for Discovery flow
async function exampleDiscoveryFlow() {
  const scenarioRepo = getScenarioRepository();
  
  // Create an AI-generated discovery scenario
  const scenario = await scenarioRepo.create({
    sourceType: 'discovery',
    sourceRef: {
      type: 'ai-generated',
      sourceId: 'discovery-001',
      metadata: {
        topic: 'AI Ethics',
        generatedBy: 'gemini-2.5-flash',
      },
    },
    title: 'Exploring AI Ethics',
    description: 'An interactive exploration of ethical considerations in AI',
    objectives: [
      'Understand key ethical principles',
      'Explore real-world dilemmas',
      'Develop ethical reasoning skills',
    ],
    taskTemplates: [
      {
        id: 'explore-1',
        title: 'Introduction to AI Ethics',
        type: 'discovery',
      },
    ],
  });

  // Rest of the flow is similar...
}

// Export example functions for testing
export { examplePBLFlow, exampleDiscoveryFlow };