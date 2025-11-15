import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;

    // Get user info from cookie
    let userEmail: string | undefined;
    try {
      const userCookie = request.cookies.get('user')?.value;
      if (userCookie) {
        const user = JSON.parse(userCookie);
        userEmail = user.email;
      }
    } catch {
      console.log('No user cookie found');
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { scenarioId } = body;

    if (!scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Scenario ID is required' },
        { status: 400 }
      );
    }

    // Update program timestamps
    const programRepo = repositoryFactory.getProgramRepository();

    // First check if program exists
    const existingProgram = await programRepo.findById(programId);
    if (!existingProgram || existingProgram.scenarioId !== scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }

    if (!programRepo.update) {
      return NextResponse.json(
        { success: false, error: 'Update operation not supported' },
        { status: 500 }
      );
    }

    const updatedProgram = await programRepo.update(programId, {
      metadata: {
        ...existingProgram.metadata,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });


    return NextResponse.json({
      success: true,
      program: updatedProgram
    });

  } catch (error) {
    console.error('Error updating program timestamps:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update timestamps' },
      { status: 500 }
    );
  }
}
