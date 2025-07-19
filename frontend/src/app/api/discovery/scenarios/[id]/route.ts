import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { 
  getScenarioRepository,
  getProgramRepository 
} from '@/lib/implementations/gcs-v2';
import { IScenario } from '@/types/unified-learning';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check session token from header first
    const sessionToken = request.headers.get('x-session-token');
    
    const session = await getServerSession();
    if (!session?.user?.email) {
      console.log('No session found, token:', sessionToken ? 'present' : 'missing');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: scenarioId } = await params;
    const userEmail = session.user.email;
    
    // Get repositories
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    
    // Check if scenario exists
    const scenario = await scenarioRepo.findById(scenarioId);
    
    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }
    
    // Note: In v2 architecture, scenario metadata is stored in the scenario itself,
    // not in user-specific mapping files
    
    // Load programs for this scenario and user
    const userPrograms = await programRepo.findByScenarioAndUser(scenarioId, userEmail);
    
    // Calculate progress for each program
    const programsWithProgress = await Promise.all(
      userPrograms.map(async (program) => {
        const taskCount = program.taskIds.length;
        const completedCount = program.status === 'completed' 
          ? taskCount 
          : program.currentTaskIndex;
        
        const progress = taskCount > 0 
          ? Math.round((completedCount / taskCount) * 100)
          : 0;
        
        return {
          id: program.id,
          scenarioId: program.scenarioId,
          userId: program.userId,
          status: program.status,
          createdAt: program.startedAt,
          lastActiveAt: program.completedAt || program.startedAt,
          currentTaskIndex: program.currentTaskIndex,
          totalTasks: taskCount,
          completedTasks: completedCount,
          progress,
          totalXP: program.metadata?.totalXP || 0,
          metadata: program.metadata
        };
      })
    );
    
    // Sort programs by most recent first
    programsWithProgress.sort((a, b) => 
      new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
    );
    
    // Return scenario data with programs for backward compatibility
    return NextResponse.json({
      id: scenario.id,
      sourceType: scenario.sourceType,
      sourceRef: scenario.sourceRef,
      title: scenario.title,
      description: scenario.description,
      careerType: scenario.sourceRef.metadata?.careerType || 'unknown',
      objectives: scenario.objectives,
      metadata: scenario.metadata, // Include all YAML data stored in metadata
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt,
      programs: programsWithProgress
    });
  } catch (error) {
    console.error('Error in GET /api/discovery/scenarios/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}