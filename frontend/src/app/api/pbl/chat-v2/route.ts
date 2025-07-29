/**
 * PBL Chat API Route v2
 * Uses the new unified service layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { learningServiceFactory } from '@/lib/services/learning-service-factory';

interface ChatRequestBody {
  programId: string;
  taskId: string;
  message: string;
  language?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { programId, taskId, message, language = 'en' } = body;

    // Validate required fields
    if (!programId || !taskId || !message) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: programId, taskId, and message are required' 
        },
        { status: 400 }
      );
    }

    // Use the new service layer
    const pblService = learningServiceFactory.getService('pbl');
    
    // Submit the response and get AI feedback
    const result = await pblService.submitResponse(
      programId,
      taskId,
      {
        message,
        language
      }
    );

    // Extract AI response from metadata
    const aiResponse = (result.metadata?.aiResponse as Record<string, unknown>) || {
      message: result.feedback,
      hints: [],
      nextSteps: []
    };

    // Return response in expected format
    return NextResponse.json({
      success: true,
      aiResponse,
      isTaskComplete: result.metadata?.isComplete as boolean || false,
      nextTaskAvailable: result.nextTaskAvailable,
      score: result.score
    });

  } catch (error) {
    console.error('Chat API v2 error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process chat request'
      },
      { status: 500 }
    );
  }
}