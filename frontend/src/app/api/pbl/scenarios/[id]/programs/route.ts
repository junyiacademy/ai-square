import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import type { Program } from '@/lib/repositories/interfaces';

// Add response caching
export const revalidate = 60; // Cache for 60 seconds

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scenarioId } = await params;
    
    // Check if it's a UUID or a YAML ID
    const isUUID = scenarioId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    let actualScenarioId = scenarioId;
    
    // If it's not a UUID, use index for fast lookup
    if (!isUUID) {
      const { scenarioIndexService } = await import('@/lib/services/scenario-index-service');
      const { scenarioIndexBuilder } = await import('@/lib/services/scenario-index-builder');
      
      // Ensure index exists
      await scenarioIndexBuilder.ensureIndex();
      
      // Look up UUID by YAML ID
      const uuid = await scenarioIndexService.getUuidByYamlId(scenarioId);
      
      if (!uuid) {
        return NextResponse.json(
          { success: false, error: 'Scenario not found' },
          { status: 404 }
        );
      }
      
      actualScenarioId = uuid;
    }
    
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get repositories
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const userRepo = repositoryFactory.getUserRepository();
    
    // Get user by email to get UUID
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get user's programs for this scenario
    const allPrograms = await programRepo.findByScenario(actualScenarioId);
    const programs = allPrograms.filter(p => p.userId === user.id);
    
    // Enrich programs with task completion data
    const enrichedPrograms = await Promise.all(
      (programs || []).map(async (program: Program) => {
        // Get tasks for this program
        const tasks = await taskRepo.findByProgram(program.id);
        
        // Auto-fix: Update task status if they have completedAt but wrong status
        const tasksNeedingFix = tasks.filter(task => 
          task.completedAt && task.status !== 'completed'
        );
        
        if (tasksNeedingFix.length > 0) {
          console.log(`Auto-fixing ${tasksNeedingFix.length} tasks with completedAt but wrong status`);
          // Update tasks in parallel
          await Promise.all(
            tasksNeedingFix.map(task => 
              taskRepo.update?.(task.id, {
                status: 'completed',
                completedAt: task.completedAt || new Date().toISOString()
              })
            )
          );
          // Refresh tasks after fix
          const updatedTasks = await taskRepo.findByProgram(program.id);
          tasks.splice(0, tasks.length, ...updatedTasks);
        }
        
        // Calculate completed tasks - based on status
        const completedTasks = tasks.filter(task => task.status === 'completed');
        const completedTaskCount = completedTasks.length;
        
        // Debug logging
        console.log(`Program ${program.id}:`, {
          status: program.status,
          totalTasks: tasks.length,
          tasksWithEvaluation: completedTaskCount,
          taskDetails: tasks.map(t => ({
            id: t.id,
            status: t.status,
            hasCompleted: t.status === 'completed'
          }))
        });
        
        return {
          ...program,
          completedTaskCount,
          totalTaskCount: program.totalTaskCount || 0
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