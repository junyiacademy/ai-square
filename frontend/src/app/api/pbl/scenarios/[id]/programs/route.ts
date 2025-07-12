import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scenarioId } = await params;
    
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userEmail = session.user.email;
    
    // Get user's programs for this scenario
    const { getProgramRepository } = await import('@/lib/implementations/gcs-v2');
    const programRepo = getProgramRepository();
    const programs = await programRepo.findByScenarioAndUser(scenarioId, userEmail);
    
    return NextResponse.json(programs || []);
    
  } catch (error) {
    console.error('Error fetching user programs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch programs' },
      { status: 500 }
    );
  }
}