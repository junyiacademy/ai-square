import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { 
  getProgramRepository,
  getTaskRepository,
  getScenarioRepository 
} from '@/lib/implementations/gcs-v2';
import { ITask } from '@/types/unified-learning';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: scenarioId, programId } = await params;
    const userEmail = session.user.email;
    
    // Get repositories
    const programRepo = getProgramRepository();
    const taskRepo = getTaskRepository();
    const scenarioRepo = getScenarioRepository();
    
    // Load program from repository
    const program = await programRepo.findById(programId);
    
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }
    
    // Verify this program belongs to the current user and scenario
    if (program.userId !== userEmail || program.scenarioId !== scenarioId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Load all tasks for this program
    const allTasks = await taskRepo.findByProgram(programId);
    const taskMap = new Map(allTasks.map(t => [t.id, t]));
    
    // Get tasks in the correct order based on program.taskIds
    const tasks = program.taskIds
      .map(id => taskMap.get(id))
      .filter(Boolean) as ITask[];
    
    // Calculate completed tasks and total XP
    let completedCount = 0;
    let totalXP = 0;
    
    const tasksSummary = tasks.map((task, index) => {
      const xp = (task.content.context as any)?.xp || 0;
      
      if (task.status === 'completed') {
        completedCount++;
        totalXP += xp;
      }
      
      // Determine display status for UI
      let displayStatus: string = task.status;
      if (task.status === 'pending' && index === completedCount) {
        displayStatus = 'available'; // Next task after completed ones
      } else if (task.status === 'pending' && index > completedCount) {
        displayStatus = 'locked'; // Future tasks
      }
      
      return {
        id: task.id,
        title: task.title,
        description: task.content.context?.description || '',
        xp: xp,
        status: displayStatus,
        completedAt: task.completedAt
      };
    });
    
    // Update program metadata if needed
    if (program.metadata?.totalXP !== totalXP) {
      await programRepo.update(programId, {
        metadata: {
          ...program.metadata,
          totalXP: totalXP
        }
      });
    }
    
    // Load scenario info for career details
    const scenario = await scenarioRepo.findById(scenarioId);
    
    // Return data in format expected by frontend
    const responseData = {
      id: program.id,
      scenarioId: program.scenarioId,
      userId: program.userId,
      status: program.status,
      createdAt: program.startedAt,
      completedAt: program.completedAt,
      currentTaskIndex: program.currentTaskIndex,
      taskIds: program.taskIds,
      tasks: tasksSummary,
      totalTasks: tasks.length,
      completedTasks: completedCount,
      totalXP: totalXP,
      metadata: program.metadata,
      // Add career info from scenario
      careerType: scenario?.sourceRef.metadata?.careerType || 'unknown',
      scenarioTitle: scenario?.title || 'Discovery Scenario'
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in GET /api/discovery/scenarios/[id]/programs/[programId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}