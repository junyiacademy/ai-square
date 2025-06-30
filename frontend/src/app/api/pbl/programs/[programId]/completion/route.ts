import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const { programId } = await params;
    const scenarioId = searchParams.get('scenarioId');
    
    if (!scenarioId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scenario ID is required'
        },
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
        {
          success: false,
          error: 'User authentication required'
        },
        { status: 401 }
      );
    }
    
    // Get program summary from storage service
    const summary = await pblProgramService.getProgramSummary(
      userEmail,
      scenarioId,
      programId
    );
    
    if (!summary) {
      return NextResponse.json(
        {
          success: false,
          error: 'Program summary not found'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      summary
    });
    
  } catch (error) {
    console.error('Get program summary error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get program summary'
      },
      { status: 500 }
    );
  }
}