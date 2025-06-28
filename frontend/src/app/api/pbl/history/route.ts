import { NextRequest, NextResponse } from 'next/server';
import { pblGCS } from '@/lib/storage/pbl-gcs-service';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface SessionSummary {
  id: string;
  logId: string;
  scenarioId: string;
  scenarioTitle: string;
  currentTaskId?: string;
  currentTaskTitle?: string;
  status: 'completed' | 'in_progress' | 'paused';
  startedAt: string;
  completedAt?: string;
  duration: number;
  progress: {
    percentage: number;
    completedStages: number;
    totalStages: number;
  };
  score?: number;
  stageDetails?: Array<{
    stageId: string;
    stageTitle: string;
    status: string;
    score?: number;
    interactions: number;
    taskDetails?: Array<{
      taskId: string;
      taskTitle: string | undefined;
      score?: number;
    }>;
  }>;
  totalInteractions: number;
  averageScore?: number;
  domainScores?: {
    engaging_with_ai: number;
    creating_with_ai: number;
    managing_with_ai: number;
    designing_with_ai: number;
  };
}

// Load scenario data from YAML file
async function loadScenarioData(scenarioId: string) {
  try {
    const yamlPath = path.join(process.cwd(), 'public', 'pbl_data', `${scenarioId.replace(/-/g, '_')}_scenario.yaml`);
    const yamlContent = await fs.readFile(yamlPath, 'utf8');
    const data = yaml.load(yamlContent) as any;
    return data;
  } catch (error) {
    console.error(`Error loading scenario data for ${scenarioId}:`, error);
    return null;
  }
}

// Get task title from scenario data
function getTaskTitle(scenarioData: any, taskId: string, lang: string = 'en'): string | null {
  if (!scenarioData || !scenarioData.stages) return null;
  
  for (const stage of scenarioData.stages) {
    if (stage.tasks) {
      const task = stage.tasks.find((t: any) => t.id === taskId);
      if (task) {
        // Get localized title based on language
        if (lang === 'zh' || lang === 'zh-TW' || lang === 'zh-CN') {
          const scenarioTitle = scenarioData.scenario_info?.title_zh || scenarioData.scenario_info?.title || 'Scenario';
          const stageTitle = stage.name_zh || stage.name || 'Stage';
          const taskTitle = task.title_zh || task.title || 'Task';
          return `${scenarioTitle} - ${stageTitle} - ${taskTitle}`;
        }
        // Default to English
        const scenarioTitle = scenarioData.scenario_info?.title || 'Scenario';
        const stageTitle = stage.name || 'Stage';
        const taskTitle = task.title || 'Task';
        return `${scenarioTitle} - ${stageTitle} - ${taskTitle}`;
      }
    }
  }
  
  return null;
}

