import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function GET(
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

    // Get repositories
    const userRepo = repositoryFactory.getUserRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();

    // Get user by email
    const user = await userRepo.findByEmail(userEmail);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get program
    const program = await programRepo.findById(programId);

    if (!program || program.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }

    // Get tasks for the program
    const tasks = await taskRepo.findByProgram(programId);

    // Sort tasks by index
    tasks.sort((a, b) => a.taskIndex - b.taskIndex);

    return NextResponse.json({
      success: true,
      program: {
        id: program.id,
        scenarioId: program.scenarioId,
        userEmail: userEmail,
        status: program.status,
        currentTaskIndex: program.currentTaskIndex,
        completedTasks: program.completedTaskCount,
        totalTasks: program.totalTaskCount,
        totalScore: program.totalScore,
        ksaScores: program.domainScores,
        startedAt: program.startedAt || program.createdAt,
        updatedAt: program.lastActivityAt,
        completedAt: program.completedAt,
        taskIds: tasks.map(t => t.id),
        metadata: program.metadata
      }
    });

  } catch (error) {
    console.error('Error getting program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get program' },
      { status: 500 }
    );
  }
}
