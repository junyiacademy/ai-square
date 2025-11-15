/**
 * Individual Program API Route
 * 使用新的 PostgreSQL Repository
 */

import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const programRepo = repositoryFactory.getProgramRepository();
    const program = await programRepo.findById(resolvedParams.id);

    if (!program) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }

    // Get tasks for the program
    const taskRepo = repositoryFactory.getTaskRepository();
    const tasks = await taskRepo.findByProgram(resolvedParams.id);

    // Get evaluations for the program
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    const evaluations = await evaluationRepo.findByProgram(resolvedParams.id);

    return NextResponse.json({
      ...program,
      tasks,
      evaluations
    });
  } catch (error) {
    console.error('Error fetching program:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const programRepo = repositoryFactory.getProgramRepository();
    const body = await request.json();

    // Validate input
    const allowedFields = ['status', 'currentTaskIndex', 'completedTasks', 'totalScore', 'ksaScores'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Special handling for status changes
    if (body.status === 'completed') {
      updateData.endTime = new Date();
    }

    const updatedProgram = await programRepo.update?.(resolvedParams.id, updateData);

    if (!updatedProgram) {
      return NextResponse.json(
        { error: 'Failed to update program' },
        { status: 500 }
      );
    }

    // If program is completed, update user XP
    if (body.status === 'completed') {
      const userRepo = repositoryFactory.getUserRepository();
      const scenarioRepo = repositoryFactory.getScenarioRepository();

      const scenario = await scenarioRepo.findById(updatedProgram.scenarioId);
      const xpReward = scenario?.xpRewards?.completion || 100;

      await userRepo.update(updatedProgram.userId, {
        totalXp: xpReward // This will be added to current XP in the repository
      });
    }

    return NextResponse.json(updatedProgram);
  } catch (error) {
    console.error('Error updating program:', error);

    if (error instanceof Error && error.message === 'Program not found') {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const programRepo = repositoryFactory.getProgramRepository();

    // Mark as abandoned instead of deleting
    await programRepo.update?.(resolvedParams.id, { status: 'abandoned' });

    return NextResponse.json({
      message: 'Program marked as abandoned'
    });
  } catch (error) {
    console.error('Error abandoning program:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
