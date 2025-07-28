import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    // Get authentication
    const session = await getServerSession();
    
    let userEmail: string | null = null;
    
    if (session?.user?.email) {
      userEmail = session.user.email;
    } else {
      // Check for user info from query params (for viewing history)
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
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Verify ownership
    const userId = session.user.id;
    if (program.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Get scenario info
    const scenario = await scenarioRepo.findById(program.scenarioId);
    
    // Get all tasks for the program
    const tasks = await taskRepo.findByProgram(programId);
    
    console.log('Debug: Discovery program loaded', {
      programId,
      scenarioId: program.scenarioId,
      scenarioTitle: scenario?.title,
      tasksCount: tasks?.length || 0,
      programStatus: program.status,
      metadata: program.metadata
    });
    
    // Calculate some basic stats
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const totalXP = completedTasks.reduce((sum, task) => {
      return sum + ((task.metadata?.xpEarned as number) || 0);
    }, 0);
    
    const currentTaskIndex = program.currentTaskIndex || 0;
    const currentTask = tasks[currentTaskIndex] || tasks[0];
    
    return NextResponse.json({
      program,
      scenario: scenario ? {
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        careerType: scenario.metadata?.careerType || 'general'
      } : null,
      currentTask,
      currentTaskIndex,
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        taskType: t.metadata?.taskType || 'question',
        xpEarned: t.metadata?.xpEarned || 0,
        score: t.metadata?.score || 0
      })),
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      totalXP,
      careerType: program.metadata?.careerType || scenario?.metadata?.careerType || 'general'
    });
  } catch (error) {
    console.error('Error getting Discovery program:', error);
    return NextResponse.json(
      { error: 'Failed to load program' },
      { status: 500 }
    );
  }
}