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
    
    // Submit answer
    const task = await assessmentService.recordAnswer(
      params.taskId,
      'submit',
      answer
    );
    
    // Evaluate the task
    const evaluation = await assessmentService.evaluateTask(params.taskId);
    
    return NextResponse.json({
      success: true,
      data: {
        task,
        evaluation
      }
    });
    
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to submit answer'
    }, { status: 500 });
  }
}