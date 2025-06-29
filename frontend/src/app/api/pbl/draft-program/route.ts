import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';

export async function GET(request: NextRequest) {
  try {
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
    
    // Find existing draft program
    const draftProgram = await pblProgramService.findUserDraftProgram(userEmail, scenarioId);
    
    if (draftProgram) {
      return NextResponse.json({
        success: true,
        program: draftProgram
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'No draft program found'
      });
    }
    
  } catch (error) {
    console.error('Error checking draft program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check draft program' },
      { status: 500 }
    );
  }
}