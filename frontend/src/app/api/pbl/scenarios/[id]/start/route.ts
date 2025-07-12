import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Scenario, CreateProgramResponse, DomainType, DifficultyLevel, KSAMapping, TaskCategory, AIModule } from '@/types/pbl';
import { IScenario, IProgram, ITask } from '@/types/unified-learning';
import { pblScenarioService } from '@/lib/services/pbl-scenario-service';


// Load scenario data from YAML file
async function loadScenario(scenarioId: string, lang: string = 'en'): Promise<Scenario | null> {
  try {
    const scenarioFolder = scenarioId.replace(/-/g, '_');
    const fileName = `${scenarioFolder}_${lang}.yaml`;
    let yamlPath = path.join(
      process.cwd(),
      'public',
      'pbl_data',
      'scenarios',
      scenarioFolder,
      fileName
    );
    
    // Check if language-specific file exists, fallback to English
    try {
      await fs.access(yamlPath);
    } catch {
      // Fallback to English if language-specific file doesn't exist
      yamlPath = path.join(
        process.cwd(),
        'public',
        'pbl_data',
        'scenarios',
        scenarioFolder,
        `${scenarioFolder}_en.yaml`
      );
    }
    
    const yamlContent = await fs.readFile(yamlPath, 'utf8');
    const data = yaml.load(yamlContent) as Record<string, unknown>;
    
    // Transform YAML data to match our Scenario interface
    const scenarioInfo = data.scenario_info as Record<string, unknown>;
    const scenario: Scenario = {
      id: scenarioInfo.id as string,
      title: scenarioInfo.title as string,
      title_zhTW: scenarioInfo.title_zhTW as string,
      description: scenarioInfo.description as string,
      description_zhTW: scenarioInfo.description_zhTW as string,
      targetDomains: scenarioInfo.target_domains as DomainType[],
      difficulty: scenarioInfo.difficulty as DifficultyLevel,
      estimatedDuration: scenarioInfo.estimated_duration as number,
      prerequisites: (scenarioInfo.prerequisites as string[]) || [],
      learningObjectives: (scenarioInfo.learning_objectives as string[]) || [],
      learningObjectives_zhTW: (scenarioInfo.learning_objectives_zhTW as string[]) || [],
      ksaMapping: (data.ksa_mapping as unknown as KSAMapping) || { knowledge: [], skills: [], attitudes: [] },
      tasks: []
    };
    
    // Load tasks directly from root level (new structure)
    if (data.tasks && Array.isArray(data.tasks)) {
      for (const task of data.tasks as Record<string, unknown>[]) {
        scenario.tasks.push({
          id: task.id as string,
          title: task.title as string,
          title_zhTW: task.title_zhTW as string,
          description: task.description as string,
          description_zhTW: task.description_zhTW as string,
          category: (task.category as TaskCategory) || 'research',
          instructions: (task.instructions as string[]) || [],
          instructions_zhTW: (task.instructions_zhTW as string[]) || [],
          expectedOutcome: (task.expected_outcome as string) || (task.expectedOutcome as string) || '',
          expectedOutcome_zhTW: (task.expected_outcome_zhTW as string) || (task.expectedOutcome_zhTW as string) || '',
          timeLimit: task.time_limit as number,
          resources: (task.resources as string[]) || [],
          assessmentFocus: (task.assessment_focus as { primary: string[]; secondary: string[] }) || { primary: [], secondary: [] },
          aiModule: (task.ai_module as unknown as AIModule) || undefined
        });
      }
    }
    
    return scenario;
  } catch (error) {
    console.error(`Error loading scenario ${scenarioId}:`, error);
    return null;
  }
}

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
    const { getScenarioRepository } = await import('@/lib/implementations/gcs-v2');
    const scenarioRepo = getScenarioRepository();
    
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
    const { getProgramRepository, getTaskRepository } = await import('@/lib/implementations/gcs-v2');
    const programRepo = getProgramRepository();
    const taskRepo = getTaskRepository();
    
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
    await programRepo.updateTaskIds(program.id, createdTasks.map(t => t.id));
    
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