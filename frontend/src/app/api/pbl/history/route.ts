import { NextRequest, NextResponse } from 'next/server';
import { pblGCS } from '@/lib/storage/pbl-gcs-service';

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

export async function GET(request: NextRequest) {
  try {
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
    const sessions: SessionSummary[] = logs.map(log => {
      const startTime = new Date(log.metadata.startTime);
      const endTime = log.metadata.endTime ? new Date(log.metadata.endTime) : new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Calculate progress
      const totalStages = log.scenario.stages.length;
      const completedStages = log.progress.stageProgress.filter(
        stage => stage.status === 'completed'
      ).length;
      const percentage = Math.round((completedStages / totalStages) * 100);
      
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
      
      // Build stage details
      const stageDetails = (log.scenario.stages as Array<Record<string, unknown>>).map((stage: Record<string, unknown>, index: number) => {
        const stageId = String(stage.id);
        const stageProgress = log.progress.stageProgress.find((sp: { stageId: string }) => sp.stageId === stageId);
        const stageResult = log.stageResults?.find((sr: { stageId: string }) => sr.stageId === stageId);
        
        // Count interactions for this stage
        const stageInteractions = log.processLogs?.filter(
          (pl: { stageId: string; actionType: string }) => pl.stageId === stageId && (pl.actionType === 'write' || pl.actionType === 'speak')
        ).length || 0;
        
        // Build task details if stage has tasks
        const stageTasks = stage.tasks as Array<{ id: string; title?: string; name?: string }> | undefined;
        const taskDetails = stageTasks?.map((task) => {
          // Find task-specific result
          const taskResult = log.stageResults?.find((sr: { stageId: string; taskId?: string }) => 
            sr.stageId === stageId && sr.taskId === task.id
          );
          
          return {
            taskId: task.id,
            taskTitle: task.title || task.name,
            score: taskResult?.score
          };
        });
        
        return {
          stageId: stageId,
          stageTitle: String(stage.title || stage.name) || `Stage ${index + 1}`,
          status: stageProgress?.status || 'not_started',
          score: stageResult?.score,
          interactions: Math.floor(stageInteractions / 2), // Divide by 2 for user-AI pairs
          taskDetails: taskDetails || []
        };
      });
      
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
          const stageTasks = stage.tasks as Array<{ id: string; title?: string; name?: string }> | undefined;
          const task = stageTasks?.find((t) => t.id === currentTaskId);
          if (task) {
            const scenarioTitle = log.scenario.title || 'Scenario';
            const stageTitle = String(stage.title || stage.name || 'Stage');
            const taskTitle = task.title || task.name || 'Task';
            // Combine scenario, stage and task title
            currentTaskTitle = `${scenarioTitle} - ${stageTitle} - ${taskTitle}`;
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
            const scenarioTitle = log.scenario.title || 'Scenario';
            const stageTitle = String(currentStage.title || currentStage.name || `Stage ${latestStageIndex + 1}`);
            const taskTitle = firstTask.title || firstTask.name || 'Task';
            // Combine scenario, stage and task title
            currentTaskTitle = `${scenarioTitle} - ${stageTitle} - ${taskTitle}`;
          }
        }
      }
      
      // Final fallback: just use scenario title with first stage
      if (!currentTaskTitle && log.scenario.stages.length > 0) {
        const firstStage = log.scenario.stages[0] as Record<string, unknown>;
        const scenarioTitle = log.scenario.title || 'Scenario';
        const stageTitle = String(firstStage.title || firstStage.name || 'Stage 1');
        currentTaskTitle = `${scenarioTitle} - ${stageTitle}`;
      }
      
      return {
        id: log.sessionId,
        logId: log.logId,
        scenarioId: log.scenario.id,
        scenarioTitle: log.scenario.title,
        currentTaskId,
        currentTaskTitle,
        status,
        startedAt: log.metadata.startTime,
        completedAt: log.metadata.endTime,
        duration,
        progress: {
          percentage,
          completedStages,
          totalStages
        },
        score: score || averageScore,
        stageDetails,
        totalInteractions: Math.floor(totalInteractions / 2), // Divide by 2 for user-AI pairs
        averageScore,
        domainScores
      };
    });
    
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