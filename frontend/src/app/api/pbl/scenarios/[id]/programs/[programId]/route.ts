import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> }
) {
  try {
    const { id: scenarioId, programId } = await params;
    
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Use unified architecture to get program
    const { getProgramRepository } = await import('@/lib/implementations/gcs-v2');
    const programRepo = getProgramRepository();
    const program = await programRepo.findById(programId);
    
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Verify the program belongs to the user
    if (program.userId !== session.user.email) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(program);
    
  } catch (error) {
    console.error('Error fetching program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch program' },
      { status: 500 }
    );
  }
}