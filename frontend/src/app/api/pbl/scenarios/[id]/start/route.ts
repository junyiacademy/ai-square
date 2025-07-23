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
    
    console.log('   Creating program using unified architecture...');
    
    // Create Program following unified architecture
    const program = await programRepo.create({
      scenarioId: scenario.id, // Use scenario UUID
      userId: userEmail,
      mode: 'pbl',
      status: 'active',
      currentTaskIndex: 0,
      completedTaskCount: 0,
      totalTaskCount: tasks.length,
      totalScore: 0,
      dimensionScores: {},
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
    
    console.log('   ✅ Program created with UUID:', program.id);
    
    // Create Tasks from scenario task templates
    const createdTasks: ITask[] = [];
    
    for (let i = 0; i < tasks.length; i++) {
      const taskTemplate = tasks[i];
      
      const task = await taskRepo.create({
        programId: program.id,
        mode: 'pbl',
        taskIndex: i,
        scenarioTaskIndex: i,
        title: taskTemplate.title,
        description: taskTemplate.description,
        type: taskTemplate.type,
        status: i === 0 ? 'active' : 'pending',
        content: {
          instructions: taskTemplate.description,
          scenarioId: scenarioId,
          taskType: taskTemplate.type,
          difficulty: (scenario.metadata?.difficulty as string) || 'intermediate',
          estimatedTime: (taskTemplate.estimatedTime as number) || 30
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
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start learning program'
      },
      { status: 500 }
    );
  }
}