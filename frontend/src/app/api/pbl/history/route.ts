import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import {
  cachedGET,
  getPaginationParams,
  createPaginatedResponse,
  parallel
} from '@/lib/api/optimization-utils';

interface TaskSummary {
  taskId: string;
  title?: string;
  score?: number;
  completedAt?: string;
}

interface ProgramCompletionData {
  programId: string;
  scenarioId: string;
  userEmail: string;
  status: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  totalTasks: number;
  evaluatedTasks: number;
  overallScore: number;
  domainScores: Record<string, number>;
  ksaScores: Record<string, number>;
  totalTimeSeconds: number;
  taskSummaries: TaskSummary[];
  scenarioTitle?: string;
}

export async function GET(request: NextRequest) {
  // Extract user info
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
      {
        success: false,
        error: 'User authentication required'
      },
      { status: 401 }
    );
  }

  // Get parameters
  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get('scenarioId') || undefined;
  const language = searchParams.get('lang') || 'en';
  const paginationParams = getPaginationParams(request);

  // Use cached response
  return cachedGET(request, async () => {
    console.log(`Fetching PBL history for user: ${userEmail}, scenario: ${scenarioId || 'all'}, language: ${language}`);

    const userRepo = repositoryFactory.getUserRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    const contentRepo = repositoryFactory.getContentRepository();

    // Get user
    const user = await userRepo.findByEmail(userEmail!);
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Get all programs for user
    let programs = await programRepo.findByUser(user.id);

    // Filter by scenario if specified
    if (scenarioId) {
      programs = programs.filter(p => p.scenarioId === scenarioId);
    }

    // Convert to completion data format
    const completionDataPromises = programs.map(async (program) => {
      // Get tasks and evaluations in parallel
      const [tasks, evaluations] = await parallel(
        taskRepo.findByProgram(program.id),
        evaluationRepo.findByProgram(program.id)
      );

      const completedTasks = tasks.filter(t => t.status === 'completed');

      // Calculate scores
      const overallScore = evaluations.length > 0
        ? evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length
        : 0;

      // Aggregate domain scores from evaluations
      const domainScores: Record<string, number> = {};
      const ksaScores: Record<string, number> = {};

      evaluations.forEach(evaluation => {
        if (evaluation.domainScores) {
          Object.entries(evaluation.domainScores).forEach(([dimension, score]: [string, number]) => {
            if (dimension.includes('_')) {
              domainScores[dimension] = (domainScores[dimension] || 0) + score;
            } else {
              ksaScores[dimension] = (ksaScores[dimension] || 0) + score;
            }
          });
        }
      });

      // Average the scores
      Object.keys(domainScores).forEach(key => {
        domainScores[key] = domainScores[key] / evaluations.length;
      });
      Object.keys(ksaScores).forEach(key => {
        ksaScores[key] = ksaScores[key] / evaluations.length;
      });

      // Create task summaries
      const taskSummaries: TaskSummary[] = completedTasks.map(task => ({
        taskId: task.id,
        title: `Task ${task.taskIndex + 1}`,
        score: task.score,
        completedAt: task.completedAt
      }));

      // Get scenario title
      let scenarioTitle = program.scenarioId;
      try {
        const scenarioContent = await contentRepo.getScenarioContent(program.scenarioId, language);
        scenarioTitle = scenarioContent.title[language] || scenarioContent.title['en'] || program.scenarioId;
      } catch {
        console.warn(`Failed to load scenario title for ${program.scenarioId}`);
      }

      const completionData: ProgramCompletionData = {
        programId: program.id,
        scenarioId: program.scenarioId,
        userEmail: user.email,
        status: program.status,
        startedAt: program.startedAt || program.createdAt,
        updatedAt: program.lastActivityAt,
        completedAt: program.completedAt,
        totalTasks: program.totalTaskCount,
        evaluatedTasks: completedTasks.length,
        overallScore,
        domainScores,
        ksaScores,
        totalTimeSeconds: program.timeSpentSeconds,
        taskSummaries,
        scenarioTitle
      };

      return completionData;
    });

    const allPrograms = await Promise.all(completionDataPromises);

    console.log(`Found ${allPrograms.length} programs for user ${userEmail}`);

    // Sort by most recent first
    allPrograms.sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    // Apply pagination
    const paginatedResponse = createPaginatedResponse(
      allPrograms,
      allPrograms.length,
      paginationParams
    );

    return {
      success: true,
      ...paginatedResponse,
      totalPrograms: allPrograms.length
    };
  }, {
    ttl: 60, // 1 minute cache (short because user-specific)
    staleWhileRevalidate: 300 // 5 minutes
  });
}