export async function GET(request: NextRequest) {
  try {
    // Get language from request header or query parameter
    const acceptLanguage = request.headers.get('accept-language');
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || acceptLanguage?.split(',')[0]?.split('-')[0] || 'en';
    
    // Get user email from cookie - this is now required
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
          error: 'User authentication required (no email found)'
        },
        { status: 401 }
      );
    }
    
    console.log('Fetching PBL history for userEmail:', userEmail);
    
    // Get all learning logs for the user (using email only)
    const logs = await pblGCS.getUserLearningLogs('', userEmail);
    
    console.log(`Found ${logs.length} PBL sessions for user ${userEmail}`);
    
    // Transform logs into session summaries
    const sessions: SessionSummary[] = await Promise.all(logs.map(async (log) => {
      const startTime = new Date(log.metadata.startTime);
      const endTime = log.metadata.endTime ? new Date(log.metadata.endTime) : new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Calculate progress - defensive programming for invalid data
      const totalStages = log.scenario.stages?.length || 0;
      const completedStages = log.progress.stageProgress?.filter(
        stage => stage.status === 'completed'
      ).length || 0;
      
      // If totalStages is 0 but we have completed stages, try to infer from stageProgress
      const actualTotalStages = totalStages > 0 ? totalStages : 
        (log.progress.stageProgress?.length || Math.max(completedStages, 1));
      
      const percentage = actualTotalStages > 0 
        ? Math.round((completedStages / actualTotalStages) * 100)
        : 0;
      
      // Determine status
      let status: SessionSummary['status'] = 'in_progress';
      if (log.metadata.status === 'completed') {
        status = 'completed';
      } else if (log.metadata.status === 'paused') {
        status = 'paused';
      }
      
      // Calculate score if completed
      let score: number | undefined;
      if (status === 'completed' && log.evaluations.length > 0) {
        const totalScore = log.evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0);
        score = Math.round(totalScore / log.evaluations.length);
      }
      
      // Count total interactions from process logs
      const totalInteractions = log.processLogs?.filter(
        pl => pl.actionType === 'write' || pl.actionType === 'speak'
      ).length || 0;
      
      // Build stage details - handle cases where stages might be missing
      const stages = (log.scenario.stages as Array<Record<string, unknown>>) || [];
      const stageDetails = stages.length > 0 ? stages.map((stage: Record<string, unknown>, index: number) => {
        const stageId = String(stage.id);
        const stageProgress = log.progress.stageProgress.find((sp: { stageId: string }) => sp.stageId === stageId);
        const stageResult = log.stageResults?.find((sr: { stageId: string }) => sr.stageId === stageId);
        
        // Count interactions for this stage
        const stageInteractions = log.processLogs?.filter(
          (pl: { stageId: string; actionType: string }) => pl.stageId === stageId && (pl.actionType === 'write' || pl.actionType === 'speak')
        ).length || 0;
        
        // Build task details if stage has tasks
        const stageTasks = stage.tasks as Array<{ id: string; title?: string; title_zh?: string; name?: string; name_zh?: string }> | undefined;
        const taskDetails = stageTasks?.map((task) => {
          // Find task-specific result
          const taskResult = log.stageResults?.find((sr: { stageId: string; taskId?: string }) => 
            sr.stageId === stageId && sr.taskId === task.id
          );
          
          // Get localized task title
          const taskTitle = (lang === 'zh' || lang === 'zh-TW' || lang === 'zh-CN')
            ? (task.title_zh || task.name_zh || task.title || task.name)
            : (task.title || task.name);
          
          return {
            taskId: task.id,
            taskTitle,
            score: taskResult?.score
          };
        });
        
        // Get localized stage title
        const stageTitle = (lang === 'zh' || lang === 'zh-TW' || lang === 'zh-CN')
          ? String((stage as any).title_zh || (stage as any).name_zh || stage.title || stage.name) || `Stage ${index + 1}`
          : String(stage.title || stage.name) || `Stage ${index + 1}`;
        
        return {
          stageId: stageId,
          stageTitle,
          status: stageProgress?.status || 'not_started',
          score: stageResult?.score,
          interactions: Math.floor(stageInteractions / 2), // Divide by 2 for user-AI pairs
          taskDetails: taskDetails || []
        };
      }) : [];
      
      // If no stage details but we have stageProgress, create minimal stage details
      if (stageDetails.length === 0 && log.progress.stageProgress?.length > 0) {
        stageDetails.push(...log.progress.stageProgress.map((sp: any, index: number) => ({
          stageId: sp.stageId,
          stageTitle: `Stage ${index + 1}`,
          status: sp.status || 'not_started',
          score: sp.score,
          interactions: 0,
          taskDetails: []
        })));
      }
      
      // Calculate average score from stage results
      const stageScores = log.stageResults?.map(sr => sr.score).filter(s => s !== undefined) || [];
      const averageScore = stageScores.length > 0 
        ? Math.round(stageScores.reduce((sum, s) => sum + (s || 0), 0) / stageScores.length)
        : undefined;
      
      // Calculate domain scores from stage results
      let domainScores: SessionSummary['domainScores'] | undefined;
      if (log.stageResults && log.stageResults.length > 0) {
        const domains = {
          engaging_with_ai: 0,
          creating_with_ai: 0,
          managing_with_ai: 0,
          designing_with_ai: 0
        };
        const domainCounts = { ...domains };
        
        // Aggregate domain scores from stage results
        log.stageResults.forEach(result => {
          if (result.domainScores) {
            Object.entries(result.domainScores).forEach(([domain, score]) => {
              domains[domain as keyof typeof domains] += score as number;
              domainCounts[domain as keyof typeof domains] += 1;
            });
          }
        });
        
        // Calculate average for each domain
        Object.keys(domains).forEach(domain => {
          const key = domain as keyof typeof domains;
          if (domainCounts[key] > 0) {
            domains[key] = Math.round(domains[key] / domainCounts[key]);
          }
        });
        
        // Only include domain scores if we have at least one score
        if (Object.values(domainCounts).some(count => count > 0)) {
          domainScores = domains;
        }
      }
      
      // Find the current/latest task from process logs
      let currentTaskId: string | undefined;
      let currentTaskTitle: string | undefined;
      
      // Look for the most recent task in process logs
      const recentProcessLog = log.processLogs?.findLast((pl: { detail?: { taskId?: string } }) => pl.detail?.taskId);
      if (recentProcessLog?.detail?.taskId) {
        currentTaskId = recentProcessLog.detail.taskId;
        
        // Find the task title and stage title from scenario
        for (const stage of log.scenario.stages as Array<Record<string, unknown>>) {
          const stageTasks = stage.tasks as Array<{ id: string; title?: string; title_zh?: string; name?: string; name_zh?: string }> | undefined;
          const task = stageTasks?.find((t) => t.id === currentTaskId);
          if (task) {
            // Get localized titles based on language
            if (lang === 'zh' || lang === 'zh-TW' || lang === 'zh-CN') {
              const scenarioTitle = (log.scenario as any).title_zh || log.scenario.title || 'Scenario';
              const stageTitle = String((stage as any).title_zh || (stage as any).name_zh || stage.title || stage.name || 'Stage');
              const taskTitle = task.title_zh || task.name_zh || task.title || task.name || 'Task';
              currentTaskTitle = `${scenarioTitle} - ${stageTitle} - ${taskTitle}`;
            } else {
              const scenarioTitle = log.scenario.title || 'Scenario';
              const stageTitle = String(stage.title || stage.name || 'Stage');
              const taskTitle = task.title || task.name || 'Task';
              currentTaskTitle = `${scenarioTitle} - ${stageTitle} - ${taskTitle}`;
            }
            break;
          }
        }
      }
      
      // If we still don't have a currentTaskTitle, try to determine from progress
      if (!currentTaskTitle) {
        // Find the latest active or completed stage
        let latestStageIndex = 0;
        if (log.progress && log.progress.stageProgress) {
          for (let i = log.progress.stageProgress.length - 1; i >= 0; i--) {
            const stageProgress = log.progress.stageProgress[i];
            if (stageProgress.status === 'completed' || stageProgress.status === 'in_progress') {
              const stageIndex = (log.scenario.stages as Array<Record<string, unknown>>).findIndex(
                (s: Record<string, unknown>) => String(s.id) === stageProgress.stageId
              );
              if (stageIndex >= 0) {
                latestStageIndex = stageIndex;
                break;
              }
            }
          }
        }
        
        // Use the latest stage and its first task
        const currentStage = log.scenario.stages[latestStageIndex] as Record<string, unknown> | undefined;
        if (currentStage) {
          const stageTasks = currentStage.tasks as Array<{ id: string; title?: string; name?: string }> | undefined;
          const firstTask = stageTasks?.[0];
          if (firstTask) {
            currentTaskId = firstTask.id;
            // Get localized titles based on language
            if (lang === 'zh' || lang === 'zh-TW' || lang === 'zh-CN') {
              const scenarioTitle = (log.scenario as any).title_zh || log.scenario.title || 'Scenario';
              const stageTitle = String((currentStage as any).title_zh || (currentStage as any).name_zh || currentStage.title || currentStage.name || `Stage ${latestStageIndex + 1}`);
              const taskTitle = (firstTask as any).title_zh || (firstTask as any).name_zh || firstTask.title || firstTask.name || 'Task';
              currentTaskTitle = `${scenarioTitle} - ${stageTitle} - ${taskTitle}`;
            } else {
              const scenarioTitle = log.scenario.title || 'Scenario';
              const stageTitle = String(currentStage.title || currentStage.name || `Stage ${latestStageIndex + 1}`);
              const taskTitle = firstTask.title || firstTask.name || 'Task';
              currentTaskTitle = `${scenarioTitle} - ${stageTitle} - ${taskTitle}`;
            }
          }
        }
      }
      
      // Final fallback: just use scenario title with first stage
      if (!currentTaskTitle && log.scenario.stages.length > 0) {
        const firstStage = log.scenario.stages[0] as Record<string, unknown>;
        if (lang === 'zh' || lang === 'zh-TW' || lang === 'zh-CN') {
          const scenarioTitle = (log.scenario as any).title_zh || log.scenario.title || 'Scenario';
          const stageTitle = String((firstStage as any).title_zh || (firstStage as any).name_zh || firstStage.title || firstStage.name || 'Stage 1');
          currentTaskTitle = `${scenarioTitle} - ${stageTitle}`;
        } else {
          const scenarioTitle = log.scenario.title || 'Scenario';
          const stageTitle = String(firstStage.title || firstStage.name || 'Stage 1');
          currentTaskTitle = `${scenarioTitle} - ${stageTitle}`;
        }
      }
      
      // Last resort: if we still don't have a title but have taskId, load from YAML
      if (!currentTaskTitle && currentTaskId && log.scenario.id) {
        const scenarioData = await loadScenarioData(log.scenario.id);
        if (scenarioData) {
          const titleFromYaml = getTaskTitle(scenarioData, currentTaskId, lang);
          if (titleFromYaml) {
            currentTaskTitle = titleFromYaml;
            console.log(`Loaded task title from YAML for ${currentTaskId}: ${currentTaskTitle}`);
          }
        }
      }
      
      // Get localized scenario title - prefer session_data
      const scenarioTitle = log.session_data?.scenarioTitle || 
        ((lang === 'zh' || lang === 'zh-TW' || lang === 'zh-CN') 
          ? ((log.scenario as any)?.title_zh || log.scenario?.title || 'Scenario')
          : (log.scenario?.title || 'Scenario'));
      
      // Use session_data for task info if available
      if (!currentTaskTitle && log.session_data?.currentTaskTitle) {
        currentTaskId = log.session_data.currentTaskId || currentTaskId;
        currentTaskTitle = `${scenarioTitle} - ${log.session_data.currentStageTitle || ''} - ${log.session_data.currentTaskTitle}`;
      }
      
      return {
        id: log.sessionId,
        logId: log.logId,
        scenarioId: log.session_data?.scenarioId || log.scenario?.id || log.scenario_id,
        scenarioTitle,
        currentTaskId: currentTaskId || log.session_data?.currentTaskId,
        currentTaskTitle: currentTaskTitle || 
          (log.session_data?.currentTaskTitle ? 
            `${scenarioTitle} - ${log.session_data.currentStageTitle || ''} - ${log.session_data.currentTaskTitle}` : 
            null),
        status,
        startedAt: log.metadata.startTime,
        completedAt: log.metadata.endTime,
        duration,
        progress: {
          percentage,
          completedStages,
          totalStages: actualTotalStages
        },
        score: score || averageScore,
        stageDetails,
        totalInteractions: Math.floor(totalInteractions / 2), // Divide by 2 for user-AI pairs
        averageScore,
        domainScores
      };
    }));
    
    // Sort by most recent first
    sessions.sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    
    return NextResponse.json({
      success: true,
      data: sessions,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        totalSessions: sessions.length
      }
    });
    
  } catch (error) {
    console.error('History API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'HISTORY_ERROR',
          message: 'Failed to fetch learning history'
        }
      },
      { status: 500 }
    );
  }
}