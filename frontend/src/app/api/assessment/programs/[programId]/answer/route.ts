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
    
    // For assessment tasks, the question ID is usually the task ID itself
    // The correct answer would be stored in task metadata or content
    const isCorrect = false; // Assessment tasks don't have predefined correct answers
    
    // Add interaction
    await taskRepo.addInteraction(taskId, {
      timestamp: new Date().toISOString(),
      type: 'user_input',
      content: {
        questionId,
        questionIndex,
        selectedAnswer: answer,
        isCorrect,
        timeSpent
      }
    });
    
    // Update task status if first answer
    const answers = task.interactions.filter(i => i.type === 'user_input');
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