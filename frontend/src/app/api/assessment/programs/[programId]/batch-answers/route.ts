import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { AssessmentInteraction, toIInteraction } from '@/types/assessment-types';

export async function POST(
  request: NextRequest,
  {}: { params: Promise<{ programId: string }> }
) {
  try {
    // Try to get user from authentication
    const session = await getUnifiedAuth(request);

    // If no auth, check if user info is in query params
    if (!session?.user?.email) {
      const { searchParams } = new URL(request.url);
      const emailParam = searchParams.get('userEmail');

      if (!emailParam) {
        return createUnauthorizedResponse();
      }
    }

    const body = await request.json();
    const { taskId, answers } = body;

    if (!taskId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const taskRepo = repositoryFactory.getTaskRepository();

    // Get task
    const task = await taskRepo.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Get questions from task to check correct answers
    interface QuestionType {
      id: string;
      correct_answer?: string;
      ksa_mapping?: Record<string, unknown>;
    }
    const questions = (task.content as { questions?: QuestionType[] })?.questions || [];

    // Prepare all interactions
    const assessmentInteractions: AssessmentInteraction[] = answers.map((answer: { questionId: string; answer: string; timeSpent?: number }) => {
      // Find the question to check the correct answer
      const question = questions.find((q) => q.id === answer.questionId);
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
          ksa_mapping: question?.ksa_mapping || undefined
        }
      };
    });

    // Convert to IInteraction for storage and merge with existing
    const existingInteractions = task.interactions || [];
    const newInteractions = assessmentInteractions.map(toIInteraction);
    const updatedInteractions = [...existingInteractions, ...newInteractions];

    await taskRepo.update?.(taskId, {
      interactions: updatedInteractions,
      interactionCount: updatedInteractions.length,
      metadata: {
        ...task.metadata,
        lastAnsweredAt: new Date().toISOString()
      }
    });

    // Update task status if needed
    if (task.status === 'pending') {
      await taskRepo.updateStatus?.(taskId, 'active');
    }

    return NextResponse.json({
      success: true,
      submitted: assessmentInteractions.length
    });
  } catch (error) {
    console.error('Error submitting batch answers:', error);
    return NextResponse.json(
      { error: 'Failed to submit answers' },
      { status: 500 }
    );
  }
}
