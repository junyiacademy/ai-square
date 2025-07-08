import { NextRequest, NextResponse } from 'next/server';
import { AssessmentStorageService } from '@/lib/v2/services/assessment-storage.service';
import { AssessmentSession } from '@/lib/v2/schemas/assessment.schema';

// Create a new assessment session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionType = 'comprehensive', language = 'en' } = body;
    
    // Get user email from session/auth (placeholder for now)
    const userEmail = 'demo@example.com'; // TODO: Get from auth
    
    const sessionId = `assessment_${Date.now()}`;
    
    // Create new session
    const session: AssessmentSession = {
      id: sessionId,
      userEmail,
      sessionType,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      config: {
        totalQuestions: 12,
        timeLimit: 15, // minutes
        passingScore: 60,
        domains: ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai'],
        language
      },
      responses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      const storageService = new AssessmentStorageService();
      await storageService.saveAssessmentSession(session);
    } catch (storageError) {
      console.error('GCS Storage Error:', storageError);
      // Continue without saving to GCS for now
      console.log('Warning: Assessment session not saved to GCS, continuing anyway');
    }
    
    return NextResponse.json({
      sessionId,
      config: session.config
    });
  } catch (error) {
    console.error('Error creating assessment session:', error);
    return NextResponse.json(
      { error: 'Failed to create assessment session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get assessment session status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Get user email from session/auth (placeholder for now)
    const userEmail = 'demo@example.com'; // TODO: Get from auth
    
    try {
      const storageService = new AssessmentStorageService();
      const session = await storageService.getAssessmentSession(userEmail, sessionId);
      
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(session);
    } catch (storageError) {
      console.error('GCS Storage Error:', storageError);
      // Return a mock session for development
      return NextResponse.json({
        id: sessionId,
        userEmail,
        status: 'in_progress',
        config: {
          totalQuestions: 12,
          timeLimit: 15,
          passingScore: 60,
          domains: ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai'],
          language: 'en'
        }
      });
    }
  } catch (error) {
    console.error('Error fetching assessment session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment session' },
      { status: 500 }
    );
  }
}

// Update assessment session (e.g., save progress)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, responses } = body;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Get user email from session/auth (placeholder for now)
    const userEmail = 'demo@example.com'; // TODO: Get from auth
    
    try {
      const storageService = new AssessmentStorageService();
      
      // Update session with new responses
      await storageService.updateAssessmentSession(userEmail, sessionId, {
        responses,
        updatedAt: new Date().toISOString()
      });
    } catch (storageError) {
      console.error('GCS Storage Error:', storageError);
      // Continue without saving
      console.log('Warning: Progress not saved to GCS');
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating assessment session:', error);
    return NextResponse.json(
      { error: 'Failed to update assessment session' },
      { status: 500 }
    );
  }
}