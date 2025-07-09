import { NextRequest, NextResponse } from 'next/server';
import { UnifiedStorageService } from '@/lib/v2/services/unified-storage.service';
import { AssessmentServiceV2Fixed } from '@/lib/v2/services/assessment-service-v2-fixed';

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { answer } = await request.json();
    
    const unifiedStorage = new UnifiedStorageService();
    const assessmentService = new AssessmentServiceV2Fixed(unifiedStorage);
    
    const task = await assessmentService.recordAnswer(
      params.taskId,
      'answer',
      answer
    );
    
    return NextResponse.json({
      success: true,
      data: task
    });
    
  } catch (error) {
    console.error('Error recording answer:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to record answer'
    }, { status: 500 });
  }
}