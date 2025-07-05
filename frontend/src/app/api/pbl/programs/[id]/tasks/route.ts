import { NextRequest, NextResponse } from 'next/server';
import { ensureServices } from '@/lib/core/services/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = await params;
    
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
    
    // Use new architecture
    const services = await ensureServices();
    
    // Get program to verify it exists and belongs to user
    const program = await services.programService.getProgram(userEmail, programId);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Get all tasks for this program
    const tasks = await services.taskService.queryTasks({
      programId: program.id,
      userId: userEmail
    });
    
    // Sort tasks by order
    tasks.sort((a, b) => a.order - b.order);
    
    return NextResponse.json({
      success: true,
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        order: task.order,
        status: task.status,
        progress: task.progress,
        config: task.config
      })),
      firstTaskId: tasks[0]?.id || null,
      currentTaskId: program.progress?.currentTaskId || tasks[0]?.id || null
    });
    
  } catch (error) {
    console.error('Error getting program tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get program tasks' },
      { status: 500 }
    );
  }
}