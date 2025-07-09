import { NextRequest, NextResponse } from 'next/server';
import { 
  getProgramRepository,
  getEvaluationRepository 
} from '@/lib/implementations/gcs-v2';
import { getAuthFromRequest } from '@/lib/auth/auth-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { programId: string } }
) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const programRepo = getProgramRepository();
    const evaluationRepo = getEvaluationRepository();
    
    // Get program
    const program = await programRepo.findById(params.programId);
    if (!program || program.userId !== user.email) {
      return NextResponse.json(
        { error: 'Program not found or access denied' },
        { status: 404 }
      );
    }
    
    // Get evaluation for this program
    const evaluations = await evaluationRepo.findByTarget('program', params.programId);
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