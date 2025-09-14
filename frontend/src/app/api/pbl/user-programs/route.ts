import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { cachedGET, getPaginationParams, createPaginatedResponse } from '@/lib/api/optimization-utils';

export async function GET(request: NextRequest) {
  // Get user info from cookie
  let userEmail: string | undefined;

  try {
    const userCookie = request.cookies.get('user')?.value;
    if (userCookie) {
      const user = JSON.parse(userCookie);
      userEmail = user.email;
    }
  } catch {
    console.log('No user cookie found');
  }

  if (!userEmail) {
    return NextResponse.json(
      { success: false, error: 'User authentication required' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get('scenarioId');
  const paginationParams = getPaginationParams(request);

  return cachedGET(request, async () => {
    const userRepo = repositoryFactory.getUserRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    const contentRepo = repositoryFactory.getContentRepository();

    // Get user by email
    const user = await userRepo.findByEmail(userEmail);
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Get programs for this user
    let programs = await programRepo.findByUser(user.id);

    // Filter by scenarioId if provided
    if (scenarioId) {
      programs = programs.filter(p => p.scenarioId === scenarioId);
    }

    // Batch load data to prevent N+1 queries
    const programIds = programs.map(p => p.id);
    const uniqueScenarioIds = [...new Set(programs.map(p => p.scenarioId))];

    // Batch load all tasks for all programs in one query
    const allTasks = programIds.length > 0
      ? await taskRepo.findByProgramIds(programIds)
      : [];

    // Batch load all evaluations for all programs in one query
    const allEvaluations = programIds.length > 0
      ? await evaluationRepo.findByProgramIds(programIds)
      : [];

    // Batch load scenario content for unique scenarios
    const scenarioContentMap = new Map<string, unknown>();
    for (const scenarioId of uniqueScenarioIds) {
      try {
        const content = await contentRepo.getScenarioContent(scenarioId, user.preferredLanguage);
        scenarioContentMap.set(scenarioId, content);
      } catch {
        console.warn(`Scenario content not found for ${scenarioId}`);
      }
    }

    // Group tasks and evaluations by program ID for efficient lookup
    const tasksByProgram = new Map<string, typeof allTasks>();
    for (const task of allTasks) {
      if (!tasksByProgram.has(task.programId)) {
        tasksByProgram.set(task.programId, []);
      }
      tasksByProgram.get(task.programId)!.push(task);
    }

    const evaluationsByProgram = new Map<string, typeof allEvaluations>();
    for (const evaluation of allEvaluations) {
      if (!evaluation.programId) continue;
      if (!evaluationsByProgram.has(evaluation.programId)) {
        evaluationsByProgram.set(evaluation.programId, []);
      }
      evaluationsByProgram.get(evaluation.programId)!.push(evaluation);
    }

    // Map programs to expected format with batched data
    const programsWithInfo = programs.map((program) => {
      // Get tasks for this program
      const tasks = tasksByProgram.get(program.id) || [];
      const completedTasks = tasks.filter(t => t.status === 'completed');

      // Get evaluations for this program
      const evaluations = evaluationsByProgram.get(program.id) || [];
      const overallScore = evaluations.length > 0
        ? evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length
        : 0;

      // Get scenario title from batched content
      let scenarioTitle = program.scenarioId;
      const scenarioContent = scenarioContentMap.get(program.scenarioId);
      if (scenarioContent) {
        const titleObj = (scenarioContent as Record<string, unknown>)?.title as Record<string, string> | undefined;
        scenarioTitle = titleObj?.[user.preferredLanguage] || titleObj?.['en'] || program.scenarioId;
      }

      return {
        id: program.id,
        programId: program.id,
        scenarioId: program.scenarioId,
        scenarioTitle,
        status: program.status,
        startedAt: program.startedAt || program.createdAt,
        updatedAt: program.lastActivityAt,
        totalTasks: program.totalTaskCount,
        evaluatedTasks: completedTasks.length,
        overallScore,
        taskCount: program.totalTaskCount,
        lastActivity: program.lastActivityAt,
        // Add the progress field that the frontend expects
        progress: {
          completedTasks: completedTasks.length,
          totalTasks: program.totalTaskCount
        }
      };
    });

    // Sort by startedAt descending (newest first)
    programsWithInfo.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    // Apply pagination
    const paginatedResponse = createPaginatedResponse(
      programsWithInfo,
      programsWithInfo.length,
      paginationParams
    );

    return {
      success: true,
      ...paginatedResponse
    };
  }, {
    ttl: 120, // 2 minutes cache (user-specific data)
    staleWhileRevalidate: 600 // 10 minutes
  });
}
