import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> }
) {
  try {
    const { id: scenarioId, programId } = await params;
    
    // Only accept UUID format for both scenario and program IDs
    if (!scenarioId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scenario ID format. UUID required.' },
        { status: 400 }
      );
    }
    
    if (!programId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid program ID format. UUID required.' },
        { status: 400 }
      );
    }
    
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Use unified architecture to get program
    const { createRepositoryFactory } = await import('@/lib/db/repositories/factory');
    const repositoryFactory = createRepositoryFactory;
    const programRepo = repositoryFactory.getProgramRepository();
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