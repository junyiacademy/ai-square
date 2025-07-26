import { NextRequest, NextResponse } from 'next/server';
import { ITask } from '@/types/unified-learning';



export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('🚨 START API CALLED - This should only happen when explicitly requested!');
  console.log('   Timestamp:', new Date().toISOString());
  console.log('   Scenario ID:', id);
  
  // Log request headers to trace the source
  console.log('   Request headers:', {
    referer: request.headers.get('referer'),
    userAgent: request.headers.get('user-agent'),
    origin: request.headers.get('origin')
  });
  
  try {
    const scenarioId = id;
    
    // Get user info from cookie
    let userEmail: string | undefined;
    try {
      const userCookie = request.cookies.get('user')?.value;
      if (userCookie) {
        const user = JSON.parse(userCookie);
        userEmail = user.email;
      }
    } catch {
      console.log('No user cookie found');
    }
    
    console.log('   User email:', userEmail);
    
    if (!userEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'User authentication required'
        },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json();
    const language = body.language || 'en';
    
    // Use unified architecture to get scenario by UUID only
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // Only accept UUID format
    if (!scenarioId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid scenario ID format. UUID required.'
        },
        { status: 400 }
      );
    }
    
    const scenario = await scenarioRepo.findById(scenarioId);
    
    if (!scenario) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scenario not found'
        },
        { status: 404 }
      );
    }
    
    // Extract tasks from scenario
    const tasks = scenario.taskTemplates || [];
    
    // Use unified architecture - get repositories
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const userRepo = repositoryFactory.getUserRepository();
    
    // Get or create user
    let user = await userRepo.findByEmail(userEmail);
    if (!user) {
      console.log('   Creating new user for:', userEmail);
      user = await userRepo.create({
        email: userEmail,
        name: userEmail.split('@')[0],
        preferredLanguage: language
      });
    }
    
    console.log('   User ID:', user.id);
    console.log('   Creating program using unified architecture...');
    
    let program;
    try {
      // Create Program following unified architecture
      program = await programRepo.create({
        scenarioId: scenario.id, // Use scenario UUID
        userId: user.id, // Use user UUID, not email
        mode: scenario.mode || 'pbl', // Use scenario mode, default to 'pbl'
        status: 'active',
        currentTaskIndex: 0,
        completedTaskCount: 0,
        totalTaskCount: tasks.length,
        totalScore: 0,
        domainScores: {},
        xpEarned: 0,
        badgesEarned: [],
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        timeSpentSeconds: 0,
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {
          language
        }
      });
    } catch (programError) {
      console.error('   ❌ Failed to create program:', programError);
      throw programError;
    }
    
    console.log('   ✅ Program created with UUID:', program.id);
    
    // Create Tasks from scenario task templates
    const createdTasks: ITask[] = [];
    
    for (let i = 0; i < tasks.length; i++) {
      const taskTemplate = tasks[i] as Record<string, unknown>;
      
      // Extract title and description with language support
      const title = typeof taskTemplate.title === 'object' 
        ? ((taskTemplate.title as Record<string, string>)?.[language] || (taskTemplate.title as Record<string, string>)?.en || 'Task')
        : String(taskTemplate.title || `Task ${i + 1}`);
        
      const description = typeof taskTemplate.description === 'object'
        ? ((taskTemplate.description as Record<string, string>)?.[language] || (taskTemplate.description as Record<string, string>)?.en || '')
        : String(taskTemplate.description || taskTemplate.instructions || '');
      
      // Map task types to valid enum values
      let taskType = String(taskTemplate.type || 'interactive');
      const typeMapping: Record<string, string> = {
        'research': 'analysis',
        'design': 'creation',
        'implement': 'creation',
        'test': 'analysis',
        'deploy': 'creation'
      };
      taskType = typeMapping[taskType] || taskType;
      
      // Ensure task type is valid
      const validTypes = ['interactive', 'reflection', 'chat', 'creation', 'analysis', 'exploration', 'experiment', 'challenge', 'question', 'quiz', 'assessment'];
      if (!validTypes.includes(taskType)) {
        console.warn(`Invalid task type "${taskType}", defaulting to "interactive"`);
        taskType = 'interactive';
      }
      
      const task = await taskRepo.create({
        programId: program.id,
        mode: 'pbl',
        taskIndex: i,
        scenarioTaskIndex: i,
        title: title,
        description: description,
        type: taskType as 'question' | 'quiz' | 'assessment' | 'interactive' | 'reflection' | 'chat' | 'creation' | 'analysis' | 'exploration' | 'experiment' | 'challenge', // Type assertion needed for enum
        status: i === 0 ? 'active' : 'pending',
        content: {
          instructions: description,
          scenarioId: scenarioId,
          taskType: String(taskTemplate.type || 'interactive'),
          difficulty: scenario.difficulty || (scenario.metadata?.difficulty as string) || 'intermediate',
          estimatedTime: Number(taskTemplate.estimatedTime || 30)
        },
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 3,
        attemptCount: 0,
        timeLimitSeconds: (taskTemplate.estimatedTime as number) * 60 || 1800,
        timeSpentSeconds: 0,
        aiConfig: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      });
      
      createdTasks.push(task as unknown as ITask);
    }
    
    // Update program with task IDs
    await programRepo.update?.(program.id, {
      metadata: {
        ...program.metadata,
        taskIds: createdTasks.map(t => t.id)
      }
    });
    
    console.log('   ✅ Created', createdTasks.length, 'tasks with UUIDs:', createdTasks.map(t => t.id));
    
    const response = {
      success: true,
      id: program.id, // For compatibility with UI expectations
      programId: program.id,
      tasks: createdTasks,
      taskIds: createdTasks.map(t => t.id),
      firstTaskId: createdTasks[0]?.id || '',
      program: {
        id: program.id,
        scenarioId: program.scenarioId,
        userId: program.userId,
        startedAt: program.startedAt,
        status: program.status,
        taskIds: createdTasks.map(t => t.id),
        currentTaskIndex: 0,
        metadata: program.metadata
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Start program error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start learning program',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}