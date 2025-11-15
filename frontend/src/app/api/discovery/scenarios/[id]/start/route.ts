/**
 * Discovery Start API Route
 * Uses the new unified service layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { learningServiceFactory } from '@/lib/services/learning-service-factory';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('🚀 Discovery START API CALLED');
  console.log('   Timestamp:', new Date().toISOString());
  console.log('   Scenario ID:', id);

  try {
    const scenarioId = id;

    // Get user from session
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: 'User authentication required'
        },
        { status: 401 }
      );
    }

    console.log('   User email:', session.user.email);

    // Get language from request body
    const body = await request.json();
    const language = body.language || 'en';

    // Validate UUID format
    if (!scenarioId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid scenario ID format. UUID required.'
        },
        { status: 400 }
      );
    }

    // Get repositories
    const userRepo = repositoryFactory.getUserRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();

    // Verify scenario exists and is Discovery type
    const scenario = await scenarioRepo.findById(scenarioId);
    if (!scenario) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scenario not found'
        },
        { status: 404 }
      );
    }

    if (scenario.mode !== 'discovery') {
      return NextResponse.json(
        {
          success: false,
          error: 'Scenario is not a Discovery scenario'
        },
        { status: 400 }
      );
    }

    // Get or create user
    let user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      console.log('   Creating new user for:', session.user.email);
      user = await userRepo.create({
        email: session.user.email,
        name: session.user.email.split('@')[0],
        preferredLanguage: language
      });
    }

    console.log('   User ID:', user.id);
    console.log('   Using Discovery Learning Service to start learning...');

    // Use the new service layer
    const discoveryService = learningServiceFactory.getService('discovery');
    const program = await discoveryService.startLearning(
      user.id,
      scenarioId,
      { language }
    );

    console.log('   ✅ Program created with UUID:', program.id);

    // Get created tasks
    const taskRepo = repositoryFactory.getTaskRepository();
    const tasks = await taskRepo.findByProgram(program.id);

    // Return response in the expected format
    return NextResponse.json({
      success: true,
      id: program.id,
      scenarioId: program.scenarioId,
      status: program.status,
      currentTaskId: tasks[0]?.id,
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        type: task.type,
        xp: (task.discoveryData as Record<string, unknown>)?.xpReward as number || 50
      })),
      totalTasks: tasks.length,
      completedTasks: 0,
      totalXP: 0,
      language
    });

  } catch (error) {
    console.error('Error starting Discovery program:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start program'
      },
      { status: 500 }
    );
  }
}
