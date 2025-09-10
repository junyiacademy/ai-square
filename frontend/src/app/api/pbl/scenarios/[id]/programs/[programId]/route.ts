import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';

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
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }
    
    // Use unified architecture to get program and user
    const { createRepositoryFactory } = await import('@/lib/db/repositories/factory');
    const repositoryFactory = createRepositoryFactory;
    const programRepo = repositoryFactory.getProgramRepository();
    const userRepo = repositoryFactory.getUserRepository();
    
    // Get user by email to get UUID
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    const program = await programRepo.findById(programId);
    
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Verify the program belongs to the user (compare UUIDs)
    if (program.userId !== user.id) {
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