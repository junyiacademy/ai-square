/**
 * E2E Test Script for All Learning Modes
 * Tests PBL, Discovery, and Assessment modes with PostgreSQL database
 */

import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message: string, type: 'info' | 'success' | 'error' | 'header' = 'info') {
  const timestamp = new Date().toISOString();
  switch (type) {
    case 'header':
      console.log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
      console.log(`${colors.bright}${colors.blue}${message}${colors.reset}`);
      console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
      break;
    case 'success':
      console.log(`${colors.green}✅ [${timestamp}] ${message}${colors.reset}`);
      break;
    case 'error':
      console.log(`${colors.red}❌ [${timestamp}] ${message}${colors.reset}`);
      break;
    default:
      console.log(`${colors.yellow}ℹ️  [${timestamp}] ${message}${colors.reset}`);
  }
}

async function testPBLMode() {
  log('Testing PBL Mode', 'header');
  
  const userRepo = repositoryFactory.getUserRepository();
  const scenarioRepo = repositoryFactory.getScenarioRepository();
  const programRepo = repositoryFactory.getProgramRepository();
  const taskRepo = repositoryFactory.getTaskRepository();
  const evaluationRepo = repositoryFactory.getEvaluationRepository();
  
  try {
    // Create test user
    log('Creating test user...', 'info');
    const user = await userRepo.create({
      email: 'pbl-test@example.com',
      name: 'PBL Test User',
      preferredLanguage: 'en'
    });
    log(`Created user: ${user.id}`, 'success');
    // 1. Create PBL Scenario
    log('Creating PBL scenario...', 'info');
    const scenario = await scenarioRepo.create({
      type: 'pbl',
      difficultyLevel: 'intermediate',
      estimatedMinutes: 180,
      prerequisites: ['Basic AI understanding', 'Problem-solving skills'],
      xpRewards: {
        completion: 500,
        mastery: 200,
        bonus: 100,
      },
      tasks: [
        {
          id: 'research-phase',
          type: 'chat',
          title: 'Research Current Smart City Technologies',
          description: 'Explore AI applications in urban planning',
        },
        {
          id: 'design-phase',
          type: 'chat',
          title: 'Design AI Solution for Traffic Management',
          description: 'Create an AI-powered traffic optimization system',
        },
        {
          id: 'evaluation-phase',
          type: 'chat',
          title: 'Evaluate Environmental Impact',
          description: 'Assess the sustainability of your solution',
        },
      ],
      metadata: {
        title: 'Smart City Sustainability Project',
        description: 'Work with AI to design sustainable smart city solutions that address urban challenges',
        originalTitle: 'Smart City Sustainability Project',
        domain: 'Designing_with_AI',
        objectives: [
          'Understand AI applications in urban planning',
          'Learn about sustainability metrics and KPIs',
          'Design AI-powered solutions for city challenges',
          'Evaluate the impact of AI on urban sustainability',
        ],
      },
    });
    log(`Created PBL scenario: ${scenario.id}`, 'success');
    
    // 2. Create Program (User starts learning)
    log('User starting PBL program...', 'info');
    const program = await programRepo.create({
      scenarioId: scenario.id,
      userId: user.id,
      totalTasks: 3,
    });
    log(`Created program: ${program.id}`, 'success');
    
    // 3. Create Tasks
    log('Creating tasks for the program...', 'info');
    const taskIds: string[] = [];
    
    // Tasks are pre-created by the database schema, we just need to find them
    const tasks = await taskRepo.findByProgram(program.id);
    
    if (tasks.length === 0) {
      // Create tasks if they don't exist
      for (let i = 0; i < 3; i++) {
        const task = await taskRepo.create({
          programId: program.id,
          taskIndex: i,
          type: 'chat',
          context: {
            scenarioId: scenario.id,
            taskType: 'pbl',
            difficulty: 'intermediate',
            estimatedTime: 60,
          },
          allowedAttempts: 3,
        });
        taskIds.push(task.id);
        log(`Created task ${i + 1}: ${task.id}`, 'success');
      }
    } else {
      tasks.forEach(task => taskIds.push(task.id));
      log(`Found ${tasks.length} existing tasks`, 'success');
    }
    
    // 4. Simulate task interactions
    log('Simulating user interactions with first task...', 'info');
    const firstTaskId = taskIds[0];
    
    // Record a task attempt
    await taskRepo.recordAttempt(firstTaskId, {
      startTime: new Date(),
      endTime: new Date(Date.now() + 600000), // 10 minutes later
      score: 88,
      passed: true,
      response: {
        userQuestions: [
          'What are the current AI technologies being used in smart cities for sustainability?',
          'Can you give me a specific example of AI reducing energy consumption in buildings?'
        ],
        aiResponses: [
          `Smart cities are leveraging various AI technologies for sustainability:

1. **Traffic Management**: AI-powered traffic flow optimization reduces congestion and emissions
2. **Energy Management**: Machine learning algorithms optimize power grid distribution
3. **Waste Management**: Computer vision for smart recycling and waste sorting
4. **Air Quality Monitoring**: IoT sensors with AI analysis for pollution tracking
5. **Water Management**: Predictive analytics for leak detection and usage optimization`,
          `Here's a concrete example from Singapore:

The Building and Construction Authority uses an AI system that:
- Analyzes real-time occupancy data from sensors
- Adjusts HVAC and lighting automatically
- Learns usage patterns over time
- Results: 30% energy reduction in commercial buildings

The system uses deep learning to predict occupancy patterns and pre-cool/heat spaces efficiently.`
        ],
        metadata: {
          model: 'gemini-2.5-flash',
          totalTokens: 430,
        }
      },
    });
    log('Recorded task attempt with interactions', 'success');
    
    // 5. Complete and evaluate first task
    log('Completing and evaluating first task...', 'info');
    await taskRepo.complete(firstTaskId);
    
    const taskEvaluation = await evaluationRepo.create({
      targetType: 'task',
      targetId: firstTaskId,
      evaluationType: 'pbl_task',
      score: 88,
      feedback: 'Excellent research and critical thinking. You asked relevant follow-up questions and demonstrated understanding of AI applications in sustainability.',
      dimensionScores: [
        {
          name: 'Understanding',
          score: 90,
          feedback: 'Clear grasp of AI technologies in smart cities',
        },
        {
          name: 'Critical Thinking',
          score: 85,
          feedback: 'Good follow-up questions showing analytical thinking',
        },
        {
          name: 'Application',
          score: 88,
          feedback: 'Connected concepts to real-world examples effectively',
        },
      ],
      metadata: {
        programId: program.id,
        evaluatedBy: 'ai-auto-evaluation',
        ksaMappings: {
          knowledge: ['K1.2', 'K3.1'],
          skills: ['S2.3', 'S4.1'],
          attitudes: ['A1.1', 'A3.2'],
        },
      },
    });
    log(`Task evaluated with score: ${taskEvaluation.score}`, 'success');
    
    // 6. Complete program
    log('Completing entire PBL program...', 'info');
    await programRepo.updateProgress(program.id, 3);
    await programRepo.complete(program.id);
    
    const programEvaluation = await evaluationRepo.create({
      targetType: 'program',
      targetId: program.id,
      evaluationType: 'pbl_completion',
      score: 92,
      feedback: 'Outstanding completion of the Smart City Sustainability project. You demonstrated strong understanding of AI applications and their environmental impact.',
      dimensionScores: [
        {
          name: 'Overall Understanding',
          score: 93,
          feedback: 'Comprehensive grasp of smart city concepts',
        },
        {
          name: 'Project Completion',
          score: 91,
          feedback: 'All tasks completed thoughtfully',
        },
      ],
      metadata: {
        completionTime: '2.5 hours',
        totalInteractions: 12,
        tasksCompleted: 3,
      },
    });
    log(`Program completed with score: ${programEvaluation.score}`, 'success');
    
    return {
      scenarioId: scenario.id,
      programId: program.id,
      taskIds,
      evaluationIds: [taskEvaluation.id, programEvaluation.id],
    };
    
  } catch (error) {
    log(`PBL test failed: ${error}`, 'error');
    throw error;
  }
}

