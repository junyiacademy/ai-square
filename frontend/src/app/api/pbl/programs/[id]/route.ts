import { NextRequest, NextResponse } from 'next/server';
import { ensureServices } from '@/lib/core/services/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    
    // Get services (will initialize if needed)
    const services = await ensureServices();

    // Get program metadata using new architecture
    // Note: Need to find the trackId first, or this might need to be redesigned
    // For now, let's assume the programId is unique enough to get the program
    const program = await services.programService.getProgram(userEmail, id);
    
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