import { NextRequest, NextResponse } from 'next/server';
import { AssessmentStorageV2Service } from '@/lib/v2/services/assessment-storage-v2.service';
import { authMiddleware } from '@/middleware/auth';

// POST /api/v2/assessment/programs - Create new assessment program
export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.authenticated || !authResult.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { scenarioId, config } = await request.json();
    
    if (!scenarioId) {
      return NextResponse.json(
        { error: 'Scenario ID is required' },
        { status: 400 }
      );
    }

    const storage = new AssessmentStorageV2Service();
    const program = await storage.createProgram(
      authResult.user.email,
      scenarioId,
      config
    );

    return NextResponse.json({
      success: true,
      program
    });

  } catch (error) {
    console.error('Error creating assessment program:', error);
    return NextResponse.json(
      { error: 'Failed to create assessment program' },
      { status: 500 }
    );
  }
}

// GET /api/v2/assessment/programs - Get user's assessment programs
export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.authenticated || !authResult.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const storage = new AssessmentStorageV2Service();
    const programs = await storage.getUserPrograms(authResult.user.email);

    return NextResponse.json({
      success: true,
      programs
    });

  } catch (error) {
    console.error('Error fetching user programs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch programs' },
      { status: 500 }
    );
  }
}