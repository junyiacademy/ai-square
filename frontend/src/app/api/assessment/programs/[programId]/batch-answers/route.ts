import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';

export async function POST(
  request: NextRequest,
  {}: { params: Promise<{ programId: string }> }
) {
  try {
    // Try to get user from authentication
    const session = await getServerSession();
    
    // If no auth, check if user info is in query params
    if (!session?.user?.email) {
      const { searchParams } = new URL(request.url);
      const emailParam = searchParams.get('userEmail');
      
      if (!emailParam) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
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
    const questions = (task.content as { questions?: Array<{ id: string; correct_answer?: string; ksa_mapping?: unknown }> })?.questions || [];
    
    // Prepare all interactions
    const interactions = answers.map((answer: { questionId: string; answer: string; timeSpent?: number }) => {
      // Find the question to check the correct answer
      const question = questions.find((q) => q.id === answer.questionId);
      const isCorrect = question && question.correct_answer !== undefined
        ? String(answer.answer) === String(question.correct_answer)
        : false;
      
      return {
        timestamp: new Date().toISOString(),
        type: 'system_event' as const,
        context: {
          eventType: 'assessment_answer',
          questionId: answer.questionId,
          selectedAnswer: answer.answer,
          isCorrect,
          timeSpent: answer.timeSpent || 0,
          ksa_mapping: question?.ksa_mapping || undefined
        }
      };
    });
    
    // Store interactions in task metadata
    await taskRepo.update(taskId, {
      metadata: {
        ...task.metadata,
        interactions
      }
    });
    
    // Update task status if needed
    if (task.status === 'pending') {
      await taskRepo.updateStatus(taskId, 'active');
    }
    
    return NextResponse.json({ 
      success: true,
      submitted: interactions.length
    });
  } catch (error) {
    console.error('Error submitting batch answers:', error);
    return NextResponse.json(
      { error: 'Failed to submit answers' },
      { status: 500 }
    );
  }
}