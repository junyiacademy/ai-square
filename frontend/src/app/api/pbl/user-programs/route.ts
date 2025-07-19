import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { cachedGET, getPaginationParams, createPaginatedResponse } from '@/lib/api/optimization-utils';

export async function GET(request: NextRequest) {
  // Get user info from cookie
  let userId: string | undefined;
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
    
    // Map programs to expected format with additional info
    const programsWithInfo = await Promise.all(programs.map(async (program) => {
      // Get tasks for the program
      const tasks = await taskRepo.findByProgram(program.id);
      const completedTasks = tasks.filter(t => t.status === 'completed');
      
      // Get evaluations for calculating overall score
      const evaluations = await evaluationRepo.findByProgram(program.id);
      const overallScore = evaluations.length > 0
        ? evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length
        : 0;
      
      // Try to get scenario title from content
      let scenarioTitle = program.scenarioId;
      try {
        const scenarioContent = await contentRepo.getScenarioContent(program.scenarioId, user.preferredLanguage);
        scenarioTitle = scenarioContent.title[user.preferredLanguage] || scenarioContent.title['en'] || program.scenarioId;
      } catch (error) {
        // Fallback to scenarioId if content not found
        console.warn(`Scenario content not found for ${program.scenarioId}`);
      }
      
      return {
        id: program.id,
        programId: program.id,
        scenarioId: program.scenarioId,
        scenarioTitle,
        status: program.status,
        startedAt: program.startTime,
        updatedAt: program.lastActivityAt,
        totalTasks: program.totalTasks,
        evaluatedTasks: completedTasks.length,
        overallScore,
        taskCount: program.totalTasks,
        lastActivity: program.lastActivityAt,
        // Add the progress field that the frontend expects
        progress: {
          completedTasks: completedTasks.length,
          totalTasks: program.totalTasks
        }
      };
    }));
    
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