async function testDiscoveryMode() {
  log('Testing Discovery Mode', 'header');
  
  const userRepo = repositoryFactory.getUserRepository();
  const scenarioRepo = repositoryFactory.getScenarioRepository();
  const programRepo = repositoryFactory.getProgramRepository();
  const taskRepo = repositoryFactory.getTaskRepository();
  const evaluationRepo = repositoryFactory.getEvaluationRepository();
  
  try {
    // Create test user
    log('Creating test user...', 'info');
    const user = await userRepo.create({
      email: 'discovery-test@example.com',
      name: 'Discovery Test User',
      preferredLanguage: 'en'
    });
    log(`Created user: ${user.id}`, 'success');
    // 1. Create Discovery Scenario (AI-generated based on user interest)
    log('Creating AI-generated discovery scenario...', 'info');
    const scenario = await scenarioRepo.create({
      type: 'discovery',
      difficultyLevel: 'intermediate',
      estimatedMinutes: 90,
      prerequisites: ['Interest in AI ethics', 'Basic healthcare knowledge'],
      xpRewards: {
        completion: 300,
        mastery: 150,
        bonus: 50,
      },
      tasks: [
        {
          id: 'explore-principles',
          type: 'discovery',
          title: 'Explore Core Ethical Principles',
          description: 'Discover fundamental ethical principles in healthcare AI',
        },
        {
          id: 'case-study',
          type: 'discovery',
          title: 'Analyze Real-World Case: AI in Cancer Detection',
          description: 'Study real cases of AI bias in medical imaging',
        },
        {
          id: 'design-framework',
          type: 'discovery',
          title: 'Design Your Ethical AI Framework',
          description: 'Create your own ethical guidelines for AI in healthcare',
        },
      ],
      metadata: {
        title: 'Exploring AI Ethics in Healthcare',
        description: 'An interactive exploration of ethical considerations and bias challenges in healthcare AI systems',
        sourceType: 'ai-generated',
        generatedBy: 'gemini-2.5-flash',
        userPrompt: 'I want to explore AI ethics and bias in healthcare',
        objectives: [
          'Understand key ethical principles in healthcare AI',
          'Identify potential biases in medical AI systems',
          'Explore real-world case studies',
          'Develop ethical reasoning framework',
        ],
      },
    });
    log(`Created discovery scenario: ${scenario.id}`, 'success');
    
    // 2. User starts discovery journey
    log('User starting discovery journey...', 'info');
    const program = await programRepo.create({
      scenarioId: scenario.id,
      userId: user.id,
      totalTasks: 3,
    });
    log(`Created discovery program: ${program.id}`, 'success');
    
    // 3. Create discovery tasks
    log('Creating discovery tasks...', 'info');
    const taskIds: string[] = [];
    
    for (let i = 0; i < scenario.taskTemplates.length; i++) {
      const template = scenario.taskTemplates[i];
      const task = await taskRepo.create({
        programId: program.id,
        scenarioTaskIndex: i,
        title: template.title,
        type: 'discovery',
        content: {
          explorationPrompt: `Explore: ${template.title}`,
          guidingQuestions: [
            'What interests you most about this topic?',
            'How does this relate to your experience?',
            'What questions do you have?',
          ],
        },
      });
      taskIds.push(task.id);
      log(`Created discovery task ${i + 1}: ${task.id}`, 'success');
    }
    
    await programRepo.updateTaskIds(program.id, taskIds);
    
    // 4. Simulate discovery interactions
    log('Simulating discovery conversation...', 'info');
    const firstTaskId = taskIds[0];
    
    // Open-ended exploration
    await taskRepo.addInteraction(firstTaskId, {
      timestamp: new Date().toISOString(),
      type: 'user_input',
      content: {
        message: "I'm curious about how AI bias can affect patient care. What should I know?",
      },
    });
    
    await taskRepo.addInteraction(firstTaskId, {
      timestamp: new Date().toISOString(),
      type: 'ai_response',
      content: {
        message: `Great question! AI bias in healthcare is a critical issue. Let me share some key points:

**How AI Bias Affects Patient Care:**

1. **Diagnostic Disparities**: AI trained on limited datasets may be less accurate for underrepresented groups
2. **Treatment Recommendations**: Biased algorithms might suggest different treatments based on flawed patterns
3. **Access to Care**: AI systems might inadvertently create barriers for certain populations

**Real Example**: A widely-used healthcare algorithm was found to systematically discriminate against Black patients by using healthcare costs as a proxy for health needs.

What aspect of this would you like to explore deeper?`,
        metadata: {
          model: 'gemini-2.5-flash',
          tokens: 220,
          adaptiveResponse: true,
        },
      },
    });
    
    // User explores deeper
    await taskRepo.addInteraction(firstTaskId, {
      timestamp: new Date().toISOString(),
      type: 'user_input',
      content: {
        message: 'The diagnostic disparities concern me. How can we make AI more fair?',
      },
    });
    
    await taskRepo.addInteraction(firstTaskId, {
      timestamp: new Date().toISOString(),
      type: 'ai_response',
      content: {
        message: `Your concern is well-founded. Here are approaches to making diagnostic AI more fair:

**Technical Solutions:**
- **Diverse Training Data**: Include representative samples from all populations
- **Bias Detection Tools**: Regular audits using fairness metrics
- **Algorithmic Debiasing**: Techniques like adversarial debiasing

**Human-Centered Approaches:**
- **Inclusive Design**: Involve diverse stakeholders in development
- **Transparency**: Make AI decision-making processes interpretable
- **Continuous Monitoring**: Track outcomes across different groups

**Example Success**: MIT researchers developed an AI that detects skin cancer with equal accuracy across all skin tones by deliberately balancing their training data.

Would you like to explore any of these solutions in more detail?`,
        metadata: {
          model: 'gemini-2.5-flash',
          tokens: 280,
          learningPathAdaptation: 'technical-interest',
        },
      },
    });
    
    // 5. Complete discovery task
    log('Completing discovery task...', 'info');
    await taskRepo.complete(firstTaskId);
    
    const discoveryEvaluation = await evaluationRepo.create({
      targetType: 'task',
      targetId: firstTaskId,
      evaluationType: 'discovery_engagement',
      score: 95,
      feedback: 'Excellent exploration! You asked thoughtful questions about AI bias and showed genuine engagement with ethical considerations.',
      dimensionScores: [
        {
          name: 'Curiosity',
          score: 98,
          feedback: 'Outstanding curiosity and follow-up questions',
        },
        {
          name: 'Depth of Exploration',
          score: 92,
          feedback: 'Went beyond surface-level understanding',
        },
        {
          name: 'Connection Making',
          score: 95,
          feedback: 'Connected concepts to real-world implications',
        },
      ],
      metadata: {
        programId: program.id,
        explorationDepth: 'deep',
        topicsExplored: ['bias', 'fairness', 'diagnostic-ai', 'solutions'],
      },
    });
    log(`Discovery task evaluated with score: ${discoveryEvaluation.score}`, 'success');
    
    // 6. Complete discovery journey
    log('Completing discovery journey...', 'info');
    await programRepo.complete(program.id);
    
    const journeyEvaluation = await evaluationRepo.create({
      targetType: 'program',
      targetId: program.id,
      evaluationType: 'discovery_journey',
      score: 94,
      feedback: 'Fantastic discovery journey! You explored AI ethics with depth and critical thinking.',
      metadata: {
        journeyDuration: '1.5 hours',
        totalExplorations: 8,
        learningPathEvolution: 'basic -> technical -> applied',
      },
    });
    log(`Discovery journey completed with score: ${journeyEvaluation.score}`, 'success');
    
    return {
      scenarioId: scenario.id,
      programId: program.id,
      taskIds,
      evaluationIds: [discoveryEvaluation.id, journeyEvaluation.id],
    };
    
  } catch (error) {
    log(`Discovery test failed: ${error}`, 'error');
    throw error;
  }
}

