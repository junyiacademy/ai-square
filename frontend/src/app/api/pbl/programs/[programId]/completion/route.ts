import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const { programId } = await params;
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
    
    // Get repositories
    const userRepo = repositoryFactory.getUserRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    
    // Get user by email
    const user = await userRepo.findByEmail(userEmail);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Program not found'
        },
        { status: 404 }
      );
    }
    
    // Get tasks and evaluations
    const [tasks, evaluations] = await Promise.all([
      taskRepo.findByProgram(programId),
      evaluationRepo.findByProgram(programId)
    ]);
    
    // Sort tasks by index
    tasks.sort((a, b) => a.taskIndex - b.taskIndex);
    
    // Calculate overall completion stats
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const totalScore = evaluations.reduce((sum, e) => sum + e.score, 0);
    const averageScore = evaluations.length > 0 ? totalScore / evaluations.length : 0;
    
    // Aggregate domain and KSA scores from evaluations
    const domainScores: Record<string, number> = {};
    const ksaScores: Record<string, number> = {};
    let ksaCounts: Record<string, number> = {};
    
    evaluations.forEach(evaluation => {
      if (evaluation.ksaScores) {
        Object.entries(evaluation.ksaScores).forEach(([key, value]) => {
          if (key.includes('_')) {
            // Domain score
            domainScores[key] = (domainScores[key] || 0) + (value as number);
          } else {
            // KSA score
            ksaScores[key] = (ksaScores[key] || 0) + (value as number);
            ksaCounts[key] = (ksaCounts[key] || 0) + 1;
          }
        });
      }
    });
    
    // Calculate averages
    Object.keys(domainScores).forEach(key => {
      domainScores[key] = domainScores[key] / evaluations.length;
    });
    Object.keys(ksaScores).forEach(key => {
      ksaScores[key] = ksaScores[key] / ksaCounts[key];
    });
    
    // Build task summaries
    const taskSummaries = tasks.map(task => {
      const taskEvaluation = evaluations.find(e => e.taskId === task.id);
      return {
        taskId: task.id,
        taskIndex: task.taskIndex,
        status: task.status,
        score: taskEvaluation?.score || task.score || 0,
        completedAt: task.completedAt?.toISOString(),
        timeSpentSeconds: task.timeSpentSeconds
      };
    });
    
    const summary = {
      programId: program.id,
      scenarioId: program.scenarioId,
      userEmail: userEmail,
      status: program.status,
      startedAt: program.startTime.toISOString(),
      completedAt: program.endTime?.toISOString() || new Date().toISOString(),
      totalTasks: program.totalTasks,
      completedTasks: completedTasks.length,
      evaluatedTasks: evaluations.length,
      totalScore: averageScore,
      domainScores,
      ksaScores,
      totalTimeSeconds: program.timeSpentSeconds,
      tasks: taskSummaries,
      metadata: program.metadata
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