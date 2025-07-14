import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

// Add response caching
export const revalidate = 60; // Cache for 60 seconds

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scenarioId } = await params;
    
    // Only accept UUID format for scenario ID
    if (!scenarioId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scenario ID format. UUID required.' },
        { status: 400 }
      );
    }
    
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userEmail = session.user.email;
    
    // Get repositories
    const { getProgramRepository, getTaskRepository } = await import('@/lib/implementations/gcs-v2');
    const programRepo = getProgramRepository();
    const taskRepo = getTaskRepository();
    
    // Get user's programs for this scenario
    const programs = await programRepo.findByScenarioAndUser(scenarioId, userEmail);
    
    // Enrich programs with task completion data
    const enrichedPrograms = await Promise.all(
      (programs || []).map(async (program) => {
        // Get tasks for this program
        const tasks = await taskRepo.findByProgram(program.id);
        
        // Auto-fix: Update task status if they have evaluationId but wrong status
        const tasksNeedingFix = tasks.filter(task => 
          task.evaluationId && task.status !== 'completed'
        );
        
        if (tasksNeedingFix.length > 0) {
          console.log(`Auto-fixing ${tasksNeedingFix.length} tasks with evaluationId but wrong status`);
          // Update tasks in parallel
          await Promise.all(
            tasksNeedingFix.map(task => 
              taskRepo.update(task.id, {
                status: 'completed',
                completedAt: task.completedAt || new Date().toISOString()
              })
            )
          );
          // Refresh tasks after fix
          const updatedTasks = await taskRepo.findByProgram(program.id);
          tasks.splice(0, tasks.length, ...updatedTasks);
        }
        
        // Calculate completed tasks - based on evaluationId
        const tasksWithEvaluation = tasks.filter(task => task.evaluationId);
        const completedTaskCount = tasksWithEvaluation.length;
        
        // Debug logging
        console.log(`Program ${program.id}:`, {
          status: program.status,
          totalTasks: tasks.length,
          tasksWithEvaluation: completedTaskCount,
          taskDetails: tasks.map(t => ({
            id: t.id,
            status: t.status,
            hasEvaluationId: !!t.evaluationId
          }))
        });
        
        return {
          ...program,
          completedTaskCount,
          totalTaskCount: program.taskIds?.length || 0
        };
      })
    );
    
    return NextResponse.json(enrichedPrograms, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      }
    });
    
  } catch (error) {
    console.error('Error fetching user programs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch programs' },
      { status: 500 }
    );
  }
}