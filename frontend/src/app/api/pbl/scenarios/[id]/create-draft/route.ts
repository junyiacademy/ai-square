import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Scenario, DomainType, DifficultyLevel } from '@/types/pbl';

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
    interface ScenarioYAML {
      scenario_info: {
        id: string;
        title: string;
        title_zh?: string;
        description: string;
        description_zh?: string;
        target_domains: string[];
        difficulty: string;
        estimated_duration: number;
        prerequisites?: string[];
        learning_objectives?: string[];
        learning_objectives_zh?: string[];
        tasks: Array<{
          id: string;
          title: string;
          title_zh?: string;
        }>;
      };
      tasks?: any[];
      ksa_mapping?: any;
    }
    const data = yaml.load(yamlContent) as ScenarioYAML;
    
    // Transform YAML data to match our Scenario interface
    const scenario: Scenario = {
      id: data.scenario_info.id,
      title: data.scenario_info.title,
      title_zh: data.scenario_info.title_zh,
      description: data.scenario_info.description,
      description_zh: data.scenario_info.description_zh,
      targetDomains: data.scenario_info.target_domains as DomainType[],
      difficulty: data.scenario_info.difficulty as DifficultyLevel,
      estimatedDuration: data.scenario_info.estimated_duration,
      prerequisites: data.scenario_info.prerequisites || [],
      learningObjectives: data.scenario_info.learning_objectives || [],
      learningObjectives_zh: data.scenario_info.learning_objectives_zh || [],
      ksaMapping: data.ksa_mapping,
      tasks: []
    };
    
    // Load tasks directly from root level
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
    
    // Create new draft program
    const program = await pblProgramService.createProgram(
      userEmail,
      scenarioId,
      language === 'zh' || language === 'zh-TW' ? (scenario.title_zh || scenario.title) : scenario.title,
      scenario.tasks.length,
      language,
      'draft' // Create as draft status
    );
    
    return NextResponse.json({
      success: true,
      programId: program.id,
      program
    });
    
  } catch (error) {
    console.error('Create draft program error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create draft program' },
      { status: 500 }
    );
  }
}