import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 });
    }

    // Get task
    const taskRepo = repositoryFactory.getTaskRepository();
    const task = await taskRepo.findById(taskId);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get program
    const programRepo = repositoryFactory.getProgramRepository();
    const program = await programRepo.findById(task.programId);

    // Get scenario
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const scenario = program ? await scenarioRepo.findById(program.scenarioId) : null;

    // Debug info
    const debugInfo = {
      task: {
        id: task.id,
        programId: task.programId,
        scenarioTaskIndex: task.scenarioTaskIndex,
        taskIndex: task.taskIndex,
        type: task.type,
        title: task.title
      },
      program: program ? {
        id: program.id,
        scenarioId: program.scenarioId
      } : null,
      scenario: scenario ? {
        id: scenario.id,
        sourceId: scenario.sourceId,
        taskTemplatesCount: scenario.taskTemplates?.length || 0,
        taskTemplateAtIndex: task.scenarioTaskIndex !== null && task.scenarioTaskIndex !== undefined
          ? scenario.taskTemplates?.[task.scenarioTaskIndex]
          : null
      } : null
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug task error:', error);
    return NextResponse.json({
      error: 'Failed to debug task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
