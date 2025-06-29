import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');
    const lang = searchParams.get('lang') || 'en';
    
    if (!scenarioId) {
      return NextResponse.json(
        { success: false, error: 'scenarioId is required' },
        { status: 400 }
      );
    }
    
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
    
    // Get all programs for this user and scenario
    const programs = await pblProgramService.getUserProgramsForScenario(userEmail, scenarioId);
    
    // Sort by startedAt descending (newest first)
    programs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    
    // The metadata already contains all necessary info, no need to fetch summaries
    const programsWithInfo = programs.map(program => ({
      ...program,
      taskCount: program.totalTasks,
      completedTaskCount: program.completedTasks,
      lastActivity: program.updatedAt
    }));
    
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