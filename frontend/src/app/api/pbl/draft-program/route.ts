import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');
    
    if (!scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Scenario ID is required' },
        { status: 400 }
      );
    }
    
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
    
    // Get repositories
    const userRepo = repositoryFactory.getUserRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    
    // Get user by email
    const user = await userRepo.findByEmail(userEmail);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find active programs for user in this scenario
    const userPrograms = await programRepo.findByUser(user.id);
    const draftProgram = userPrograms.find(
      p => p.scenarioId === scenarioId && p.status === 'active'
    );
    
    if (draftProgram) {
      return NextResponse.json({
        success: true,
        program: {
          id: draftProgram.id,
          scenarioId: draftProgram.scenarioId,
          userEmail: userEmail,
          status: draftProgram.status,
          currentTaskIndex: draftProgram.currentTaskIndex,
          completedTaskCount: draftProgram.completedTaskCount,
          totalTaskCount: draftProgram.totalTaskCount,
          startedAt: draftProgram.startedAt || draftProgram.createdAt,
          updatedAt: draftProgram.lastActivityAt
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'No draft program found'
      });
    }
    
  } catch (error) {
    console.error('Error checking draft program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check draft program' },
      { status: 500 }
    );
  }
}