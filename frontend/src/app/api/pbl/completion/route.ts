import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getLanguageFromHeader } from '@/lib/utils/language';
import { cachedGET } from '@/lib/api/optimization-utils';
import { ITask, IInteraction } from '@/types/unified-learning';

export async function GET(request: NextRequest) {
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
  const language = getLanguageFromHeader(request);

  if (!programId || !scenarioId) {
    return NextResponse.json(
      { success: false, error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  return cachedGET(request, async () => {

    // Get repositories
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const programRepo = repositoryFactory.getProgramRepository();
    const evalRepo = repositoryFactory.getEvaluationRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const userRepo = repositoryFactory.getUserRepository();
    
    // Get user by email to get UUID
    const user = await userRepo.findByEmail(userEmail);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Verify ownership
    if (program.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Use the new complete API to ensure evaluation is calculated
    const completeUrl = new URL(`/api/pbl/programs/${programId}/complete`, request.url);
    completeUrl.searchParams.set('language', language);
    
    // First try GET to see if evaluation exists
    let completeRes = await fetch(completeUrl.toString(), {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });
    
    // If not found or no evaluation, trigger POST to create it
    if (!completeRes.ok || completeRes.status === 404) {
      console.log('Completion API - Evaluation not found, creating new one');
      completeRes = await fetch(completeUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({})
      });
    }
    
    if (!completeRes.ok) {
      console.error('Failed to get program evaluation');
      return NextResponse.json(
        { success: false, error: 'Failed to get program evaluation' },
        { status: 500 }
      );
    }
    
    const completeData = await completeRes.json();
    const evaluation = completeData.evaluation;
    
    // Debug logging
    console.log('Completion API - completeData:', {
      success: completeData.success,
      hasEvaluation: !!completeData.evaluation,
      evaluationScore: completeData.evaluation?.score,
      evaluationId: completeData.evaluation?.id,
      metadata: completeData.evaluation?.metadata,
      pblData: completeData.evaluation?.pblData,
      debug: completeData.debug
    });
    
    // If no evaluation, log error and return empty data
    if (!evaluation) {
      console.error('Completion API - No evaluation found after complete API call');
    }
    
    // Get all tasks for detailed information
    const tasks = await taskRepo.findByProgram(programId);
    
    // Sort tasks by their position in the program's taskIds array
    const taskIds = (program.metadata?.taskIds || []) as string[];
    const sortedTasks = taskIds.length > 0 ? 
      tasks.sort((a: ITask, b: ITask) => {
        const indexA = taskIds.indexOf(a.id);
        const indexB = taskIds.indexOf(b.id);
        return indexA - indexB;
      }) : tasks;
    
    // Build tasks array with evaluations and progress
    const tasksWithDetails = await Promise.all(
      sortedTasks.map(async (task: ITask, index: number) => {
        // Get task with interactions
        const taskWithInteractions = await taskRepo.getTaskWithInteractions?.(task.id);
        const interactions = taskWithInteractions?.interactions || [];
        
        // Get evaluation if exists
        const taskEvaluation = task.metadata?.evaluationId 
          ? await evalRepo.findById(task.metadata.evaluationId as string)
          : null;
        
        // Calculate time spent
        let timeSpentSeconds = 0;
        if (interactions.length > 0) {
          const firstInteraction = interactions[0];
          const lastInteraction = interactions[interactions.length - 1];
          timeSpentSeconds = Math.floor(
            (new Date(lastInteraction.timestamp).getTime() - new Date(firstInteraction.timestamp).getTime()) / 1000
          );
        }
        
        return {
          taskId: task.id,
          taskTitle: task.title,
          taskIndex: index + 1,
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
            interactions: interactions.map((i: IInteraction) => ({
              type: i.type === 'user_input' ? 'user' : 'assistant',
              message: (i.metadata as Record<string, unknown>)?.message || i.content,
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
      totalTasks: evaluation?.metadata?.totalTasks || evaluation?.pblData?.totalTasks || tasks.length,
      completedTasks: tasks.filter((t: ITask) => t.status === 'completed').length,
      evaluatedTasks: evaluation?.metadata?.evaluatedTaskCount || evaluation?.pblData?.evaluatedTasks || 0,
      overallScore: evaluation?.score || 0,
      domainScores: evaluation?.metadata?.domainScores || evaluation?.domainScores || {},
      ksaScores: evaluation?.metadata?.ksaScores || evaluation?.pblData?.ksaScores || {},
      totalTimeSeconds: evaluation?.metadata?.totalTimeSeconds || evaluation?.timeTakenSeconds || 0,
      tasks: tasksWithDetails,
      // Always return the full multi-language feedback structure
      // This allows the UI to detect which languages have feedback
      // Check both evaluation metadata and program metadata for feedback
      qualitativeFeedback: evaluation?.metadata?.qualitativeFeedback || 
                          program.metadata?.evaluationMetadata?.qualitativeFeedback || 
                          null,
      feedbackLanguage: language,
      feedbackLanguages: evaluation?.metadata?.generatedLanguages || 
                        program.metadata?.evaluationMetadata?.generatedLanguages || 
                        [],
      feedbackGeneratedAt: evaluation?.metadata?.qualitativeFeedback?.[language]?.generatedAt ||
                          (program.metadata?.evaluationMetadata?.qualitativeFeedback as Record<string, any>)?.[language]?.generatedAt,
      programEvaluationId: evaluation?.id
    };

    return {
      success: true,
      data: completionData
    };
  }, {
    ttl: 60, // 1 minute cache (completion data)
    staleWhileRevalidate: 300 // 5 minutes
  });
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