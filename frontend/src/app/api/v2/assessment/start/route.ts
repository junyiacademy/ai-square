import { NextRequest, NextResponse } from 'next/server';
import { UnifiedStorageService } from '@/lib/v2/services/unified-storage.service';
import { AssessmentServiceV2Fixed } from '@/lib/v2/services/assessment-service-v2-fixed';

export async function POST(request: NextRequest) {
  try {
    const { assessmentId, language = 'en' } = await request.json();
    
    // Get user email from auth
    const authCheck = await fetch(new URL('/api/auth/check', request.url));
    if (!authCheck.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated' 
      }, { status: 401 });
    }
    
    const authData = await authCheck.json();
    if (!authData.authenticated || !authData.user?.email) {
      return NextResponse.json({ 
        success: false, 
        error: 'User email not found' 
      }, { status: 401 });
    }
    
    const userEmail = authData.user.email;
    
    // Initialize services
    const unifiedStorage = new UnifiedStorageService();
    const assessmentService = new AssessmentServiceV2Fixed(unifiedStorage);
    
    // Start assessment - creates Scenario and Program
    const { scenario, program, project } = await assessmentService.startAssessment(
      userEmail,
      assessmentId,
      { language }
    );
    
    // Create tasks from questions
    const tasks = await assessmentService.createTasksForProgram(
      program.id,
      assessmentId,
      { language }
    );
    
    // Update program with task IDs
    await unifiedStorage.updateProgram(program.id, {
      task_ids: tasks.map(t => t.id)
    });
    
    return NextResponse.json({
      success: true,
      data: {
        scenarioId: scenario.id,
        programId: program.id,
        taskIds: tasks.map(t => t.id),
        project
      }
    });
    
  } catch (error) {
    console.error('Error starting assessment:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start assessment'
    }, { status: 500 });
  }
}