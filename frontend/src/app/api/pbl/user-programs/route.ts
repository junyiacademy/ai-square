import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';
import { cachedGET, getPaginationParams, createPaginatedResponse } from '@/lib/api/optimization-utils';

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get('scenarioId');
  const paginationParams = getPaginationParams(request);

  return cachedGET(request, async () => {
    // Get programs for this user
    const programs = await pblProgramService.getUserPrograms(userEmail!, scenarioId || undefined);
    
    // Map ProgramSummary data to expected format
    const programsWithInfo = programs.map(summary => {
      // Calculate evaluated tasks based on completion rate if tasks array is empty
      const evaluatedTasks = summary.tasks.length > 0 
        ? summary.tasks.filter(task => task.progress.completedAt).length
        : Math.floor((summary.completionRate / 100) * summary.program.totalTasks);
      
      return {
        id: summary.program.id,  // Use id property from Program interface
        programId: summary.program.id,
        scenarioId: summary.program.scenarioId,
        scenarioTitle: summary.program.scenarioTitle || summary.program.scenarioId,
        status: summary.program.status,
        startedAt: summary.program.startedAt,
        updatedAt: summary.program.updatedAt,
        totalTasks: summary.program.totalTasks,
        evaluatedTasks: evaluatedTasks,
        overallScore: summary.overallScore,
        taskCount: summary.program.totalTasks,
        lastActivity: summary.program.updatedAt,
        // Add the progress field that the frontend expects
        progress: {
          completedTasks: evaluatedTasks,
          totalTasks: summary.program.totalTasks
        }
      };
    });
    
    // Sort by startedAt descending (newest first)
    programsWithInfo.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    // Apply pagination
    const paginatedResponse = createPaginatedResponse(
      programsWithInfo,
      programsWithInfo.length,
      paginationParams
    );
    
    return {
      success: true,
      ...paginatedResponse
    };
  }, {
    ttl: 120, // 2 minutes cache (user-specific data)
    staleWhileRevalidate: 600 // 10 minutes
  });
}