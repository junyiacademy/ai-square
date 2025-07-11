import { NextRequest, NextResponse } from 'next/server';
import { getTaskRepository } from '@/lib/implementations/gcs-v2';
import { getAuthFromRequest } from '@/lib/auth/auth-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { taskId, questionId, answer, questionIndex, timeSpent } = body;
    
    if (!taskId || !questionId || !answer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const taskRepo = getTaskRepository();
    
    // Get task
    const task = await taskRepo.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Get questions from task to check correct answer
    const questions = task.content?.context?.questions || task.content?.questions || [];
    const question = questions.find((q: any) => q.id === questionId);
    const isCorrect = question && question.correct_answer !== undefined
      ? String(answer) === String(question.correct_answer)
      : false;
    
    // Add interaction
    await taskRepo.addInteraction(taskId, {
      timestamp: new Date().toISOString(),
      type: 'assessment_answer',
      content: {
        questionId,
        questionIndex,
        selectedAnswer: answer,
        isCorrect,
        timeSpent,
        ksa_mapping: question?.ksa_mapping || undefined
      }
    });
    
    // Update task status if first answer
    const answers = task.interactions.filter(i => i.type === 'assessment_answer');
    if (answers.length === 0) {
      await taskRepo.updateStatus(taskId, 'active');
    }
    
    return NextResponse.json({ 
      success: true,
      isCorrect
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}