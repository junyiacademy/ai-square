import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';
import { promises as fs } from 'fs';
import * as yaml from 'js-yaml';
import path from 'path';

// Types for YAML data
interface ScenarioInfo {
  title: string;
  title_zhTW?: string;
  title_ja?: string;
  title_ko?: string;
  title_es?: string;
  title_fr?: string;
  title_de?: string;
  title_ru?: string;
  title_it?: string;
  [key: string]: string | undefined;
}

interface ScenarioYAML {
  scenario_info?: ScenarioInfo;
  title?: string;
  title_zhTW?: string;
  [key: string]: unknown;
}

interface TaskSummary {
  taskId: string;
  title?: string;
  score?: number;
  completedAt?: string;
}

interface ProgramCompletionData {
  programId: string;
  scenarioId: string;
  userEmail: string;
  status: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  totalTasks: number;
  evaluatedTasks: number;
  overallScore: number;
  domainScores: Record<string, number>;
  ksaScores: Record<string, number>;
  totalTimeSeconds: number;
  taskSummaries: TaskSummary[];
  scenarioTitle?: string;
}

// Helper function to get localized value
function getLocalizedValue(data: ScenarioInfo | ScenarioYAML, fieldName: string, lang: string): string {
  // Convert language code to suffix - must match YAML field suffixes exactly
  
  // Use language code directly as suffix
  const mappedSuffix = lang;
  
  // Try language-specific field first
  const localizedField = `${fieldName}_${mappedSuffix}`;
  const value = data[localizedField];
  if (value !== undefined && value !== null && typeof value === 'string') {
    return value;
  }
  
  // Fall back to default field (no suffix)
  const defaultValue = data[fieldName];
  return typeof defaultValue === 'string' ? defaultValue : '';
}

export async function GET(request: NextRequest) {
  try {
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
        {
          success: false,
          error: 'User authentication required'
        },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId') || undefined;
    const language = searchParams.get('lang') || 'en';
    
    console.log(`Fetching PBL history for user: ${userEmail}, scenario: ${scenarioId || 'all'}, language: ${language}`);
    
    // Get all programs for the user using completion data
    let programs: ProgramCompletionData[] = [];
    if (scenarioId) {
      const completionPrograms = await pblProgramService.getUserProgramsForScenario(userEmail, scenarioId);
      // Map CompletionData to ProgramCompletionData, ensuring userEmail is set
      programs = completionPrograms.map(p => ({
        ...p,
        userEmail: p.userEmail || userEmail, // Ensure userEmail is always set
        taskSummaries: p.taskSummaries || []
      } as ProgramCompletionData));
    } else {
      // Get all scenarios and fetch programs for each
      const scenarios = ['ai-job-search']; // Add more scenario IDs as needed
      for (const sid of scenarios) {
        const scenarioPrograms = await pblProgramService.getUserProgramsForScenario(userEmail, sid);
        const mappedPrograms = scenarioPrograms.map(p => ({
          ...p,
          userEmail: p.userEmail || userEmail, // Ensure userEmail is always set
          taskSummaries: p.taskSummaries || []
        } as ProgramCompletionData));
        programs.push(...mappedPrograms);
      }
    }
    
    console.log(`Found ${programs.length} programs for user ${userEmail}`);
    
    // Load scenario titles from YAML files
    const scenarioTitles: Record<string, string> = {};
    for (const program of programs) {
      if (!scenarioTitles[program.scenarioId]) {
        try {
          // Convert scenario ID format (ai-job-search -> ai_job_search)
          const scenarioFolder = program.scenarioId.replace(/-/g, '_');
          const fileName = `${scenarioFolder}_${language}.yaml`;
          let yamlPath = path.join(process.cwd(), 'public', 'pbl_data', 'scenarios', scenarioFolder, fileName);
          
          // Check if language-specific file exists, fallback to English
          try {
            await fs.access(yamlPath);
          } catch {
            // Fallback to English if language-specific file doesn't exist
            yamlPath = path.join(process.cwd(), 'public', 'pbl_data', 'scenarios', scenarioFolder, `${scenarioFolder}_en.yaml`);
          }
          
          const yamlContent = await fs.readFile(yamlPath, 'utf8');
          const scenarioData = yaml.load(yamlContent) as ScenarioYAML;
          
          // Access the scenario_info section which contains the title fields
          if (scenarioData.scenario_info) {
            scenarioTitles[program.scenarioId] = getLocalizedValue(scenarioData.scenario_info, 'title', language);
          } else {
            // Fallback if structure is different
            scenarioTitles[program.scenarioId] = getLocalizedValue(scenarioData, 'title', language);
          }
        } catch (error) {
          console.error(`Error loading scenario ${program.scenarioId}:`, error);
          scenarioTitles[program.scenarioId] = program.scenarioId;
        }
      }
    }
    
    // Add scenario titles to programs
    const programsWithTitles: ProgramCompletionData[] = programs.map(program => ({
      ...program,
      scenarioTitle: scenarioTitles[program.scenarioId] || program.scenarioId
    }));
    
    // Sort by most recent first
    programsWithTitles.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    
    // Transform to API response format
    const response = {
      success: true,
      programs: programsWithTitles,
      totalPrograms: programsWithTitles.length
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('History API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch learning history'
      },
      { status: 500 }
    );
  }
}