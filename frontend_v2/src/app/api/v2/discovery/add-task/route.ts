/**
 * V2 Discovery Add Dynamic Task API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/v2/utils/auth';
import { DiscoveryService } from '@/lib/v2/services/discovery.service';
import { ProgramRepository } from '@/lib/v2/repositories/program.repository';
import { ScenarioRepository } from '@/lib/v2/repositories/scenario.repository';
import { StorageFactory } from '@/lib/v2/storage/storage.factory';
import { VertexAIService } from '@/lib/v2/ai/vertex-ai.service';

// POST /api/v2/discovery/add-task - Add dynamic task to discovery program
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { programId, userRequest } = body;

    if (!programId || !userRequest) {
      return NextResponse.json(
        { error: 'programId and userRequest are required' },
        { status: 400 }
      );
    }

    const storage = await StorageFactory.getStorage();
    const programRepo = new ProgramRepository(storage);
    const scenarioRepo = new ScenarioRepository(storage);
    
    // Verify program access and type
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }

    const scenario = await scenarioRepo.findById(program.scenario_id);
    if (!scenario || scenario.user_id !== user.email) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (scenario.type !== 'discovery') {
      return NextResponse.json(
        { error: 'Dynamic tasks are only available for discovery scenarios' },
        { status: 400 }
      );
    }

    // Create discovery service with AI
    const aiService = new VertexAIService();
    const repositories = {
      scenario: scenarioRepo,
      program: programRepo,
      task: new (await import('@/lib/v2/repositories/task.repository')).TaskRepository(storage),
      log: new (await import('@/lib/v2/repositories/log.repository')).LogRepository(storage),
      evaluation: new (await import('@/lib/v2/repositories/evaluation.repository')).EvaluationRepository(storage)
    };

    const discoveryService = new DiscoveryService(repositories, storage, aiService);
    
    // Add dynamic task
    const task = await discoveryService.addDynamicTask(
      programId,
      userRequest,
      user.email
    );

    return NextResponse.json({
      task,
      message: 'Dynamic task created successfully'
    });
  } catch (error) {
    console.error('Error adding dynamic task:', error);
    return NextResponse.json(
      { error: 'Failed to add dynamic task' },
      { status: 500 }
    );
  }
}