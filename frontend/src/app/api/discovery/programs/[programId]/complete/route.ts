import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getLanguageFromHeader } from '@/lib/utils/language';
import crypto from 'crypto';

// Helper function to generate sync checksum
async function generateSyncChecksum(tasks: any[]): Promise<string> {
  const checksumData = tasks
    .filter(t => t.evaluationId)
    .map(t => ({
      id: t.id,
      evaluationId: t.evaluationId,
      completedAt: t.completedAt
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  
  return crypto
    .createHash('md5')
    .update(JSON.stringify(checksumData))
    .digest('hex')
    .substring(0, 8);
}

// POST - 計算或更新 Discovery Program Evaluation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;
    
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get language from request
    const language = getLanguageFromHeader(request.headers.get('Accept-Language'));
    
    // Use unified architecture
    const { getProgramRepository, getTaskRepository, getEvaluationRepository } = await import('@/lib/implementations/gcs-v2');
    const programRepo = getProgramRepository();
    const taskRepo = getTaskRepository();
    const evalRepo = getEvaluationRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Verify the program belongs to the user
    if (program.userId !== session.user.email) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Get all tasks and their evaluations
    const tasks = await taskRepo.findByProgram(programId);
    const taskEvaluations = await Promise.all(
      tasks.map(async (task) => {
        if (task.evaluationId) {
          const evaluation = await evalRepo.findById(task.evaluationId);
          return { task, evaluation };
        }
        return { task, evaluation: null };
      })
    );
    
    // Calculate metrics
    const evaluatedTasks = taskEvaluations.filter(te => te.evaluation !== null);
    const totalTasks = tasks.length;
    const completedTasks = evaluatedTasks.length;
    
    // Calculate overall score
    const overallScore = evaluatedTasks.length > 0
      ? Math.round(
          evaluatedTasks.reduce((sum, te) => sum + (te.evaluation?.score || 0), 0) / evaluatedTasks.length
        )
      : 0;
    
    // Calculate total XP earned
    const totalXP = evaluatedTasks.reduce((sum, te) => {
      return sum + (te.evaluation?.metadata?.xpEarned || 0);
    }, 0);
    
    // Calculate skill improvements
    const skillImprovements: Record<string, number> = {};
    evaluatedTasks.forEach(({ evaluation }) => {
      if (evaluation?.metadata?.skillsImproved) {
        evaluation.metadata.skillsImproved.forEach((skill: { skillId: string; improvement: number }) => {
          if (!skillImprovements[skill.skillId]) {
            skillImprovements[skill.skillId] = 0;
          }
          skillImprovements[skill.skillId] += skill.improvement;
        });
      }
    });
    
    // Collect achievements unlocked
    const achievementsUnlocked: string[] = [];
    evaluatedTasks.forEach(({ evaluation }) => {
      if (evaluation?.metadata?.achievementsUnlocked) {
        achievementsUnlocked.push(...evaluation.metadata.achievementsUnlocked);
      }
    });
    
    // Generate sync checksum
    const syncChecksum = await generateSyncChecksum(tasks);
    
    // Check if program-level evaluation already exists
    const existingEvaluations = await evalRepo.findByTarget('program', programId);
    const existingEval = existingEvaluations.find(e => e.evaluationType === 'discovery_completion');
    
    let programEvaluation;
    
    if (existingEval) {
      // Update existing evaluation
      programEvaluation = await evalRepo.update(existingEval.id, {
        score: overallScore,
        metadata: {
          ...existingEval.metadata,
          totalTasks,
          completedTasks,
          totalXP,
          skillImprovements,
          achievementsUnlocked: [...new Set(achievementsUnlocked)], // Remove duplicates
          syncChecksum,
          language,
          lastUpdated: new Date().toISOString()
        }
      });
    } else {
      // Create new program-level evaluation
      programEvaluation = await evalRepo.create({
        targetType: 'program',
        targetId: programId,
        evaluationType: 'discovery_completion',
        score: overallScore,
        feedback: `Discovery program completed with ${completedTasks}/${totalTasks} tasks. Total XP earned: ${totalXP}`,
        metadata: {
          totalTasks,
          completedTasks,
          totalXP,
          skillImprovements,
          achievementsUnlocked: [...new Set(achievementsUnlocked)],
          syncChecksum,
          language,
          evaluatedAt: new Date().toISOString()
        }
      });
    }
    
    // Update program status to completed if all tasks are done
    if (completedTasks === totalTasks && totalTasks > 0) {
      await programRepo.update(programId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        evaluationId: programEvaluation.id
      });
    }
    
    // Return evaluation result
    return NextResponse.json({
      success: true,
      evaluation: {
        id: programEvaluation.id,
        score: programEvaluation.score,
        totalTasks,
        completedTasks,
        totalXP,
        skillImprovements,
        achievementsUnlocked: [...new Set(achievementsUnlocked)],
        taskEvaluations: evaluatedTasks.map(({ task, evaluation }) => ({
          taskId: task.id,
          taskTitle: task.title,
          score: evaluation?.score || 0,
          xpEarned: evaluation?.metadata?.xpEarned || 0,
          skillsImproved: evaluation?.metadata?.skillsImproved || [],
          evaluatedAt: evaluation?.createdAt
        })),
        syncChecksum,
        evaluatedAt: programEvaluation.metadata.evaluatedAt || programEvaluation.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error completing Discovery program:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - 取得 Program Evaluation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;
    
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get language from request
    const language = getLanguageFromHeader(request.headers.get('Accept-Language'));
    
    // Use unified architecture
    const { getProgramRepository, getTaskRepository, getEvaluationRepository } = await import('@/lib/implementations/gcs-v2');
    const programRepo = getProgramRepository();
    const taskRepo = getTaskRepository();
    const evalRepo = getEvaluationRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Verify the program belongs to the user
    if (program.userId !== session.user.email) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Get existing program evaluation
    const existingEvaluations = await evalRepo.findByTarget('program', programId);
    const existingEval = existingEvaluations.find(e => e.evaluationType === 'discovery_completion');
    
    if (!existingEval) {
      // No evaluation exists, trigger creation
      const createUrl = new URL(request.url);
      const createResponse = await fetch(createUrl.toString(), {
        method: 'POST',
        headers: {
          'Cookie': request.headers.get('Cookie') || '',
          'Accept-Language': request.headers.get('Accept-Language') || 'en',
        },
      });
      
      if (!createResponse.ok) {
        return NextResponse.json(
          { success: false, error: 'Failed to create program evaluation' },
          { status: 500 }
        );
      }
      
      return createResponse;
    }
    
    // Get all tasks for detailed information
    const tasks = await taskRepo.findByProgram(programId);
    const taskEvaluations = await Promise.all(
      tasks.map(async (task) => {
        if (task.evaluationId) {
          const evaluation = await evalRepo.findById(task.evaluationId);
          return { task, evaluation };
        }
        return { task, evaluation: null };
      })
    );
    
    const evaluatedTasks = taskEvaluations.filter(te => te.evaluation !== null);
    
    // Return existing evaluation with task details
    return NextResponse.json({
      success: true,
      evaluation: {
        id: existingEval.id,
        score: existingEval.score,
        totalTasks: existingEval.metadata?.totalTasks || tasks.length,
        completedTasks: existingEval.metadata?.completedTasks || evaluatedTasks.length,
        totalXP: existingEval.metadata?.totalXP || 0,
        skillImprovements: existingEval.metadata?.skillImprovements || {},
        achievementsUnlocked: existingEval.metadata?.achievementsUnlocked || [],
        taskEvaluations: evaluatedTasks.map(({ task, evaluation }) => ({
          taskId: task.id,
          taskTitle: task.title,
          score: evaluation?.score || 0,
          xpEarned: evaluation?.metadata?.xpEarned || 0,
          skillsImproved: evaluation?.metadata?.skillsImproved || [],
          evaluatedAt: evaluation?.createdAt
        })),
        syncChecksum: existingEval.metadata?.syncChecksum,
        evaluatedAt: existingEval.metadata?.evaluatedAt || existingEval.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error getting Discovery program evaluation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}