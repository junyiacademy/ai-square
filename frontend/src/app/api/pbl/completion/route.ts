import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getLanguageFromHeader } from '@/lib/utils/language';

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    const userEmail = session.user.email;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId');
    const scenarioId = searchParams.get('scenarioId');
    const language = getLanguageFromHeader(request.headers.get('Accept-Language'));

    if (!programId || !scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get repositories
    const { getProgramRepository, getEvaluationRepository, getTaskRepository } = await import('@/lib/implementations/gcs-v2');
    const programRepo = getProgramRepository();
    const evalRepo = getEvaluationRepository();
    const taskRepo = getTaskRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }

    // Use the new complete API to ensure evaluation is calculated
    const completeUrl = new URL(`/api/pbl/programs/${programId}/complete`, request.url);
    completeUrl.searchParams.set('language', language);
    
    const completeRes = await fetch(completeUrl.toString(), {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });
    
    if (!completeRes.ok) {
      console.error('Failed to get program evaluation');
      return NextResponse.json(
        { success: false, error: 'Failed to get program evaluation' },
        { status: 500 }
      );
    }
    
    const completeData = await completeRes.json();
    const evaluation = completeData.evaluation;
    
    // Get all tasks for detailed information
    const tasks = await taskRepo.findByProgram(programId);
    
    // Build tasks array with evaluations and progress
    const tasksWithDetails = await Promise.all(
      tasks.map(async (task) => {
        const taskEvaluation = task.evaluationId 
          ? await evalRepo.findById(task.evaluationId)
          : null;
        
        // Calculate time spent
        let timeSpentSeconds = 0;
        if (task.interactions && task.interactions.length > 0) {
          const firstInteraction = task.interactions[0];
          const lastInteraction = task.interactions[task.interactions.length - 1];
          timeSpentSeconds = Math.floor(
            (new Date(lastInteraction.timestamp).getTime() - new Date(firstInteraction.timestamp).getTime()) / 1000
          );
        }
        
        return {
          taskId: task.id,
          taskTitle: task.title,
          evaluation: taskEvaluation ? {
            score: taskEvaluation.score || 0,
            domainScores: taskEvaluation.metadata?.domainScores,
            ksaScores: taskEvaluation.metadata?.ksaScores,
            conversationInsights: taskEvaluation.metadata?.conversationInsights,
            strengths: taskEvaluation.metadata?.strengths,
            improvements: taskEvaluation.metadata?.improvements,
            evaluatedAt: taskEvaluation.createdAt
          } : undefined,
          log: {
            interactions: task.interactions.map(i => ({
              type: i.type === 'user_input' ? 'user' : 'assistant',
              message: i.content.message || i.content,
              timestamp: i.timestamp
            })),
            startedAt: task.startedAt,
            completedAt: task.completedAt
          },
          progress: {
            timeSpentSeconds,
            status: task.status
          }
        };
      })
    );
    
    // Build completion data in old format
    const completionData = {
      programId,
      scenarioId,
      userEmail,
      status: program.status === 'completed' ? 'completed' : 'in_progress',
      startedAt: program.startedAt,
      updatedAt: evaluation?.metadata?.lastUpdatedAt || program.startedAt,
      completedAt: program.completedAt,
      totalTasks: evaluation?.metadata?.totalTasks || tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      evaluatedTasks: evaluation?.metadata?.evaluatedTasks || 0,
      overallScore: evaluation?.score || 0,
      domainScores: evaluation?.metadata?.domainScores || {},
      ksaScores: evaluation?.metadata?.ksaScores || {},
      totalTimeSeconds: evaluation?.metadata?.totalTimeSeconds || 0,
      tasks: tasksWithDetails,
      // Always return the full multi-language feedback structure
      // This allows the UI to detect which languages have feedback
      qualitativeFeedback: evaluation?.metadata?.qualitativeFeedback || null,
      feedbackLanguage: language,
      feedbackLanguages: evaluation?.metadata?.generatedLanguages || [],
      feedbackGeneratedAt: evaluation?.metadata?.qualitativeFeedback?.[language]?.generatedAt,
      programEvaluationId: evaluation?.id
    };

    return NextResponse.json({
      success: true,
      data: completionData
    });

  } catch (error) {
    console.error('Error getting completion data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get completion data' },
      { status: 500 }
    );
  }
}

// PUT - Trigger program completion evaluation (redirect to new API)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { programId } = body;

    if (!programId) {
      return NextResponse.json(
        { success: false, error: 'Missing programId' },
        { status: 400 }
      );
    }

    // Redirect to new API
    const completeUrl = new URL(`/api/pbl/programs/${programId}/complete`, request.url);
    const completeRes = await fetch(completeUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify({})
    });
    
    if (!completeRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to trigger program completion' },
        { status: 500 }
      );
    }
    
    const data = await completeRes.json();
    return NextResponse.json({
      success: true,
      message: 'Program evaluation created successfully',
      evaluationId: data.evaluation?.id
    });

  } catch (error) {
    console.error('Error updating completion data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update completion data' },
      { status: 500 }
    );
  }
}