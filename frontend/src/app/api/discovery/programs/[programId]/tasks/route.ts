/**
 * Discovery Tasks API
 * 管理 Discovery 學習任務
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getUnifiedAuth,
  createUnauthorizedResponse,
} from "@/lib/auth/unified-auth";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import type { ITask } from "@/types/unified-learning";

const VALID_TASK_TYPES = [
  "exploration",
  "practice",
  "reflection",
  "project",
  "assessment",
];

/**
 * GET /api/discovery/programs/[programId]/tasks
 * 獲取程式的所有任務
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> },
) {
  try {
    // Check authentication
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    // Get language from query params
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("lang") || "en";

    const { programId } = await params;

    // Get repositories
    const userRepo = repositoryFactory.getUserRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();

    // Get user
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Get program and verify ownership
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { success: false, error: "Program not found" },
        { status: 404 },
      );
    }

    if (program.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 },
      );
    }

    // Get tasks
    const tasks = await taskRepo.findByProgram(programId);

    // Process multilingual fields and sort by order
    const processedTasks = tasks
      .map((task) => {
        const titleObj = task.title as Record<string, string>;
        const instructionsObj = (task.content as Record<string, unknown>)
          ?.instructions as Record<string, string> | undefined;
        const feedbackObj = (task.metadata as Record<string, unknown>)
          ?.feedback as Record<string, string> | undefined;

        return {
          ...task,
          title: titleObj?.[language] || titleObj?.en || "Untitled",
          instructions: instructionsObj
            ? instructionsObj[language] || instructionsObj.en || ""
            : "",
          feedback: feedbackObj
            ? feedbackObj[language] || feedbackObj.en || ""
            : undefined,
          // Preserve original objects
          titleObj,
          instructionsObj,
          feedbackObj,
        };
      })
      .sort(
        (a, b) =>
          ((a as unknown as { order?: number }).order || 0) -
          ((b as unknown as { order?: number }).order || 0),
      );

    // Calculate progress
    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const activeTaskIndex = tasks.findIndex((t) => t.status === "active");

    return NextResponse.json({
      success: true,
      data: {
        tasks: processedTasks,
        progress: {
          completed: completedCount,
          total: tasks.length,
          current: activeTaskIndex >= 0 ? activeTaskIndex : completedCount,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        language,
      },
    });
  } catch (error) {
    console.error(
      "Error in GET /api/discovery/programs/[programId]/tasks:",
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/discovery/programs/[programId]/tasks
 * 創建新任務
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> },
) {
  try {
    // Check authentication
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    const { programId } = await params;
    const body = await request.json();
    const { type, title, instructions, context = {} } = body;

    // Validate input
    if (!type || !VALID_TASK_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid task type" },
        { status: 400 },
      );
    }

    if (!title || !instructions) {
      return NextResponse.json(
        { success: false, error: "Title and instructions are required" },
        { status: 400 },
      );
    }

    // Get repositories
    const userRepo = repositoryFactory.getUserRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();

    // Get user
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Get program and verify ownership
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { success: false, error: "Program not found" },
        { status: 404 },
      );
    }

    if (program.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 },
      );
    }

    // Get existing tasks to determine order
    const existingTasks = await taskRepo.findByProgram(programId);
    const nextOrder = existingTasks.length;

    // Create task
    const newTask: Omit<ITask, "id"> = {
      programId,
      mode: "discovery",
      type,
      title,
      status: "pending",
      taskIndex: nextOrder,
      score: 0,
      maxScore: 100,
      allowedAttempts: 99,
      attemptCount: 0,
      timeSpentSeconds: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: {
        instructions,
        ...context,
      },
      interactions: [],
      interactionCount: 0,
      userResponse: {},
      aiConfig: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {
        order: nextOrder,
      },
    };

    const createdTask = await taskRepo.create(newTask);

    // Update program metadata
    await programRepo.update?.(programId, {
      metadata: {
        ...(program.metadata || {}),
        lastTaskCreatedAt: new Date().toISOString(),
      },
      lastActivityAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          task: createdTask,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Error in POST /api/discovery/programs/[programId]/tasks:",
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
