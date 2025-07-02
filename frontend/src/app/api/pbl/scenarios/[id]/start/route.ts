import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Scenario, CreateProgramResponse } from '@/types/pbl';


// Load scenario data from YAML file
async function loadScenario(scenarioId: string): Promise<Scenario | null> {
  try {
    const yamlPath = path.join(
      process.cwd(),
      'public',
      'pbl_data',
      `${scenarioId.replace(/-/g, '_')}_scenario.yaml`
    );
    
    const yamlContent = await fs.readFile(yamlPath, 'utf8');
    const data = yaml.load(yamlContent) as any;
    
    // Transform YAML data to match our Scenario interface
    const scenario: Scenario = {
      id: data.scenario_info.id,
      title: data.scenario_info.title,
      title_zh: data.scenario_info.title_zh,
      description: data.scenario_info.description,
      description_zh: data.scenario_info.description_zh,
      targetDomains: data.scenario_info.target_domains,
      difficulty: data.scenario_info.difficulty,
      estimatedDuration: data.scenario_info.estimated_duration,
      prerequisites: data.scenario_info.prerequisites,
      learningObjectives: data.scenario_info.learning_objectives,
      learningObjectives_zh: data.scenario_info.learning_objectives_zh,
      ksaMapping: data.ksa_mapping,
      tasks: []
    };
    
    // Load tasks directly from root level (new structure)
    if (data.tasks && Array.isArray(data.tasks)) {
      for (const task of data.tasks) {
        scenario.tasks.push({
          id: task.id,
          title: task.title,
          title_zh: task.title_zh,
          description: task.description,
          description_zh: task.description_zh,
          category: task.category || 'general',
          instructions: task.instructions,
          instructions_zh: task.instructions_zh,
          expectedOutcome: task.expected_outcome || task.expectedOutcome,
          expectedOutcome_zh: task.expected_outcome_zh || task.expectedOutcome_zh,
          timeLimit: task.time_limit,
          resources: task.resources,
          assessmentFocus: task.assessment_focus || { primary: [], secondary: [] },
          aiModule: task.ai_module
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
    const scenario = await loadScenario(scenarioId);
    if (!scenario) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scenario not found'
        },
        { status: 404 }
      );
    }
    
    // Create new program
    console.log('   Creating program...');
    const program = await pblProgramService.createProgram(
      userEmail,
      scenarioId,
      language === 'zh' || language === 'zh-TW' ? (scenario.title_zh || scenario.title) : scenario.title,
      scenario.tasks.length,
      language
    );
    
    console.log('   ✅ Program created:', program.id);
    
    // Initialize first task
    const firstTask = scenario.tasks[0];
    if (firstTask) {
      await pblProgramService.initializeTask(
        userEmail,
        scenarioId,
        program.id,
        firstTask.id,
        language === 'zh' || language === 'zh-TW' ? (firstTask.title_zh || firstTask.title) : firstTask.title
      );
      
      // Update program with current task
      await pblProgramService.updateProgram(userEmail, scenarioId, program.id, {
        currentTaskId: firstTask.id
      });
    }
    
    const response: CreateProgramResponse = {
      success: true,
      programId: program.id,
      program: {
        id: program.id,
        scenarioId: program.scenarioId,
        userId: program.userId,
        userEmail: program.userEmail,
        startedAt: program.startedAt,
        updatedAt: program.updatedAt,
        status: program.status,
        totalTasks: program.totalTasks,
        currentTaskId: firstTask?.id,
        language: program.language
      },
      firstTaskId: firstTask?.id || ''
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