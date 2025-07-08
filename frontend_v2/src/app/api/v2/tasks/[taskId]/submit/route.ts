/**
 * V2 Task Submission API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/v2/utils/auth';
import { ServiceFactory } from '@/lib/v2/services/service.factory';
import { TaskRepository } from '@/lib/v2/repositories/task.repository';
import { ProgramRepository } from '@/lib/v2/repositories/program.repository';
import { ScenarioRepository } from '@/lib/v2/repositories/scenario.repository';
import { StorageFactory } from '@/lib/v2/storage/storage.factory';

interface RouteParams {
  params: {
    taskId: string;
  };
}

// POST /api/v2/tasks/[taskId]/submit - Submit task response
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { response, timeSpent } = body;

    if (!response) {
      return NextResponse.json(
        { error: 'Response is required' },
        { status: 400 }
      );
    }

    const storage = await StorageFactory.getStorage();
    const taskRepo = new TaskRepository(storage);
    const programRepo = new ProgramRepository(storage);
    const scenarioRepo = new ScenarioRepository(storage);
    
    // Get task and verify access
    const task = await taskRepo.findById(params.taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const program = await programRepo.findById(task.program_id);
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

    // Get appropriate service
    const service = await ServiceFactory.getService(scenario.type, storage);
    
    // Submit response
    let result;
    if (scenario.type === 'assessment' && 'submitAnswer' in service) {
      // Assessment-specific submission
      result = await (service as any).submitAnswer(
        params.taskId,
        user.email,
        response.answer || response,
        timeSpent
      );
    } else {
      // Generic task submission
      const evaluation = await service.submitTaskResponse(
        params.taskId,
        user.email,
        response
      );
      result = { evaluation };
    }

    return NextResponse.json({
      ...result,
      message: 'Task response submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting task response:', error);
    return NextResponse.json(
      { error: 'Failed to submit task response' },
      { status: 500 }
    );
  }
}