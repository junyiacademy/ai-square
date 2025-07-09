import { NextRequest, NextResponse } from 'next/server';
import { UnifiedStorageService } from '@/lib/v2/services/unified-storage.service';
import { AssessmentServiceV2Fixed } from '@/lib/v2/services/assessment-service-v2-fixed';

export async function POST(
  request: NextRequest,
  { params }: { params: { programId: string } }
) {
  try {
    const unifiedStorage = new UnifiedStorageService();
    const assessmentService = new AssessmentServiceV2Fixed(unifiedStorage);
    
    const { program, results } = await assessmentService.completeProgram(params.programId);
    
    return NextResponse.json({
      success: true,
      data: {
        program,
        results
      }
    });
    
  } catch (error) {
    console.error('Error completing program:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to complete program'
    }, { status: 500 });
  }
}