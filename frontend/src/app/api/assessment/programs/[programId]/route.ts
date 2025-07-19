import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    // Try to get user from authentication
    const session = await getServerSession();
    
    // If no auth, check if user info is in query params (for viewing history)
    let userEmail: string | null = null;
    
    if (session?.user?.email) {
      userEmail = session.user.email;
    } else {
      // Check for user info from query params
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
    
    // Await params before using
    const { programId } = await params;
    
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Verify ownership
    if (program.userId !== userEmail) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Check if we should include all tasks (for complete page)
    const { searchParams } = new URL(request.url);
    const includeAllTasks = searchParams.get('includeAllTasks') === 'true';
    
    // Get all tasks for the program
    const tasks = await taskRepo.findByProgram(programId);
    
    console.log('Debug: Tasks loaded for program', programId, {
      tasksCount: tasks?.length || 0,
      programTaskIds: program.taskIds || [],
      includeAllTasks,
      tasks: tasks?.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        hasContent: !!t.content,
        hasQuestions: !!((t.context?.context as any)?.questions?.length)
      })) || []
    });
    
    if (!tasks || tasks.length === 0) {
      console.error('No tasks found for program', programId, {
        programData: program
      });
      return NextResponse.json(
        { error: 'No tasks found' },
        { status: 404 }
      );
    }
    
    // Find the current task based on currentTaskIndex
    const currentTaskIndex = program.currentTaskIndex || 0;
    const currentTask = tasks[currentTaskIndex] || tasks[0];
    
    // For backward compatibility, if there's only one task, return it as before
    if (tasks.length === 1) {
      return NextResponse.json({
        program,
        currentTask,
        totalTasks: tasks.length
      });
    }
    
    // If includeAllTasks is true, return full task data
    if (includeAllTasks) {
      return NextResponse.json({
        program,
        currentTask,
        currentTaskIndex,
        allTasks: tasks, // Return full task objects with all content
        tasks: tasks.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          questionsCount: (t.context?.context as any)?.questions?.length || 0
        })),
        totalTasks: tasks.length
      });
    }
    
    // For multiple tasks, return more information
    return NextResponse.json({
      program,
      currentTask,
      currentTaskIndex,
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        questionsCount: (t.context?.context as any)?.questions?.length || 0
      })),
      totalTasks: tasks.length
    });
  } catch (error) {
    console.error('Error getting program:', error);
    return NextResponse.json(
      { error: 'Failed to load program' },
      { status: 500 }
    );
  }
}