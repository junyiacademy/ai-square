import { NextRequest, NextResponse } from 'next/server';
import { ensureServices } from '@/lib/core/services/api-helpers';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Scenario, CreateProgramResponse, DomainType, DifficultyLevel, KSAMapping, TaskCategory, AIModule } from '@/types/pbl';
import { TrackType } from '@/lib/core/track/types';
import { ProgramType, ProgramStatus } from '@/lib/core/program/types';
import { TaskType } from '@/lib/core/task/types';

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
    
    // Load scenario
    const scenario = await loadScenario(scenarioId, language);
    if (!scenario) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scenario not found'
        },
        { status: 404 }
      );
    }
    
    // Use new architecture
    const services = await ensureServices();
    
    console.log('   Creating program with new architecture...');
    
    // 1. Create Track
    const track = await services.trackService.createTrack({
      userId: userEmail,
      projectId: scenarioId,
      type: TrackType.PBL,
      metadata: {
        title: language === 'zhTW' ? (scenario.title_zhTW || scenario.title) : scenario.title,
        language,
        version: '1.0'
      },
      context: {
        type: 'pbl',
        scenarioId,
        programId: '',  // Will be updated after program creation
        completedTaskIds: [],
        taskProgress: {}
      }
    });
    
    console.log('   ✅ Track created:', track.id);
    
    // 2. Create Program
    const program = await services.programService.createProgram({
      trackId: track.id,
      userId: userEmail,
      type: ProgramType.PBL,
      title: language === 'zhTW' ? (scenario.title_zhTW || scenario.title) : scenario.title,
      config: {
        scenarioId,
        scenarioTitle: scenario.title,
        totalTasks: scenario.tasks.length,
        tasksOrder: scenario.tasks.map(t => t.id),
        language
      },
      metadata: {
        scenarioId,
        language
      }
    });
    
    console.log('   ✅ Program created:', program.id);
    
    // Update track context with the actual program ID
    await services.trackService.updateTrack(track.id, {
      context: {
        ...track.context,
        programId: program.id
      }
    });
    
    // 3. Create Tasks
    const tasks = await services.taskService.createTasks(
      scenario.tasks.map((task, index) => ({
        programId: program.id,
        userId: userEmail,
        type: TaskType.PBL_TASK,
        title: language === 'zhTW' ? (task.title_zhTW || task.title) : task.title,
        description: language === 'zhTW' ? (task.description_zhTW || task.description) : task.description,
        order: index + 1,
        config: {
          taskId: task.id,
          category: task.category,
          instructions: language === 'zhTW' ? (task.instructions_zhTW || task.instructions) : task.instructions,
          expectedOutcome: language === 'zhTW' ? (task.expectedOutcome_zhTW || task.expectedOutcome) : task.expectedOutcome,
          timeLimit: task.timeLimit,
          aiModule: task.aiModule
        }
      }))
    );
    
    console.log('   ✅ Tasks created:', tasks.length);
    
    // Update program status to IN_PROGRESS
    // Use the actual created task ID, not the scenario task ID
    const firstTaskId = tasks[0]?.id;
    
    await services.programService.updateProgram(userEmail, program.id, {
      status: ProgramStatus.IN_PROGRESS,
      startedAt: new Date(),
      progress: {
        ...program.progress,
        currentTaskId: firstTaskId,
        lastActivityAt: new Date()
      }
    });
    
    // Log the program start
    await services.logService.logSystemEvent(
      userEmail,
      program.id,
      undefined,
      'program-started',
      { scenarioId, language, trackId: track.id }
    );
    
    const response: CreateProgramResponse = {
      success: true,
      programId: program.id,
      program: {
        id: program.id,
        scenarioId: scenarioId,
        userId: userEmail,
        userEmail: userEmail,
        startedAt: program.startedAt?.toISOString() || new Date().toISOString(),
        updatedAt: program.updatedAt.toISOString(),
        status: 'in_progress',
        totalTasks: scenario.tasks.length,
        currentTaskId: firstTaskId || '', // Use the actual UUID
        language: language
      },
      firstTaskId: firstTaskId || '', // Use the actual UUID
      trackId: track.id, // Include trackId in response for client tracking
      // Add task mapping for frontend to use
      taskMapping: tasks.map((task, index) => ({
        taskId: task.id,
        scenarioTaskId: scenario.tasks[index]?.id,
        order: task.order
      }))
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