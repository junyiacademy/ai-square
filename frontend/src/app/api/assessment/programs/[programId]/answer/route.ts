import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';
import { hasQuestions, AssessmentQuestion, AssessmentAnswerContent } from '@/types/task-content';

export async function POST(
  request: NextRequest,
  _props: { params: Promise<{ programId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
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
    
    const taskRepo = repositoryFactory.getTaskRepository();
    
    // Get task with interactions
    const taskWithInteractions = await taskRepo.getTaskWithInteractions(taskId);
    if (!taskWithInteractions) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    const task = taskWithInteractions;
    
    // Get questions from task to check correct answer
    const questions: AssessmentQuestion[] = hasQuestions(task.content) 
      ? task.content.questions
      : [];
    const question = questions.find((q) => q.id === questionId);
    const isCorrect = question && question.correct_answer !== undefined
      ? String(answer) === String(question.correct_answer)
      : false;
    
    // Add interaction
    const answerContent: AssessmentAnswerContent = {
      eventType: 'assessment_answer',
      questionId,
      questionIndex,
      selectedAnswer: answer,
      isCorrect,
      timeSpent,
      ksa_mapping: question?.ksa_mapping
    };
    
    // Record the answer as an attempt
    await taskRepo.recordAttempt(taskId, {
      response: answerContent as unknown as Record<string, unknown>,
      score: isCorrect ? 1 : 0,
      timeSpent: timeSpent || 0
    });
    
    // Update task status if first answer
    const answers = task.interactions.filter(i => 
      i.type === 'system_event' && 
      i.content && 
      typeof i.content === 'object' && 
      'eventType' in i.content && 
      (i.content as Record<string, unknown>).eventType === 'assessment_answer'
    );
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