import { NextRequest, NextResponse } from 'next/server';
import { ensureServices } from '@/lib/core/services/api-helpers';
import { promises as fs } from 'fs';
import * as yaml from 'js-yaml';
import path from 'path';
import { ProgramType, ProgramStatus } from '@/lib/core/program/types';
import { TrackType } from '@/lib/core/track/types';

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
  currentTaskId?: string;
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
    
    // Use new architecture
    const services = await ensureServices();
    
    // Get all PBL tracks for the user
    const tracks = await services.trackService.queryTracks({
      userId: userEmail,
      type: TrackType.PBL,
      projectId: scenarioId // This will filter by scenario if provided
    });
    
    // Get all programs for these tracks
    const programsPromises = tracks.map(track => 
      services.programService.queryPrograms({
        trackId: track.id,
        userId: userEmail,
        type: ProgramType.PBL
      })
    );
    
    const programsArrays = await Promise.all(programsPromises);
    const allPrograms = programsArrays.flat();
    
    console.log(`Found ${allPrograms.length} programs for user ${userEmail}`);
    
    // Get evaluations for all programs
    const evaluations = await services.evaluationService.queryEvaluations({
      userId: userEmail,
      entityType: 'task'
    });
    
    // Build program completion data
    const programCompletionData: ProgramCompletionData[] = [];
    
    for (const program of allPrograms) {
      // Get tasks for this program
      const tasks = await services.taskService.queryTasks({
        programId: program.id,
        userId: userEmail
      });
      
      // Calculate task summaries and scores
      const taskSummaries: TaskSummary[] = [];
      const domainScores: Record<string, number> = {};
      const domainCounts: Record<string, number> = {};
      const ksaScores: Record<string, number> = {};
      let overallScore = 0;
      let evaluatedTasksCount = 0;
      
      for (const task of tasks) {
        const taskEvaluations = evaluations.filter(e => e.entityId === task.id);
        const latestEval = taskEvaluations.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        
        if (latestEval) {
          evaluatedTasksCount++;
          overallScore += latestEval.score || 0;
          
          taskSummaries.push({
            taskId: task.config?.taskId || task.id,
            title: task.title,
            score: latestEval.score || 0,
            completedAt: latestEval.createdAt.toISOString()
          });
          
          // Aggregate domain scores
          if (latestEval.results?.domainScores) {
            for (const [domain, score] of Object.entries(latestEval.results.domainScores)) {
              if (!domainScores[domain]) {
                domainScores[domain] = 0;
                domainCounts[domain] = 0;
              }
              domainScores[domain] += score;
              domainCounts[domain]++;
            }
          }
          
          // Aggregate KSA scores
          if (latestEval.results?.ksaScores) {
            for (const [category, data] of Object.entries(latestEval.results.ksaScores)) {
              if (typeof data === 'object' && 'score' in data) {
                ksaScores[category] = (ksaScores[category] || 0) + (data.score || 0);
              }
            }
          }
        }
      }
      
      // Average scores
      if (evaluatedTasksCount > 0) {
        overallScore = Math.round(overallScore / evaluatedTasksCount);
        
        for (const domain of Object.keys(domainScores)) {
          domainScores[domain] = Math.round(domainScores[domain] / domainCounts[domain]);
        }
        
        for (const category of Object.keys(ksaScores)) {
          ksaScores[category] = Math.round(ksaScores[category] / evaluatedTasksCount);
        }
      }
      
      // Calculate time spent
      const startTime = program.startedAt || program.createdAt;
      const endTime = program.completedAt || new Date();
      const totalTimeSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      
      programCompletionData.push({
        programId: program.id,
        scenarioId: program.config?.scenarioId || program.metadata?.source || '',
        userEmail,
        status: program.status === ProgramStatus.COMPLETED ? 'completed' : 
                program.status === ProgramStatus.IN_PROGRESS ? 'in_progress' : 'draft',
        startedAt: startTime.toISOString(),
        updatedAt: program.updatedAt.toISOString(),
        completedAt: program.completedAt?.toISOString(),
        totalTasks: tasks.length,
        evaluatedTasks: evaluatedTasksCount,
        overallScore,
        domainScores,
        ksaScores,
        totalTimeSeconds,
        taskSummaries,
        currentTaskId: program.progress?.currentTaskId
      });
    }
    
    // Load scenario titles from YAML files
    const scenarioTitles: Record<string, string> = {};
    for (const program of programCompletionData) {
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
    const programsWithTitles: ProgramCompletionData[] = programCompletionData.map(program => ({
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