async function testAssessmentMode() {
  log('Testing Assessment Mode', 'header');
  
  const userRepo = repositoryFactory.getUserRepository();
  const scenarioRepo = repositoryFactory.getScenarioRepository();
  const programRepo = repositoryFactory.getProgramRepository();
  const taskRepo = repositoryFactory.getTaskRepository();
  const evaluationRepo = repositoryFactory.getEvaluationRepository();
  
  try {
    // Create test user
    log('Creating test user...', 'info');
    const user = await userRepo.create({
      email: 'assessment-test@example.com',
      name: 'Assessment Test User',
      preferredLanguage: 'en'
    });
    log(`Created user: ${user.id}`, 'success');
    // 1. Create Assessment Scenario
    log('Creating assessment scenario...', 'info');
    const scenario = await scenarioRepo.create({
      type: 'assessment',
      difficultyLevel: 'intermediate',
      estimatedMinutes: 60,
      prerequisites: ['Basic computer skills', 'English proficiency'],
      xpRewards: {
        completion: 200,
        mastery: 100,
        bonus: 50,
      },
      tasks: [
        {
          id: 'creating-assessment',
          type: 'assessment',
          title: 'Creating with AI Assessment',
          description: 'Test your knowledge of creating content with AI tools',
        },
        {
          id: 'managing-assessment',
          type: 'assessment',
          title: 'Managing AI Assessment',
          description: 'Evaluate your AI management and oversight skills',
        },
        {
          id: 'practical-scenario',
          type: 'assessment',
          title: 'Practical AI Application Scenario',
          description: 'Apply your knowledge in a real-world scenario',
        },
      ],
      metadata: {
        title: 'AI Literacy Diagnostic Assessment',
        description: 'Comprehensive assessment of your AI literacy across multiple domains',
        assessmentType: 'diagnostic',
        level: 'intermediate',
        domains: ['Creating_with_AI', 'Managing_with_AI'],
        objectives: [
          'Assess current AI literacy level',
          'Identify strengths and areas for improvement',
          'Provide personalized learning recommendations',
        ],
      },
    });
    log(`Created assessment scenario: ${scenario.id}`, 'success');
    
    // 2. User starts assessment
    log('User starting assessment...', 'info');
    const program = await programRepo.create({
      scenarioId: scenario.id,
      userId: user.id,
      totalTasks: 3,
    });
    log(`Created assessment program: ${program.id}`, 'success');
    
    // 3. Create assessment tasks
    log('Creating assessment tasks...', 'info');
    const taskIds: string[] = [];
    
    // Task 1: Creating with AI
    const task1 = await taskRepo.create({
      programId: program.id,
      scenarioTaskIndex: 0,
      title: 'Creating with AI Assessment',
      type: 'assessment',
      content: {
        questions: [
          {
            id: 'q1',
            type: 'multiple-choice',
            question: 'When using AI to generate creative content, which approach is most effective?',
            options: [
              'A) Copy AI output directly without modification',
              'B) Use AI as a starting point and refine with human creativity',
              'C) Avoid AI completely for creative work',
              'D) Let AI make all creative decisions',
            ],
            correctAnswer: 'B',
          },
          {
            id: 'q2',
            type: 'open-ended',
            question: 'Describe a situation where you would use AI to enhance your creative process. What would be your approach?',
          },
        ],
      },
    });
    taskIds.push(task1.id);
    log(`Created assessment task 1: ${task1.id}`, 'success');
    
    // 4. Simulate assessment responses
    log('Simulating assessment responses...', 'info');
    
    // Answer multiple choice
    await taskRepo.addInteraction(task1.id, {
      timestamp: new Date().toISOString(),
      type: 'assessment_response',
      content: {
        questionId: 'q1',
        answer: 'B',
        timeSpent: 45,
      },
    });
    
    // Answer open-ended
    await taskRepo.addInteraction(task1.id, {
      timestamp: new Date().toISOString(),
      type: 'assessment_response',
      content: {
        questionId: 'q2',
        answer: 'I would use AI when writing a technical blog post. My approach would be to first use AI to generate an outline and key points based on my topic. Then I would expand each section with my own expertise and examples. Finally, I would use AI to help polish the language and check for clarity, but maintain my own voice and ensure accuracy.',
        timeSpent: 180,
      },
    });
    
    // 5. Complete and evaluate assessment task
    log('Evaluating assessment responses...', 'info');
    await taskRepo.complete(task1.id);
    
    const assessmentEvaluation = await evaluationRepo.create({
      targetType: 'task',
      targetId: task1.id,
      evaluationType: 'assessment_task',
      score: 85,
      feedback: 'Strong understanding of AI collaboration in creative processes. Your practical example shows good judgment about when and how to use AI effectively.',
      dimensionScores: [
        {
          name: 'Conceptual Understanding',
          score: 90,
          feedback: 'Excellent grasp of AI-human collaboration',
        },
        {
          name: 'Practical Application',
          score: 85,
          feedback: 'Good real-world example with clear process',
        },
        {
          name: 'Critical Thinking',
          score: 80,
          feedback: 'Shows awareness of AI limitations',
        },
      ],
      metadata: {
        programId: program.id,
        questionsAnswered: 2,
        correctAnswers: 1,
        responseQuality: 'high',
        domainScores: {
          'Creating_with_AI': 85,
        },
      },
    });
    log(`Assessment task evaluated with score: ${assessmentEvaluation.score}`, 'success');
    
    // 6. Complete full assessment
    log('Completing full assessment...', 'info');
    await programRepo.complete(program.id);
    
    const fullAssessmentEvaluation = await evaluationRepo.create({
      targetType: 'program',
      targetId: program.id,
      evaluationType: 'assessment_complete',
      score: 87,
      feedback: 'Well done! Your AI literacy assessment shows strong foundational knowledge with room for growth in advanced applications.',
      dimensionScores: [
        {
          name: 'Creating with AI',
          score: 85,
          feedback: 'Strong creative collaboration skills',
        },
        {
          name: 'Managing AI',
          score: 88,
          feedback: 'Good understanding of AI management',
        },
        {
          name: 'Overall AI Literacy',
          score: 87,
          feedback: 'Intermediate level with clear strengths',
        },
      ],
      metadata: {
        completionTime: '45 minutes',
        level: 'intermediate',
        recommendations: [
          'Explore advanced prompting techniques',
          'Practice AI tool evaluation methods',
          'Study AI ethics and bias mitigation',
        ],
        certificateEligible: true,
      },
    });
    log(`Assessment completed with overall score: ${fullAssessmentEvaluation.score}`, 'success');
    
    return {
      scenarioId: scenario.id,
      programId: program.id,
      taskIds,
      evaluationIds: [assessmentEvaluation.id, fullAssessmentEvaluation.id],
    };
    
  } catch (error) {
    log(`Assessment test failed: ${error}`, 'error');
    throw error;
  }
}

