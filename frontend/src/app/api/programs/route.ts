/**
 * Programs API Route
 * 使用新的 PostgreSQL Repository
 */

import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { TaskType } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const scenarioId = searchParams.get('scenarioId');
    const status = searchParams.get('status');

    const programRepo = repositoryFactory.getProgramRepository();
    
    let programs;
    
    if (userId && status === 'active') {
      programs = await programRepo.getActivePrograms?.(userId);
    } else if (userId && status === 'completed') {
      programs = await programRepo.getCompletedPrograms?.(userId);
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
    const totalTasks = scenarioContent.tasks?.length || scenario.taskTemplates?.length || 0;

    // Create new program
    const program = await programRepo.create({
      userId,
      scenarioId,
      mode: (scenario.metadata?.mode as 'pbl' | 'discovery' | 'assessment') || 'pbl',
      status: 'active' as const,
      currentTaskIndex: 0,
      completedTaskCount: 0,
      totalTaskCount: totalTasks,
      totalScore: 0,
      dimensionScores: {},
      xpEarned: 0,
      badgesEarned: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      timeSpentSeconds: 0,
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {}
    });

    // Create tasks for the program
    if (scenarioContent.tasks && scenarioContent.tasks.length > 0) {
      await Promise.all(scenarioContent.tasks.map((task: Record<string, unknown>, index: number) => 
        taskRepo.create({
          programId: program.id,
          mode: program.mode,
          taskIndex: index,
          scenarioTaskIndex: index,
          type: (task.type as TaskType) || 'question',
          status: index === 0 ? 'active' : 'pending',
          title: task.title as string,
          description: task.description as string,
          // DDD: content = 用戶看到的內容
          content: {
            description: task.description as string,
            instructions: task.instructions as string,
            hints: task.hints as string[],
            scenarioId,
            taskType: task.category as string,
            difficulty: task.difficulty as string,
            estimatedTime: task.time_limit as number,
            ksaCodes: task.KSA_focus as string[]
          },
          interactions: [],
          interactionCount: 0,
          userResponse: {},
          score: 0,
          maxScore: 100,
          allowedAttempts: (task.maxAttempts as number) || 3,
          attemptCount: 0,
          timeLimitSeconds: (task.time_limit as number) * 60 || 1800,
          timeSpentSeconds: 0,
          aiConfig: task.aiModule as Record<string, unknown> || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pblData: {},
          discoveryData: {},
          assessmentData: {},
          metadata: {}
        })
      ));
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