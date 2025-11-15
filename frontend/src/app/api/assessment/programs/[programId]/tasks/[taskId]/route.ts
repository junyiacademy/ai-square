import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { getLanguageFromHeader } from '@/lib/utils/language';
import { AssessmentInteraction, toIInteraction } from '@/types/assessment-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string; taskId: string }> }
) {
  try {
    const { programId, taskId } = await params;

    // Only accept UUID format for all IDs
    if (!programId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid program ID format. UUID required.' },
        { status: 400 }
      );
    }

    if (!taskId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid task ID format. UUID required.' },
        { status: 400 }
      );
    }

    // Get user session
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    // Use unified architecture to get task
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const taskRepo = repositoryFactory.getTaskRepository();
    const programRepo = repositoryFactory.getProgramRepository();

    // First verify the program exists and belongs to the user
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Program not found or access denied' },
        { status: 404 }
      );
    }

    // Get the task
    const task = await taskRepo.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Verify the task belongs to the program
    if (task.programId !== programId) {
      return NextResponse.json(
        { success: false, error: 'Task does not belong to this program' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        programId: task.programId,
        title: task.title,
        type: task.type,
        context: task.content,
        interactions: [], // Interactions are fetched separately via interactions endpoint
        status: task.status,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        evaluationId: undefined // Evaluation ID is stored separately
      }
    });

  } catch (error) {
    console.error('Error fetching assessment task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string; taskId: string }> }
) {
  try {
    const { programId, taskId } = await params;
    const { action, answers } = await request.json();

    // Only accept UUID format for all IDs
    if (!programId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid program ID format. UUID required.' },
        { status: 400 }
      );
    }

    if (!taskId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid task ID format. UUID required.' },
        { status: 400 }
      );
    }

    // Get user session
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    // Get language from request
    const language = getLanguageFromHeader(request);

    // Use unified architecture
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const taskRepo = repositoryFactory.getTaskRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    const evalRepo = repositoryFactory.getEvaluationRepository();

    // First verify the program exists and belongs to the user
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Program not found or access denied' },
        { status: 404 }
      );
    }

    // Get the task
    const task = await taskRepo.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Verify the task belongs to the program
    if (task.programId !== programId) {
      return NextResponse.json(
        { success: false, error: 'Task does not belong to this program' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'start':
        // Mark task as active
        await taskRepo.update?.(taskId, {
          status: 'active',
          metadata: {
            ...task.metadata,
            startedAt: new Date().toISOString()
          }
        });
        break;

      case 'submit':
        if (!answers || !Array.isArray(answers)) {
          return NextResponse.json(
            { success: false, error: 'Invalid answers format' },
            { status: 400 }
          );
        }

        // Process answers and create interactions
        interface QuestionType {
          id: string;
          correct_answer?: string;
          ksa_mapping?: Record<string, unknown>;
        }
        const questionsArray = Array.isArray((task.content as Record<string, unknown>)?.questions)
          ? (task.content as Record<string, unknown>)?.questions as QuestionType[]
          : [];
        const assessmentInteractions: AssessmentInteraction[] = answers.map((answer: { questionId: string; answer: string; timeSpent?: number }) => {
          const question = questionsArray.find((q) => q.id === answer.questionId);
          const isCorrect = question && question.correct_answer !== undefined
            ? String(answer.answer) === String(question.correct_answer)
            : false;

          return {
            timestamp: new Date().toISOString(),
            type: 'assessment_answer' as const,
            context: {
              questionId: answer.questionId,
              selectedAnswer: answer.answer,
              isCorrect,
              timeSpent: answer.timeSpent || 0,
              ksa_mapping: question?.ksa_mapping
            }
          };
        });

        // Convert to IInteraction for storage
        const interactions = assessmentInteractions.map(toIInteraction);

        // Store interactions in task
        const updatedInteractions = [...(task.interactions || []), ...interactions];
        await taskRepo.update?.(taskId, {
          interactions: updatedInteractions,
          interactionCount: updatedInteractions.length,
          metadata: {
            ...task.metadata,
            lastAnsweredAt: new Date().toISOString()
          }
        });

        // Calculate score
        const correctCount = assessmentInteractions.filter(i => i.context.isCorrect).length;
        const totalQuestions = questionsArray.length;
        const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

        // Create task evaluation
        const evaluation = await evalRepo.create({
          userId: session.user.id,
          programId: programId,
          taskId: taskId,
          mode: 'assessment',
          evaluationType: 'task',
          evaluationSubtype: 'assessment_task',
          score,
          maxScore: 100,
          timeTakenSeconds: 0,
          domainScores: {},
          feedbackText: `Assessment task completed with ${correctCount}/${totalQuestions} correct answers`,
          feedbackData: {},
          aiAnalysis: {},
          pblData: {},
          discoveryData: {},
          assessmentData: {
            totalQuestions,
            correctAnswers: correctCount,
            language,
            interactions: assessmentInteractions
          },
          metadata: {
            evaluatedAt: new Date().toISOString()
          },
          createdAt: new Date().toISOString()
        });

        // Update task status and link evaluation
        await taskRepo.update?.(taskId, {
          status: 'completed',
          metadata: {
            ...task.metadata,
            completedAt: new Date().toISOString(),
            evaluationId: evaluation.id
          }
        });

        return NextResponse.json({
          success: true,
          evaluation: {
            id: evaluation.id,
            score: evaluation.score,
            totalQuestions,
            correctAnswers: correctCount,
            feedback: evaluation.feedbackText
          }
        });

      case 'complete':
        // Mark task as completed
        await taskRepo.update?.(taskId, {
          status: 'completed',
          metadata: {
            ...task.metadata,
            completedAt: new Date().toISOString()
          }
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Return updated task
    const updatedTask = await taskRepo.findById(taskId);
    return NextResponse.json({
      success: true,
      task: updatedTask
    });

  } catch (error) {
    console.error('Error updating assessment task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
