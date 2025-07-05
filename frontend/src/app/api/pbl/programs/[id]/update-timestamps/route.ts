import { NextRequest, NextResponse } from 'next/server';
import { ensureServices } from '@/lib/core/services/api-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
    const { scenarioId } = body;
    
    if (!scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Scenario ID is required' },
        { status: 400 }
      );
    }
    
    // Use new architecture
    const services = await ensureServices();
    
    // Get the program to check if it exists
    const program = await services.programService.getProgram(userEmail, id);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Update program timestamps
    const updatedProgram = await services.programService.updateProgram(
      userEmail,
      id,
      {
        startedAt: program.startedAt || new Date(),
        progress: {
          ...program.progress,
          lastActivityAt: new Date()
        }
      }
    );
    
    if (!updatedProgram) {
      return NextResponse.json(
        { success: false, error: 'Failed to update program' },
        { status: 500 }
      );
    }
    
    // Log the timestamp update
    await services.logService.logSystemEvent(
      userEmail,
      id,
      undefined,
      'timestamps-updated',
      { 
        startedAt: updatedProgram.startedAt?.toISOString(),
        updatedAt: updatedProgram.updatedAt.toISOString()
      }
    );
    
    // Return in the expected format
    return NextResponse.json({
      success: true,
      program: {
        id: updatedProgram.id,
        scenarioId: updatedProgram.config?.scenarioId || scenarioId,
        status: updatedProgram.status,
        startedAt: updatedProgram.startedAt?.toISOString(),
        updatedAt: updatedProgram.updatedAt.toISOString(),
        totalTasks: updatedProgram.progress.totalTasks,
        completedTasks: updatedProgram.progress.completedTasks
      }
    });
    
  } catch (error) {
    console.error('Error updating program timestamps:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update timestamps' },
      { status: 500 }
    );
  }
}