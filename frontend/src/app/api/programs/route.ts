/**
 * Programs API Route
 * 使用新的 PostgreSQL Repository
 */

import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const scenarioId = searchParams.get('scenarioId');
    const status = searchParams.get('status');

    const programRepo = repositoryFactory.getProgramRepository();
    
    let programs;
    
    if (userId && status === 'active') {
      programs = await programRepo.getActivePrograms(userId);
    } else if (userId && status === 'completed') {
      programs = await programRepo.getCompletedPrograms(userId);
    } else if (userId) {
      programs = await programRepo.findByUser(userId);
    } else if (scenarioId) {
      programs = await programRepo.findByScenario(scenarioId);
    } else {
      return NextResponse.json(
        { error: 'userId or scenarioId is required' },
        { status: 400 }
      );
    }

    return NextResponse.json(programs);
  } catch (error) {
    console.error('Error fetching programs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, scenarioId } = body;

    if (!userId || !scenarioId) {
      return NextResponse.json(
        { error: 'userId and scenarioId are required' },
        { status: 400 }
      );
    }

    const programRepo = repositoryFactory.getProgramRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const contentRepo = repositoryFactory.getContentRepository();

    // Check if user already has an active program for this scenario
    const existingPrograms = await programRepo.findByUser(userId);
    const activeProgram = existingPrograms.find(
      p => p.scenarioId === scenarioId && p.status === 'active'
    );

    if (activeProgram) {
      return NextResponse.json(activeProgram);
    }

    // Get scenario details
    const scenario = await scenarioRepo.findById(scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Get scenario content to determine tasks
    const scenarioContent = await contentRepo.getScenarioContent(scenarioId);
    const totalTasks = scenarioContent.tasks?.length || scenario.tasks?.length || 0;

    // Create new program
    const program = await programRepo.create({
      userId,
      scenarioId,
      totalTasks
    });

    // Create tasks for the program
    if (scenarioContent.tasks && scenarioContent.tasks.length > 0) {
      const tasksData = scenarioContent.tasks.map((task: Record<string, unknown>, index: number) => ({
        taskIndex: index,
        type: task.type || 'question',
        context: task,
        allowedAttempts: task.maxAttempts || 3
      }));

      await taskRepo.createBatch(program.id, tasksData);
    }

    return NextResponse.json(program, { status: 201 });
  } catch (error) {
    console.error('Error creating program:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}