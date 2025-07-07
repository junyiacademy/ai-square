import { NextRequest, NextResponse } from 'next/server';
import { ensureServices } from '@/lib/core/services/api-helpers';
import { CompletionTask } from '@/types/pbl-completion';
import { ProgramStatus } from '@/lib/core/program/types';
import { TrackStatus } from '@/lib/core/track/types';

export async function GET(request: NextRequest) {
  try {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId');
    const scenarioId = searchParams.get('scenarioId');
    const taskId = searchParams.get('taskId');

    if (!programId || !scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Use new architecture
    const services = await ensureServices();

    // Get program with its track and tasks
    const program = await services.programService.getProgram(userEmail, programId);
    if (!program) {
      // This might be an old program ID - return empty completion data instead of error
      console.log(`Program not found: ${programId} - likely from old architecture`);
      return NextResponse.json({
        success: true,
        data: {
          programId: programId,
          scenarioId: scenarioId,
          status: 'not_found',
          overallScore: 0,
          domainScores: {},
          ksaScores: {
            knowledge: 0,
            skills: 0,
            attitudes: 0
          },
          completedTasks: 0,
          totalTasks: 0,
          evaluatedTasks: 0,
          tasks: [],
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    }

    // Get all tasks for this program
    const tasks = await services.taskService.queryTasks({
      programId: program.id,
      userId: userEmail
    });

    // Get evaluations for all tasks
    const evaluations = await services.evaluationService.queryEvaluations({
      userId: userEmail,
      entityType: 'task'
    });

    // Get all logs for the program once
    const allLogs = await services.logService.queryLogs({
      userId: userEmail,
      programId: program.id,
      orderBy: 'timestamp:asc'
    });
    
    // Build task completion data
    const taskCompletionMap = new Map<string, CompletionTask>();
    
    for (const task of tasks) {
      // Filter logs for this specific task
      const taskLogs = allLogs.filter(log => log.taskId === task.id);
      
      // Transform logs to interactions
      const interactions = taskLogs
        .filter(log => log.type === 'INTERACTION')
        .map(log => ({
          type: log.metadata?.type || log.data?.type || 'unknown',
          message: log.message || log.data?.content || log.metadata?.content || '',
          timestamp: log.timestamp instanceof Date 
            ? log.timestamp.toISOString() 
            : typeof log.timestamp === 'string' 
              ? log.timestamp 
              : new Date(log.timestamp).toISOString()
        }));
      const taskEvaluations = evaluations.filter(e => e.entityId === task.id);
      const latestEval = taskEvaluations.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      // Check if we have evaluation from evaluationService or from task progress
      if (latestEval || task.progress?.evaluation) {
        // Get task progress data
        const progress: any = {
          timeSpentSeconds: task.progress?.timeSpent || 0,
          status: 'completed'
        };

        // Use evaluation from evaluationService if available, otherwise use from task progress
        const evalData = latestEval ? {
          score: latestEval.score || 0,
          domainScores: latestEval.results?.domainScores || {},
          ksaScores: latestEval.results?.ksaScores || {},
          conversationInsights: latestEval.results?.conversationInsights,
          strengths: latestEval.results?.strengths || [],
          improvements: latestEval.results?.improvements || [],
          evaluatedAt: latestEval.createdAt.toISOString()
        } : {
          score: task.progress?.evaluation?.overallScore || task.progress?.score || 0,
          domainScores: task.progress?.evaluation?.domainScores || {},
          ksaScores: task.progress?.evaluation?.ksaScores || {},
          conversationInsights: task.progress?.evaluation?.conversationInsights,
          strengths: task.progress?.evaluation?.strengths || [],
          improvements: task.progress?.evaluation?.improvements || [],
          evaluatedAt: task.progress?.evaluation?.evaluatedAt || new Date().toISOString()
        };

        taskCompletionMap.set(task.id, {
          taskId: task.config?.taskId || task.id,
          taskTitle: task.title,
          evaluation: evalData,
          log: {
            interactions: interactions
          },
          progress: progress,
          // For backward compatibility
          score: evalData.score,
          domainScores: evalData.domainScores,
          ksaScores: evalData.ksaScores,
          feedback: latestEval?.feedback || '',
          evaluatedAt: evalData.evaluatedAt,
          attempts: taskEvaluations.length || 1
        });
      }
    }

    // Calculate overall scores
    const completedTasks = Array.from(taskCompletionMap.values());
    const evaluatedTasks = completedTasks.length;
    const totalTasks = tasks.length;
    
    const overallScore = evaluatedTasks > 0
      ? Math.round(completedTasks.reduce((sum, t) => sum + t.score, 0) / evaluatedTasks)
      : 0;

    // Aggregate domain scores
    const domainScores: Record<string, number> = {};
    const domainCounts: Record<string, number> = {};
    
    for (const task of completedTasks) {
      for (const [domain, score] of Object.entries(task.domainScores || {})) {
        if (!domainScores[domain]) {
          domainScores[domain] = 0;
          domainCounts[domain] = 0;
        }
        domainScores[domain] += score;
        domainCounts[domain]++;
      }
    }
    
    // Average domain scores
    for (const domain of Object.keys(domainScores)) {
      domainScores[domain] = Math.round(domainScores[domain] / domainCounts[domain]);
    }

    // Aggregate KSA scores
    const ksaScores = {
      knowledge: { score: 0, count: 0 },
      skills: { score: 0, count: 0 },
      attitudes: { score: 0, count: 0 }
    };
    
    for (const task of completedTasks) {
      if (task.ksaScores) {
        for (const [category, score] of Object.entries(task.ksaScores)) {
          if (category in ksaScores && typeof score === 'number') {
            ksaScores[category as keyof typeof ksaScores].score += score;
            ksaScores[category as keyof typeof ksaScores].count++;
          }
        }
      }
    }
    
    // Average KSA scores - return as simple numbers for compatibility
    const avgKsaScores: any = {};
    for (const [category, data] of Object.entries(ksaScores)) {
      avgKsaScores[category] = data.count > 0 
        ? Math.round(data.score / data.count)
        : 0;
    }

    // Build completion data
    const completionData = {
      programId: program.id,
      scenarioId: program.config?.scenarioId || scenarioId,
      status: program.status === ProgramStatus.COMPLETED ? 'completed' : 'in_progress',
      overallScore,
      domainScores,
      ksaScores: avgKsaScores,
      completedTasks: evaluatedTasks,
      totalTasks,
      evaluatedTasks,
      tasks: completedTasks,
      startedAt: program.startedAt?.toISOString(),
      completedAt: program.completedAt?.toISOString(),
      updatedAt: program.updatedAt.toISOString()
    };

    // If taskId is provided, return only that task's data
    if (taskId) {
      const taskData = completedTasks.find((t: CompletionTask) => t.taskId === taskId);
      if (!taskData) {
        return NextResponse.json(
          { success: false, error: 'Task not found in completion data' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          task: taskData,
          program: {
            programId: completionData.programId,
            status: completionData.status,
            overallScore: completionData.overallScore,
            domainScores: completionData.domainScores,
            ksaScores: completionData.ksaScores,
            completedTasks: completionData.completedTasks,
            totalTasks: completionData.totalTasks,
            evaluatedTasks: completionData.evaluatedTasks
          }
        }
      });
    }

    // Return full completion data
    return NextResponse.json({
      success: true,
      data: completionData
    });

  } catch (error) {
    console.error('Error getting completion data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get completion data' },
      { status: 500 }
    );
  }
}

// PUT - Update completion data (called after evaluation)
export async function PUT(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { programId, scenarioId } = body;

    if (!programId || !scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use new architecture
    const services = await ensureServices();

    // Get program to check current status
    const program = await services.programService.getProgram(userEmail, programId);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }

    // Get all tasks to check completion
    const tasks = await services.taskService.queryTasks({
      programId: program.id,
      userId: userEmail
    });

    // Get evaluations to check which tasks are completed
    const evaluations = await services.evaluationService.queryEvaluations({
      userId: userEmail,
      entityType: 'task'
    });

    const evaluatedTaskIds = new Set(
      evaluations
        .filter(e => tasks.some(t => t.id === e.entityId))
        .map(e => e.entityId)
    );

    const completedCount = evaluatedTaskIds.size;
    const totalCount = tasks.length;
    
    // Calculate progress
    const progress = {
      ...program.progress,
      completedTasks: completedCount,
      totalTasks: totalCount,
      lastActivityAt: new Date()
    };

    // Update program status if all tasks are completed
    let status = program.status;
    if (completedCount === totalCount && totalCount > 0) {
      status = ProgramStatus.COMPLETED;
    }

    // Update program
    await services.programService.updateProgram(userEmail, programId, {
      status,
      progress,
      completedAt: status === ProgramStatus.COMPLETED ? new Date() : undefined
    });

    // Update track if program is completed
    if (status === ProgramStatus.COMPLETED && program.trackId) {
      const track = await services.trackService.getTrack(program.trackId);
      if (track && track.status !== TrackStatus.COMPLETED) {
        await services.trackService.updateTrack(program.trackId, {
          status: TrackStatus.COMPLETED,
          completedAt: new Date()
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Completion data updated successfully'
    });

  } catch (error) {
    console.error('Error updating completion data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update completion data' },
      { status: 500 }
    );
  }
}