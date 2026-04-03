/**
 * POST /api/discovery/programs/[programId]/next-task
 * Generates the next adaptive task after completing the previous one.
 * Uses the Learner Model to adjust difficulty.
 */

import { NextRequest, NextResponse } from "next/server";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import { getUnifiedAuth, createUnauthorizedResponse } from "@/lib/auth/unified-auth";
import { AdaptiveTaskGenerator } from "@/lib/services/discovery/adaptive-task-generator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> },
) {
  try {
    const { programId } = await params;

    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    const userRepo = repositoryFactory.getUserRepository();
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const programRepo = repositoryFactory.getProgramRepository();
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== user.id) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const language = (body as Record<string, string>).language || "en";

    // Get career type from program metadata
    const careerId =
      (program.metadata as Record<string, unknown>)?.careerType as string;
    if (!careerId) {
      return NextResponse.json(
        { error: "Career type not found in program" },
        { status: 400 },
      );
    }

    // Generate adaptive task
    const generator = new AdaptiveTaskGenerator();
    const targetSkillId = await generator.selectTargetSkill(user.id, careerId, language);
    const generatedTask = await generator.generateTask(user.id, careerId, targetSkillId, language);

    // Create the task in DB
    const taskRepo = repositoryFactory.getTaskRepository();
    const existingTasks = await taskRepo.findByProgram(programId);
    const nextIndex = existingTasks.length;

    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const scenario = await scenarioRepo.findById(program.scenarioId);

    const task = await taskRepo.create({
      programId,
      scenarioId: program.scenarioId,
      mode: "discovery",
      taskIndex: nextIndex,
      type: "exploration",
      status: "active",
      title: generatedTask.title,
      description: generatedTask.description,
      content: {
        objectives: generatedTask.objectives,
        hints: generatedTask.hints,
        completionCriteria: generatedTask.completionCriteria,
        xp: generatedTask.xpReward,
        difficulty: generatedTask.difficulty,
        scaffolding: generatedTask.scaffolding,
        skillsTargeted: generatedTask.skillsTargeted,
      },
      metadata: {
        careerType: careerId,
        scenarioTitle: scenario?.title,
        adaptive: true,
        difficulty: generatedTask.difficulty,
        skillsTargeted: generatedTask.skillsTargeted,
        scaffolding: generatedTask.scaffolding,
      },
      // Defaults for required ITask fields
      interactions: [],
      interactionCount: 0,
      userResponse: {},
      score: 0,
      maxScore: 100,
      allowedAttempts: 5,
      attemptCount: 0,
      timeSpentSeconds: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      aiConfig: {},
      pblData: {},
      discoveryData: { adaptive: true },
      assessmentData: {},
    });

    // Update program metadata
    await programRepo.update?.(programId, {
      metadata: {
        ...(program.metadata as Record<string, unknown>),
        currentTaskId: task.id,
        currentTaskIndex: nextIndex,
      },
      totalTaskCount: nextIndex + 1,
    });

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: generatedTask.title,
        description: generatedTask.description,
        difficulty: generatedTask.difficulty,
        skillsTargeted: generatedTask.skillsTargeted,
        scaffolding: generatedTask.scaffolding,
        xpReward: generatedTask.xpReward,
      },
    });
  } catch (error) {
    console.error("Error generating next task:", error);
    return NextResponse.json(
      { error: "Failed to generate next task" },
      { status: 500 },
    );
  }
}
