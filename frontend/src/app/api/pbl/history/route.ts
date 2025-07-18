import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';
import { promises as fs } from 'fs';
import * as yaml from 'js-yaml';
import path from 'path';
import { 
  cachedGET, 
  getPaginationParams, 
  createPaginatedResponse,
  parallel,
  batchQueries,
  memoize
} from '@/lib/api/optimization-utils';

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

// Memoized helper functions
const getLocalizedValue = memoize((
  data: ScenarioInfo | ScenarioYAML, 
  fieldName: string, 
  lang: string
): string => {
  const mappedSuffix = lang;
  const localizedField = `${fieldName}_${mappedSuffix}`;
  const value = data[localizedField];
  if (value !== undefined && value !== null && typeof value === 'string') {
    return value;
  }
  const defaultValue = data[fieldName];
  return typeof defaultValue === 'string' ? defaultValue : '';
});

// Cache scenario titles in memory (30 minutes)
const loadScenarioTitle = memoize(async (
  scenarioId: string, 
  language: string
): Promise<string> => {
  try {
    const scenarioFolder = scenarioId.replace(/-/g, '_');
    const fileName = `${scenarioFolder}_${language}.yaml`;
    let yamlPath = path.join(process.cwd(), 'public', 'pbl_data', 'scenarios', scenarioFolder, fileName);
    
    // Check if language-specific file exists
    try {
      await fs.access(yamlPath);
    } catch {
      // Fallback to English
      yamlPath = path.join(process.cwd(), 'public', 'pbl_data', 'scenarios', scenarioFolder, `${scenarioFolder}_en.yaml`);
    }
    
    const yamlContent = await fs.readFile(yamlPath, 'utf8');
    const scenarioData = yaml.load(yamlContent) as ScenarioYAML;
    
    if (scenarioData.scenario_info) {
      return getLocalizedValue(scenarioData.scenario_info, 'title', language);
    } else {
      return getLocalizedValue(scenarioData, 'title', language);
    }
  } catch (error) {
    console.error(`Error loading scenario ${scenarioId}:`, error);
    return scenarioId;
  }
}, 30 * 60 * 1000);

// Get available scenario IDs (cached)
const getAvailableScenarios = memoize(async (): Promise<string[]> => {
  try {
    const scenariosPath = path.join(process.cwd(), 'public', 'pbl_data', 'scenarios');
    const folders = await fs.readdir(scenariosPath);
    return folders
      .filter(folder => !folder.startsWith('.'))
      .map(folder => folder.replace(/_/g, '-'));
  } catch {
    // Fallback to known scenarios
    return ['ai-job-search'];
  }
}, 60 * 60 * 1000); // 1 hour cache

export async function GET(request: NextRequest) {
  // Extract user info
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

  // Get parameters
  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get('scenarioId') || undefined;
  const language = searchParams.get('lang') || 'en';
  const paginationParams = getPaginationParams(request);

  // Use cached response for authenticated user
  return cachedGET(request, async () => {
    console.log(`Fetching PBL history for user: ${userEmail}, scenario: ${scenarioId || 'all'}, language: ${language}`);
    
    let allPrograms: ProgramCompletionData[] = [];
    
    if (scenarioId) {
      // Single scenario
      const completionPrograms = await pblProgramService.getUserProgramsForScenario(userEmail!, scenarioId);
      allPrograms = completionPrograms.map(p => ({
        ...p,
        userEmail: p.userEmail || userEmail!,
        taskSummaries: p.taskSummaries || []
      } as ProgramCompletionData));
    } else {
      // All scenarios - fetch in parallel
      const scenarios = await getAvailableScenarios();
      
      // Batch fetch programs for all scenarios in parallel
      const programBatches = await parallel(
        ...scenarios.map(sid => 
          pblProgramService.getUserProgramsForScenario(userEmail!, sid)
        )
      );
      
      // Flatten and map programs
      allPrograms = programBatches.flat().map(p => ({
        ...p,
        userEmail: p.userEmail || userEmail!,
        taskSummaries: p.taskSummaries || []
      } as ProgramCompletionData));
    }
    
    console.log(`Found ${allPrograms.length} programs for user ${userEmail}`);
    
    // Sort by most recent first
    allPrograms.sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    
    // Apply pagination
    const { offset = 0, limit = 20 } = paginationParams;
    const paginatedPrograms = allPrograms.slice(offset, offset + limit);
    
    // Load scenario titles in parallel for paginated results only
    const uniqueScenarioIds = [...new Set(paginatedPrograms.map(p => p.scenarioId))];
    const scenarioTitles = await parallel(
      ...uniqueScenarioIds.map(id => loadScenarioTitle(id, language))
    );
    
    // Create title map
    const titleMap = Object.fromEntries(
      uniqueScenarioIds.map((id, index) => [id, scenarioTitles[index]])
    );
    
    // Add titles to programs
    const programsWithTitles = paginatedPrograms.map(program => ({
      ...program,
      scenarioTitle: titleMap[program.scenarioId] || program.scenarioId
    }));
    
    // Create paginated response
    const paginatedResponse = createPaginatedResponse(
      programsWithTitles,
      allPrograms.length,
      paginationParams
    );
    
    return {
      success: true,
      ...paginatedResponse,
      totalPrograms: allPrograms.length
    };
  }, {
    ttl: 60, // 1 minute cache (short because user-specific)
    staleWhileRevalidate: 300 // 5 minutes
  });
}