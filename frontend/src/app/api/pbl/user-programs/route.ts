import { NextRequest, NextResponse } from 'next/server';
import { ensureServices } from '@/lib/core/services/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');
    // const lang = searchParams.get('lang') || 'en';
    
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
    
    // Get services (will initialize if needed)
    const services = await ensureServices();

    // Get all tracks for this user
    const tracks = await services.trackService.queryTracks({ userId: userEmail });
    
    // Filter PBL tracks and match scenarioId if provided
    const pblTracks = tracks.filter(track => {
      if (track.type !== 'PBL') return false;
      if (scenarioId && track.context?.scenarioId !== scenarioId) return false;
      return true;
    });

    // Convert tracks to the expected format
    const programsWithInfo = await Promise.all(pblTracks.map(async track => {
      // Get programs for this track
      const programs = await services.programService.queryPrograms({ 
        userId: userEmail, 
        trackId: track.trackId 
      });
      const program = programs[0]; // Assuming one program per track for PBL
      
      if (!program) {
        return {
          id: track.trackId,
          programId: track.trackId,
          scenarioId: track.context?.scenarioId || '',
          scenarioTitle: track.metadata?.title || track.context?.scenarioId || '',
          status: track.status === 'ACTIVE' ? 'in_progress' : track.status === 'COMPLETED' ? 'completed' : 'draft',
          startedAt: track.createdAt,
          updatedAt: track.updatedAt,
          totalTasks: 0,
          evaluatedTasks: 0,
          overallScore: 0,
          taskCount: 0,
          lastActivity: track.updatedAt,
          progress: {
            completedTasks: 0,
            totalTasks: 0
          }
        };
      }

      // Get tasks for this program
      const tasks = await services.taskService.queryTasks({ 
        userId: userEmail, 
        programId: program.programId 
      });
      const evaluatedTasks = tasks.filter(task => task.progress?.completed).length;
      const overallScore = tasks.reduce((sum, task) => sum + (task.progress?.score || 0), 0) / (tasks.length || 1);

      return {
        id: program.programId,
        programId: program.programId,
        scenarioId: program.metadata?.scenarioId || track.context?.scenarioId || '',
        scenarioTitle: program.metadata?.title || track.metadata?.title || '',
        status: program.status === 'ACTIVE' ? 'in_progress' : program.status === 'COMPLETED' ? 'completed' : 'draft',
        startedAt: program.createdAt,
        updatedAt: program.updatedAt,
        totalTasks: tasks.length,
        evaluatedTasks: evaluatedTasks,
        overallScore: Math.round(overallScore),
        taskCount: tasks.length,
        lastActivity: program.updatedAt,
        progress: {
          completedTasks: evaluatedTasks,
          totalTasks: tasks.length
        }
      };
    }));
    
    // Sort by startedAt descending (newest first)
    programsWithInfo.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    
    return NextResponse.json({
      success: true,
      programs: programsWithInfo,
      total: programsWithInfo.length
    });
    
  } catch (error) {
    console.error('Error fetching user programs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch user programs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}