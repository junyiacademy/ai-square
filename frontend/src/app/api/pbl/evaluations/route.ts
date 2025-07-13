import { NextRequest, NextResponse } from 'next/server';
import { getEvaluationRepository } from '@/lib/implementations/gcs-v2';

export async function GET(request: NextRequest) {
  try {
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
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId');
    const taskId = searchParams.get('taskId');
    const targetType = searchParams.get('targetType');

    const evaluationRepo = getEvaluationRepository();
    
    let evaluations;
    
    if (taskId && targetType === 'task') {
      // Get evaluations for a specific task
      evaluations = await evaluationRepo.findByTarget('task', taskId);
    } else if (programId && targetType === 'program') {
      // Get program-level evaluations
      evaluations = await evaluationRepo.findByTarget('program', programId);
    } else if (programId && targetType === 'task') {
      // Get all task evaluations for a program
      const allEvaluations = await evaluationRepo.findByProgram(programId);
      evaluations = allEvaluations.filter(e => e.targetType === 'task');
    } else if (programId) {
      // Get all evaluations for a program
      evaluations = await evaluationRepo.findByProgram(programId);
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: evaluations
    });

  } catch (error) {
    console.error('Error getting evaluations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get evaluations' },
      { status: 500 }
    );
  }
}