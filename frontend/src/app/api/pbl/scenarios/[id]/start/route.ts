import { NextRequest, NextResponse } from 'next/server';
import { IProgram, ITask } from '@/types/unified-learning';



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
    
    // Extract tasks from taskTemplates
    const tasks = scenario.taskTemplates || [];
    
    // Use unified architecture - get repositories
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    
    console.log('   Creating program using unified architecture...');
    
    // Create Program following unified architecture
    const program: IProgram = await programRepo.create({
      scenarioId: scenario.id, // Use scenario UUID
      userId: userEmail,
      status: 'active',
      startedAt: new Date().toISOString(),
      taskIds: [],
      currentTaskIndex: 0,
      metadata: {
        sourceType: 'pbl',
        language,
        title: scenario.title,
        totalTasks: tasks.length,
        yamlId: scenario.sourceRef.metadata?.yamlId // Keep original yaml ID for reference
      }
    });
    
    console.log('   ✅ Program created with UUID:', program.id);
    
    // Create Tasks from scenario task templates
    const createdTasks: ITask[] = [];
    
    for (let i = 0; i < tasks.length; i++) {
      const taskTemplate = tasks[i];
      
      const task: ITask = await taskRepo.create({
        programId: program.id,
        scenarioTaskIndex: i,
        title: taskTemplate.title,
        type: taskTemplate.type,
        content: {
          instructions: taskTemplate.description,
          context: {
            taskTemplate,
            originalTaskData: taskTemplate.metadata?.originalTaskData,
            language
          }
        },
        interactions: [],
        startedAt: new Date().toISOString(),
        status: i === 0 ? 'active' : 'pending'
      });
      
      createdTasks.push(task);
    }
    
    // Update program with task IDs
    await programRepo.update(program.id, createdTasks.map(t => t.id));
    
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