import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { programId: string } }
) {
  try {
    const programId = params.programId;
    
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
    
    // Get request body
    const body = await request.json();
    const { scenarioId } = body;
    
    if (!scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Scenario ID is required' },
        { status: 400 }
      );
    }
    
    // Update program timestamps (reuse logic for draft programs)
    const updatedProgram = await pblProgramService.updateProgram(
      userEmail,
      scenarioId,
      programId,
      {
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    
    if (!updatedProgram) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      program: updatedProgram
    });
    
  } catch (error) {
    console.error('Error updating program timestamps:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update timestamps' },
      { status: 500 }
    );
  }
}