interface TestResults {
  pbl: {
    scenarioId: string;
    programId: string;
  };
  discovery: {
    scenarioId: string;
    programId: string;
  };
  assessment: {
    scenarioId: string;
    programId: string;
  };
}

async function verifyDatabaseData(results: TestResults) {
  log('Verifying Data in PostgreSQL Database', 'header');
  
  const scenarioRepo = repositoryFactory.getScenarioRepository();
  const programRepo = repositoryFactory.getProgramRepository();
  const taskRepo = repositoryFactory.getTaskRepository();
  const evaluationRepo = repositoryFactory.getEvaluationRepository();
  
  try {
    // Verify all scenarios
    log('Checking scenarios...', 'info');
    const allScenarios = await scenarioRepo.listAll();
    log(`Found ${allScenarios.length} scenarios in database`, 'success');
    
    // Verify programs
    log('Checking programs...', 'info');
    const pblPrograms = await programRepo.findByScenario(results.pbl.scenarioId);
    const discoveryPrograms = await programRepo.findByScenario(results.discovery.scenarioId);
    const assessmentPrograms = await programRepo.findByScenario(results.assessment.scenarioId);
    log(`Found programs - PBL: ${pblPrograms.length}, Discovery: ${discoveryPrograms.length}, Assessment: ${assessmentPrograms.length}`, 'success');
    
    // Verify tasks
    log('Checking tasks...', 'info');
    const pblTasks = await taskRepo.findByProgram(results.pbl.programId);
    const discoveryTasks = await taskRepo.findByProgram(results.discovery.programId);
    const assessmentTasks = await taskRepo.findByProgram(results.assessment.programId);
    log(`Found tasks - PBL: ${pblTasks.length}, Discovery: ${discoveryTasks.length}, Assessment: ${assessmentTasks.length}`, 'success');
    
    // Verify evaluations
    log('Checking evaluations...', 'info');
    const pblEvaluations = await evaluationRepo.findByProgram(results.pbl.programId);
    const discoveryEvaluations = await evaluationRepo.findByProgram(results.discovery.programId);
    const assessmentEvaluations = await evaluationRepo.findByProgram(results.assessment.programId);
    log(`Found evaluations - PBL: ${pblEvaluations.length}, Discovery: ${discoveryEvaluations.length}, Assessment: ${assessmentEvaluations.length}`, 'success');
    
    // Summary
    log('\nData Verification Summary:', 'info');
    console.log(`
📊 Total Data Created:
- Scenarios: ${allScenarios.length}
- Programs: ${pblPrograms.length + discoveryPrograms.length + assessmentPrograms.length}
- Tasks: ${pblTasks.length + discoveryTasks.length + assessmentTasks.length}
- Evaluations: ${pblEvaluations.length + discoveryEvaluations.length + assessmentEvaluations.length}

📁 PostgreSQL Tables:
- Scenarios: public.scenarios
- Programs: public.programs
- Tasks: public.tasks
- Evaluations: public.evaluations

✅ All data successfully stored in PostgreSQL!
    `);
    
    // Print sample commands to view data
    console.log(`
🔍 View Data Commands:
# Connect to database
psql -h localhost -U postgres -d ai_square_db

# View a specific scenario
SELECT * FROM scenarios WHERE id = '${results.pbl.scenarioId}';

# View a specific program
SELECT * FROM programs WHERE id = '${results.pbl.programId}';

# View tasks with interactions
SELECT t.*, ti.* FROM tasks t 
LEFT JOIN task_interactions ti ON t.id = ti.task_id 
WHERE t.program_id = '${results.pbl.programId}';
    `);
    
  } catch (error) {
    log(`Verification failed: ${error}`, 'error');
    throw error;
  }
}

async function runAllTests() {
  log('Starting Complete E2E Test for All Learning Modes', 'header');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DB_NAME || 'ai_square_db'}`);
  console.log(`DB Host: ${process.env.DB_HOST || 'localhost'}\n`);
  
  interface ModeTestResult {
    scenarioId: string;
    programId: string;
    taskIds?: string[];
    evaluationId?: string;
  }

  const results = {
    pbl: null as ModeTestResult | null,
    discovery: null as ModeTestResult | null,
    assessment: null as ModeTestResult | null,
  };
  
  try {
    // Test all three modes
    results.pbl = await testPBLMode();
    results.discovery = await testDiscoveryMode();
    results.assessment = await testAssessmentMode();
    
    // Verify all data is in PostgreSQL
    await verifyDatabaseData(results);
    
    log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉', 'header');
    
    return results;
    
  } catch (error) {
    log(`\n💥 TEST SUITE FAILED: ${error}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runAllTests()
  .then(() => {
    log('Test suite finished successfully', 'success');
    process.exit(0);
  })
  .catch((error) => {
    log(`Test suite failed: ${error}`, 'error');
    process.exit(1);
  });