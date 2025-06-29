import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';
import { GetProgramHistoryResponse } from '@/types/pbl';

export async function GET(request: NextRequest) {
  try {
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
        {
          success: false,
          error: 'User authentication required'
        },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId') || undefined;
    const language = searchParams.get('lang') || 'en';
    
    console.log(`Fetching PBL history for user: ${userEmail}, scenario: ${scenarioId || 'all'}`);
    
    // Get all programs for the user
    const programs = await pblProgramService.getUserPrograms(userEmail, scenarioId);
    
    console.log(`Found ${programs.length} programs for user ${userEmail}`);
    
    // Transform to API response format
    const response: GetProgramHistoryResponse = {
      success: true,
      programs: programs,
      totalPrograms: programs.length
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('History API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch learning history'
      },
      { status: 500 }
    );
  }
}