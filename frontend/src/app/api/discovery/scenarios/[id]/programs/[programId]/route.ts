import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { ITask } from '@/types/unified-learning';
import { normalizeLanguageCode } from '@/lib/utils/language';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> }
) {
  try {
    // Set no-cache headers
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    const { id: scenarioId, programId } = await params;
    const userId = session.user.id; // Get user ID

    // Get language from query param
    const { searchParams } = new URL(request.url);
    const lang = normalizeLanguageCode(searchParams.get('lang') || 'en');

    // Get repositories
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();

    // Load program from repository
    const program = await programRepo.findById(programId);

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Verify this program belongs to the current user and scenario
    if (program.userId !== userId || program.scenarioId !== scenarioId) {
      console.log('Authorization check failed:', {
        programUserId: program.userId,
        currentUserId: userId,
        programScenarioId: program.scenarioId,
        requestedScenarioId: scenarioId
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Load all tasks for this program
    const allTasks = await taskRepo.findByProgram(programId);
    const taskMap = new Map(allTasks.map(t => [t.id, t]));

    // Get tasks in the correct order based on program.taskIds
    const taskIds = (program.metadata?.taskIds || []) as string[];
    const tasks = taskIds
      .map((id: string) => taskMap.get(id))
      .filter(Boolean) as unknown as ITask[];

    // Debug logging
    console.log('Program task order:', {
      programId: program.id,
      taskIds: taskIds,
      orderedTaskTitles: tasks.map(t => ({ id: t.id, title: t.title, status: t.status, index: t.scenarioTaskIndex }))
    });

    // Calculate completed tasks and total XP
    let completedCount = 0;
    let totalXP = 0;

    const tasksSummary = tasks.map((task, index) => {
      const xp = (task.content as Record<string, unknown>)?.xp as number || 0;

      // Calculate statistics from interactions
      let actualXP = 0;
      let attempts = 0;
      let passCount = 0;

      if (task.interactions && task.interactions.length > 0) {
        // Count user attempts
        attempts = task.interactions.filter(i => i.type === 'user_input').length;

        // Count successful attempts and find highest XP
        const aiResponses = task.interactions.filter(i => i.type === 'ai_response');
        aiResponses.forEach(response => {
          const responseContent = response.content as { completed?: boolean; xpEarned?: number };
          if (responseContent?.completed === true) {
            passCount++;
            if (responseContent?.xpEarned) {
              actualXP = Math.max(actualXP, responseContent.xpEarned);
            }
          }
        });

        // If task is completed but actualXP is 0, use the evaluation score or default XP
        if (task.status === 'completed' && actualXP === 0) {
          actualXP = xp; // Use default XP since evaluation is not directly on task
        }
      }

      if (task.status === 'completed') {
        completedCount++;
        totalXP += actualXP || xp; // Use actual XP if available, otherwise default
      }

      // Determine display status for UI
      let displayStatus: string = task.status;
      if (task.status === 'pending' && index === completedCount) {
        displayStatus = 'available'; // Next task after completed ones
      } else if (task.status === 'pending' && index > completedCount) {
        displayStatus = 'locked'; // Future tasks
      }

      return {
        id: task.id,
        title: (() => {
          const titleObj = task.title as string | Record<string, string> | undefined;
          // Handle different types of title
          if (typeof titleObj === 'string') {
            // Check if it's a JSON string
            if (titleObj.startsWith('{')) {
              try {
                const parsed = JSON.parse(titleObj);
                return parsed[lang] || parsed['en'] || titleObj;
              } catch {
                return titleObj; // Return as-is if parse fails
              }
            }
            return titleObj;
          } else if (typeof titleObj === 'object' && titleObj !== null) {
            // It's already an object
            return titleObj[lang] || titleObj['en'] || '';
          }
          return '';
        })(),
        description: (() => {
          const desc = (task.content as Record<string, unknown>)?.description;
          let descObj = desc;
          // Handle case where description is a JSON string
          if (typeof descObj === 'string' && descObj.startsWith('{')) {
            try {
              descObj = JSON.parse(descObj);
            } catch {
              return descObj as string || '';
            }
          }
          // Now extract the language-specific value
          if (typeof descObj === 'object' && descObj !== null) {
            return (descObj as Record<string, string>)[lang] || (descObj as Record<string, string>)['en'] || '';
          }
          return descObj as string || '';
        })(),
        xp: xp,
        status: displayStatus,
        completedAt: task.completedAt,
        // Add real statistics
        actualXP: task.status === 'completed' ? actualXP : undefined,
        attempts: attempts > 0 ? attempts : undefined,
        passCount: passCount > 0 ? passCount : undefined
      };
    });

    // Update program metadata if needed
    if (program.metadata?.totalXP !== totalXP) {
      await programRepo.update?.(programId, {
        metadata: {
          ...program.metadata,
          totalXP: totalXP
        }
      });
    }

    // Load scenario info for career details
    const scenario = await scenarioRepo.findById(scenarioId);

    // Return data in format expected by frontend
    const responseData = {
      id: program.id,
      scenarioId: program.scenarioId,
      userId: program.userId,
      status: program.status,
      createdAt: program.createdAt,
      completedAt: program.completedAt,
      currentTaskIndex: program.currentTaskIndex,
      taskIds: taskIds,
      tasks: tasksSummary,
      totalTasks: tasks.length,
      completedTasks: completedCount,
      totalXP: totalXP,
      metadata: program.metadata,
      // Add career info from scenario
      careerType: scenario?.sourceMetadata && (scenario.sourceMetadata as Record<string, unknown>)?.careerType as string || 'unknown',
      scenarioTitle: scenario?.title ?
        (typeof scenario.title === 'object' && scenario.title !== null ?
          (scenario.title as Record<string, string>)[lang] || (scenario.title as Record<string, string>)['en'] || 'Discovery Scenario' :
          scenario.title as string) :
        'Discovery Scenario'
    };

    return NextResponse.json(responseData, { headers });
  } catch (error) {
    console.error('Error in GET /api/discovery/scenarios/[id]/programs/[programId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
