import { NextRequest, NextResponse } from 'next/server';
import { getTaskRepository } from '@/lib/implementations/gcs-v2';
import { getAuthFromRequest } from '@/lib/auth/auth-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    // Try to get user from authentication
    const user = await getAuthFromRequest(request);
    
    // If no auth, check if user info is in query params
    let userEmail: string | null = null;
    
    if (user) {
      userEmail = user.email;
    } else {
      const { searchParams } = new URL(request.url);
      const emailParam = searchParams.get('userEmail');
      
      if (emailParam) {
        userEmail = emailParam;
      } else {
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
    
    const taskRepo = getTaskRepository();
    
    // Get task
    const task = await taskRepo.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Prepare all interactions
    const interactions = answers.map((answer: any) => {
      const question = task.content.questions?.find((q: any) => q.id === answer.questionId);
      const isCorrect = question ? question.correct_answer === answer.answer : false;
      
      return {
        timestamp: new Date().toISOString(),
        type: 'assessment_answer',
        content: {
          questionId: answer.questionId,
          selectedAnswer: answer.answer,
          correctAnswer: question?.correct_answer,
          isCorrect,
          timeSpent: answer.timeSpent || 0,
          domain: question?.domain,
          ksa_mapping: question?.ksa_mapping
        }
      };
    });
    
    // Batch update interactions
    await taskRepo.updateInteractions(taskId, interactions);
    
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