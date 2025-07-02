import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';

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
    
    // Get programs for this user
    // If scenarioId is provided, get programs for that scenario only
    // If not provided, get all programs for all scenarios
    const programs = await pblProgramService.getUserPrograms(userEmail, scenarioId || undefined);
    
    // Map ProgramSummary data to expected format
    const programsWithInfo = programs.map(summary => ({
      id: summary.program.programId,  // Map programId to id
      programId: summary.program.programId,
      scenarioId: summary.program.scenarioId,
      scenarioTitle: summary.program.scenarioTitle || summary.program.scenarioId,
      status: summary.program.status,
      startedAt: summary.program.startedAt,
      updatedAt: summary.program.updatedAt,
      totalTasks: summary.tasks.length,
      evaluatedTasks: summary.tasks.filter(task => task.progress.isCompleted).length,
      overallScore: summary.overallScore,
      taskCount: summary.tasks.length,
      lastActivity: summary.program.updatedAt,
      // Add the progress field that the frontend expects
      progress: {
        completedTasks: summary.tasks.filter(task => task.progress.isCompleted).length,
        totalTasks: summary.tasks.length
      }
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