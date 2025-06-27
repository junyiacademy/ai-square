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
      taskTitle: string;
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
    // Get userId from query params (in a real app, this would come from auth)
    const userId = request.nextUrl.searchParams.get('userId') || 'default-user';
    
    // Try to get user email from cookie or assume it's the userId if it looks like an email
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
    
    // If userId looks like an email, use it as userEmail
    if (!userEmail && userId.includes('@')) {
      userEmail = userId;
    }
    
    // If we still don't have userEmail but have a demo user, try to get from localStorage pattern
    if (!userEmail && userId === 'user-demo') {
      userEmail = 'demo@example.com';
    }
    
    console.log('Fetching PBL history for userId:', userId, 'userEmail:', userEmail);
    
    // Get all learning logs for the user
    const logs = await pblGCS.getUserLearningLogs(userId, userEmail);
    
    console.log(`Found ${logs.length} PBL sessions for user ${userId}`);
    
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
      const stageDetails = log.scenario.stages.map((stage: any, index: number) => {
        const stageProgress = log.progress.stageProgress.find(sp => sp.stageId === stage.id);
        const stageResult = log.stageResults?.find(sr => sr.stageId === stage.id);
        
        // Count interactions for this stage
        const stageInteractions = log.processLogs?.filter(
          pl => pl.stageId === stage.id && (pl.actionType === 'write' || pl.actionType === 'speak')
        ).length || 0;
        
        // Build task details if stage has tasks
        const taskDetails = stage.tasks?.map((task: any) => {
          // Find task-specific result
          const taskResult = log.stageResults?.find(sr => 
            sr.stageId === stage.id && sr.taskId === task.id
          );
          
          return {
            taskId: task.id,
            taskTitle: task.title || task.name,
            score: taskResult?.score
          };
        });
        
        return {
          stageId: String(stage.id),
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
      const recentProcessLog = log.processLogs?.findLast((pl: any) => pl.detail?.taskId);
      if (recentProcessLog?.detail?.taskId) {
        currentTaskId = recentProcessLog.detail.taskId;
        
        // Find the task title from scenario
        for (const stage of log.scenario.stages) {
          const task = stage.tasks?.find((t: any) => t.id === currentTaskId);
          if (task) {
            currentTaskTitle = task.title || task.name;
            break;
          }
        }
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