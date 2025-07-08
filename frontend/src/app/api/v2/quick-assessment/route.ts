/**
 * V2 Quick Assessment API
 * POST /api/v2/quick-assessment - Create a quick assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { AssessmentServiceV2 } from '@/lib/v2/services/assessment-service';
import { QuickAssessmentOptions } from '@/lib/v2/types';
import { getMockDatabase } from '@/lib/v2/utils/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const options = body as QuickAssessmentOptions;

    // Validate required fields
    if (!options.title || !options.questions || options.questions.length === 0) {
      return NextResponse.json(
        { error: 'Title and questions are required' },
        { status: 400 }
      );
    }

    // Validate questions
    for (const question of options.questions) {
      if (!question.question || !question.type) {
        return NextResponse.json(
          { error: 'Each question must have a question text and type' },
          { status: 400 }
        );
      }
      
      if (question.type === 'multiple_choice' && (!question.options || question.options.length < 2)) {
        return NextResponse.json(
          { error: 'Multiple choice questions must have at least 2 options' },
          { status: 400 }
        );
      }
    }

    const db = getMockDatabase();
    const service = new AssessmentServiceV2(db);
    
    // Create the assessment
    const assessment = await service.createQuickAssessment(options);

    return NextResponse.json({
      success: true,
      data: {
        assessment,
        start_url: `/v2/assessment/${assessment.id}/start`,
        track_id: assessment.id
      }
    });
  } catch (error) {
    console.error('Error creating quick assessment:', error);
    return NextResponse.json(
      { error: 'Failed to create assessment' },
      { status: 500 }
    );
  }
}