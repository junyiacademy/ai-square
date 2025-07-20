import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { ITask } from '@/types/unified-learning';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> }
) {
  try {
    // Set no-cache headers
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: scenarioId, programId } = await params;
    const userEmail = session.user.email;
    
    // Get repositories
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
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
      .filter(Boolean) as unknown as ITask[];
    
    // Debug logging
    console.log('Program task order:', {
      programId: program.id,
      taskIds: program.taskIds,
      orderedTaskTitles: tasks.map(t => ({ id: t.id, title: t.title, status: t.status, index: t.scenarioTaskIndex }))
    });
    
    // Calculate completed tasks and total XP
    let completedCount = 0;
    let totalXP = 0;
    
    const tasksSummary = tasks.map((task, index) => {
      const xp = (task.content as Record<string, unknown>)?.xp as number || 0;
      
      // Calculate statistics from interactions
      let actualXP = 0;
      let attempts = 0;
      let passCount = 0;
      
      if (task.interactions && task.interactions.length > 0) {
        // Count user attempts
        attempts = task.interactions.filter(i => i.type === 'user_input').length;
        
        // Count successful attempts and find highest XP
        const aiResponses = task.interactions.filter(i => i.type === 'ai_response');
        aiResponses.forEach(response => {
          const responseContent = response.content as { completed?: boolean; xpEarned?: number };
          if (responseContent?.completed === true) {
            passCount++;
            if (responseContent?.xpEarned) {
              actualXP = Math.max(actualXP, responseContent.xpEarned);
            }
          }
        });
        
        // If task is completed but actualXP is 0, use the evaluation score or default XP
        if (task.status === 'completed' && actualXP === 0) {
          actualXP = xp; // Use default XP since evaluation is not directly on task
        }
      }
      
      if (task.status === 'completed') {
        completedCount++;
        totalXP += actualXP || xp; // Use actual XP if available, otherwise default
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
        description: (task.content as Record<string, unknown>)?.description as string || '',
        xp: xp,
        status: displayStatus,
        completedAt: task.completedAt,
        // Add real statistics
        actualXP: task.status === 'completed' ? actualXP : undefined,
        attempts: attempts > 0 ? attempts : undefined,
        passCount: passCount > 0 ? passCount : undefined
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
      createdAt: program.createdAt,
      completedAt: program.endTime,
      currentTaskIndex: program.currentTaskIndex,
      taskIds: program.taskIds,
      tasks: tasksSummary,
      totalTasks: tasks.length,
      completedTasks: completedCount,
      totalXP: totalXP,
      metadata: program.metadata,
      // Add career info from scenario
      careerType: scenario?.sourceRef && (scenario.sourceRef as unknown as { metadata?: { careerType?: string } }).metadata?.careerType || 'unknown',
      scenarioTitle: scenario?.title || 'Discovery Scenario'
    };
    
    return NextResponse.json(responseData, { headers });
  } catch (error) {
    console.error('Error in GET /api/discovery/scenarios/[id]/programs/[programId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}