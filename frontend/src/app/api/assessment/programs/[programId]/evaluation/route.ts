import { NextRequest, NextResponse } from 'next/server';
import { 
  getProgramRepository,
  getEvaluationRepository 
} from '@/lib/implementations/gcs-v2';
import { getAuthFromRequest } from '@/lib/auth/auth-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    // Try to get user from authentication
    const user = await getAuthFromRequest(request);
    
    // If no auth, check if user info is in query params (for viewing history)
    let userEmail: string | null = null;
    
    if (user) {
      userEmail = user.email;
    } else {
      // Check for user info from query params
      const { searchParams } = new URL(request.url);
      const emailParam = searchParams.get('userEmail');
      
      if (emailParam) {
        userEmail = emailParam;
      } else {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }
    
    // Await params before using
    const { programId } = await params;
    
    const programRepo = getProgramRepository();
    const evaluationRepo = getEvaluationRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== userEmail) {
      return NextResponse.json(
        { error: 'Program not found or access denied' },
        { status: 404 }
      );
    }
    
    // Get evaluation for this program
    const evaluations = await evaluationRepo.findByTarget('program', programId);
    const evaluation = evaluations.find(e => e.evaluationType === 'assessment_complete');
    
    if (!evaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      evaluation,
      program
    });
  } catch (error) {
    console.error('Error getting evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to load evaluation' },
      { status: 500 }
    );
  }
}