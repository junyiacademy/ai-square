import { NextRequest, NextResponse } from 'next/server';
import { ensureServices } from '@/lib/core/services/api-helpers';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Scenario, DomainType, DifficultyLevel, KSAMapping, TaskCategory, AIModule } from '@/types/pbl';
import { TrackType } from '@/lib/core/track/types';
import { ProgramType } from '@/lib/core/program/types';
import { TaskType } from '@/lib/core/task/types';

// Load scenario data from YAML file
async function loadScenario(scenarioId: string): Promise<Scenario | null> {
  try {
    const scenarioFolder = scenarioId.replace(/-/g, '_');
    // Default to English for draft creation
    const fileName = `${scenarioFolder}_en.yaml`;
    const yamlPath = path.join(
      process.cwd(),
      'public',
      'pbl_data',
      'scenarios',
      scenarioFolder,
      fileName
    );
    
    const yamlContent = await fs.readFile(yamlPath, 'utf8');
    interface ScenarioYAML {
      scenario_info: {
        id: string;
        title: string;
        title_zhTW?: string;
        description: string;
        description_zhTW?: string;
        target_domains: string[];
        difficulty: string;
        estimated_duration: number;
        prerequisites?: string[];
        learning_objectives?: string[];
        learning_objectives_zhTW?: string[];
        tasks: Array<{
          id: string;
          title: string;
          title_zhTW?: string;
        }>;
      };
      tasks?: Record<string, unknown>[];
      ksa_mapping?: Record<string, unknown>;
    }
    const data = yaml.load(yamlContent) as ScenarioYAML;
    
    // Transform YAML data to match our Scenario interface
    const scenario: Scenario = {
      id: data.scenario_info.id,
      title: data.scenario_info.title,
      title_zhTW: data.scenario_info.title_zhTW,
      description: data.scenario_info.description,
      description_zhTW: data.scenario_info.description_zhTW,
      targetDomains: data.scenario_info.target_domains as DomainType[],
      difficulty: data.scenario_info.difficulty as DifficultyLevel,
      estimatedDuration: data.scenario_info.estimated_duration,
      prerequisites: data.scenario_info.prerequisites || [],
      learningObjectives: data.scenario_info.learning_objectives || [],
      learningObjectives_zhTW: data.scenario_info.learning_objectives_zhTW || [],
      ksaMapping: (data.ksa_mapping as unknown as KSAMapping) || { knowledge: [], skills: [], attitudes: [] },
      tasks: []
    };
    
    // Load tasks directly from root level
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
  try {
    const { id: scenarioId } = await params;
    
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
    
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json();
    const language = body.language || 'en';
    
    // Load scenario
    const scenario = await loadScenario(scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }
    
    // Initialize services for new architecture
    const services = await ensureServices();
    
    // Create in new unified architecture
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
        scenarioId
      }
    });
    
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
    
    // Return in the format expected by the frontend
    // Use the actual programId generated by the new architecture
    return NextResponse.json({
      success: true,
      programId: program.id,  // Use the actual program ID from new architecture
      program: {
        id: program.id,
        scenarioId,
        scenarioTitle: language === 'zhTW' ? (scenario.title_zhTW || scenario.title) : scenario.title,
        status: 'draft',  // Map NOT_STARTED to 'draft' for backward compatibility
        startedAt: program.createdAt.toISOString(),
        updatedAt: program.updatedAt.toISOString(),
        totalTasks: scenario.tasks.length,
        language,
        metadata: {
          trackId: track.id,
          programId: program.id,
          taskIds: tasks.map(t => t.id)
        }
      },
      firstTaskId: tasks[0]?.id || '', // Return the actual first task UUID
      taskMapping: tasks.map((task, index) => ({
        taskId: task.id,
        scenarioTaskId: scenario.tasks[index]?.id,
        order: task.order
      }))
    });
    
  } catch (error) {
    console.error('Create draft program error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create draft program' },
      { status: 500 }
    );
  }
}