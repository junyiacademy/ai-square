import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;
    
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
    
    // Get request body
    const body = await request.json();
    const { scenarioId, taskId, taskTitle } = body;
    
    if (!scenarioId || !taskId || !taskTitle) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Update program status from draft to in_progress
    const updatedProgram = await pblProgramService.updateProgram(
      userEmail,
      scenarioId,
      programId,
      {
        status: 'in_progress',
        updatedAt: new Date().toISOString(),
        currentTaskId: taskId
      }
    );
    
    if (!updatedProgram) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Initialize the first task if not already initialized
    try {
      await pblProgramService.initializeTask(
        userEmail,
        scenarioId,
        programId,
        taskId,
        taskTitle
      );
    } catch (error) {
      // Task might already exist, that's ok
      console.log('Task already initialized or error:', error);
    }
    
    return NextResponse.json({
      success: true,
      program: updatedProgram
    });
    
  } catch (error) {
    console.error('Error activating program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to activate program' },
      { status: 500 }
    );
  }
}