import { NextRequest, NextResponse } from 'next/server';
import { ensureServices } from '@/lib/core/services/api-helpers';
import { ProgramStatus } from '@/lib/core/program/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const { id } = await params;
    const scenarioId = searchParams.get('scenarioId');
    
    if (!scenarioId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scenario ID is required'
        },
        { status: 400 }
      );
    }
    
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
    
    // Use new architecture
    const services = await ensureServices();
    
    // Get program
    const program = await services.programService.getProgram(userEmail, id);
    if (!program) {
      return NextResponse.json(
        {
          success: false,
          error: 'Program not found'
        },
        { status: 404 }
      );
    }
    
    // Get all tasks for this program
    const tasks = await services.taskService.queryTasks({
      programId: id,
      userId: userEmail
    });
    
    // Get evaluations for all tasks
    const evaluations = await services.evaluationService.queryEvaluations({
      userId: userEmail,
      entityType: 'task'
    });
    
    // Build task summaries
    const taskSummaries = tasks.map(task => {
      const taskEvaluations = evaluations.filter(e => e.entityId === task.id);
      const latestEval = taskEvaluations.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      return {
        taskId: task.config?.taskId || task.id,
        taskTitle: task.title,
        status: latestEval ? 'completed' : 'not_started',
        score: latestEval?.score || 0,
        evaluatedAt: latestEval?.createdAt?.toISOString(),
        attempts: taskEvaluations.length
      };
    });
    
    // Calculate overall statistics
    const evaluatedTasks = taskSummaries.filter(t => t.status === 'completed');
    const overallScore = evaluatedTasks.length > 0
      ? Math.round(evaluatedTasks.reduce((sum, t) => sum + t.score, 0) / evaluatedTasks.length)
      : 0;
    
    // Calculate time spent
    const timeSpentSeconds = program.progress.timeSpent || 0;
    const startTime = program.startedAt || program.createdAt;
    const endTime = program.completedAt || new Date();
    const totalTimeSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    
    // Build program summary
    const summary = {
      programId: id,
      scenarioId: program.config?.scenarioId || scenarioId,
      status: program.status === ProgramStatus.COMPLETED ? 'completed' : 
              program.status === ProgramStatus.IN_PROGRESS ? 'in_progress' : 'draft',
      startedAt: startTime.toISOString(),
      completedAt: program.completedAt?.toISOString(),
      totalTasks: tasks.length,
      completedTasks: evaluatedTasks.length,
      overallScore,
      timeSpentSeconds: totalTimeSeconds,
      tasks: taskSummaries,
      achievements: program.progress.completion?.achievements || [],
      insights: program.progress.completion?.insights || []
    };
    
    return NextResponse.json({
      success: true,
      summary
    });
    
  } catch (error) {
    console.error('Get program summary error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get program summary'
      },
      { status: 500 }
    );
  }
}