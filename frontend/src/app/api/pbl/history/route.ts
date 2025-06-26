import { NextRequest, NextResponse } from 'next/server';
import { pblGCS } from '@/lib/storage/pbl-gcs-service';

interface SessionSummary {
  id: string;
  logId: string;
  scenarioId: string;
  scenarioTitle: string;
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
}

export async function GET(request: NextRequest) {
  try {
    // Get userId from query params (in a real app, this would come from auth)
    const userId = request.nextUrl.searchParams.get('userId') || 'default-user';
    
    // Get all learning logs for the user
    const logs = await pblGCS.getUserLearningLogs(userId);
    
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
      
      return {
        id: log.sessionId,
        logId: log.logId,
        scenarioId: log.scenario.id,
        scenarioTitle: log.scenario.title,
        status,
        startedAt: log.metadata.startTime,
        completedAt: log.metadata.endTime,
        duration,
        progress: {
          percentage,
          completedStages,
          totalStages
        },
        score
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