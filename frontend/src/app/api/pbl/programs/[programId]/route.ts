import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { programId: string } }
) {
  try {
    const programId = params.programId;
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');
    
    if (!scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Scenario ID is required' },
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
    
    // Get program metadata
    const program = await pblProgramService.getProgram(userEmail, scenarioId, programId);
    
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      program
    });
    
  } catch (error) {
    console.error('Error getting program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get program' },
      { status: 500 }
    );
  }
}