import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import crypto from 'crypto';
// Removed unused imports

// Helper function to generate sync checksum
interface TaskWithEvaluation {
  id: string;
  evaluationId?: string;
  score?: number;
  ksaMapping?: Record<string, unknown>;
  completedAt?: string;
}

async function generateSyncChecksum(tasks: TaskWithEvaluation[]): Promise<string> {
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

// POST - 計算或更新 Program Evaluation
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
    
    // Use unified architecture
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const evalRepo = repositoryFactory.getEvaluationRepository();
    
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
        if (task.metadata?.evaluationId) {
          const evaluation = await evalRepo.findById(task.metadata.evaluationId as string);
          return { task, evaluation };
        }
        return { task, evaluation: null };
      })
    );
    
    // Calculate metrics
    const evaluatedTasks = taskEvaluations.filter(te => te.evaluation !== null);
    const totalTasks = tasks.length;
    
    // Calculate overall score
    const overallScore = evaluatedTasks.length > 0
      ? Math.round(
          evaluatedTasks.reduce((sum, te) => sum + (te.evaluation?.score || 0), 0) / evaluatedTasks.length
        )
      : 0;
    
    // Calculate domain scores
    const domainScores: Record<string, number> = {};
    const domainCounts: Record<string, number> = {};
    
    evaluatedTasks.forEach(({ evaluation }) => {
      if (evaluation?.metadata?.domainScores) {
        Object.entries(evaluation.metadata.domainScores).forEach(([domain, score]) => {
          if (!domainScores[domain]) {
            domainScores[domain] = 0;
            domainCounts[domain] = 0;
          }
          domainScores[domain] += score as number;
          domainCounts[domain]++;
        });
      }
    });
    
    // Average domain scores
    Object.keys(domainScores).forEach(domain => {
      domainScores[domain] = Math.round(domainScores[domain] / domainCounts[domain]);
    });
    
    // Calculate KSA scores
    const ksaScores = {
      knowledge: 0,
      skills: 0,
      attitudes: 0
    };
    
    let ksaCount = 0;
    evaluatedTasks.forEach(({ evaluation }) => {
      if (evaluation?.metadata?.ksaScores) {
        const scores = evaluation.metadata.ksaScores as Record<string, number>;
        ksaScores.knowledge += scores.knowledge || 0;
        ksaScores.skills += scores.skills || 0;
        ksaScores.attitudes += scores.attitudes || 0;
        ksaCount++;
      }
    });
    
    if (ksaCount > 0) {
      ksaScores.knowledge = Math.round(ksaScores.knowledge / ksaCount);
      ksaScores.skills = Math.round(ksaScores.skills / ksaCount);
      ksaScores.attitudes = Math.round(ksaScores.attitudes / ksaCount);
    }
    
    // Calculate total time and conversation count
    let totalTimeSeconds = 0;
    let conversationCount = 0;
    
    // Get interactions for each task to calculate time
    for (const task of tasks) {
      const taskWithInteractions = await taskRepo.getTaskWithInteractions?.(task.id);
      if (taskWithInteractions?.interactions && taskWithInteractions.interactions.length > 0) {
        const interactions = taskWithInteractions.interactions;
        const firstInteraction = interactions[0];
        const lastInteraction = interactions[interactions.length - 1];
        const taskTime = Math.floor(
          (new Date(lastInteraction.timestamp).getTime() - new Date(firstInteraction.timestamp).getTime()) / 1000
        );
        totalTimeSeconds += taskTime;
        
        // Count user interactions
        conversationCount += interactions.filter(i => i.type === 'user_input').length;
      }
    }
    
    // Generate checksum for verification
    // Transform tasks to TaskWithEvaluation format
    const tasksWithEvaluation: TaskWithEvaluation[] = tasks.map(t => ({
      id: t.id,
      evaluationId: t.metadata?.evaluationId as string | undefined,
      score: t.score,
      completedAt: t.completedAt
    }));
    const syncChecksum = await generateSyncChecksum(tasksWithEvaluation);
    
    // Debug information
    const debugInfo = {
      programId,
      totalTasks: tasks.length,
      evaluatedTasks: evaluatedTasks.length,
      taskDetails: tasks.map(t => ({
        id: t.id,
        hasEvaluation: !!t.metadata?.evaluationId,
        status: t.status,
        interactionCount: 0 // interactions not available on Task type
      })),
      calculatedScores: {
        overall: overallScore,
        domains: domainScores,
        ksa: ksaScores
      },
      syncChecksum,
      calculatedAt: new Date().toISOString()
    };
    
    console.log('Program evaluation calculation debug:', debugInfo);
    
    // Check if program already has an evaluation
    let programEvaluation;
    let updateReason = 'new_evaluation';
    
    const programEvaluationId = program.metadata?.evaluationId as string | undefined;
    if (programEvaluationId) {
      // Update existing evaluation
      const existing = await evalRepo.findById(programEvaluationId);
      if (existing) {
        updateReason = 'score_update';
        // TODO: IEvaluationRepository doesn't have update method - need to create new evaluation
        programEvaluation = existing; // Use existing evaluation for now
      }
    }
    
    if (!programEvaluation) {
      // Create new evaluation
      programEvaluation = await evalRepo.create({
        userId: session.user.email,
        programId: program.id,
        mode: 'pbl',
        evaluationType: 'program',
        evaluationSubtype: 'pbl_completion',
        score: overallScore,
        maxScore: 100,
        timeTakenSeconds: totalTimeSeconds,
        dimensionScores: domainScores,
        feedbackText: '',
        feedbackData: {},
        aiAnalysis: {},
        createdAt: new Date().toISOString(),
        pblData: {
          taskEvaluationIds: evaluatedTasks.map(te => te.evaluation!.id),
          ksaScores,
          evaluatedTasks: evaluatedTasks.length,
          totalTasks,
          conversationCount
        },
        discoveryData: {},
        assessmentData: {},
        metadata: {
          overallScore,
          totalTimeSeconds,
          // Verification fields
          isLatest: true,
          syncChecksum,
          evaluatedTaskCount: evaluatedTasks.length,
          lastSyncedAt: new Date().toISOString(),
          // Language support
          qualitativeFeedback: {},
          generatedLanguages: []
        }
      });
      
      // Update program with evaluation ID
      await programRepo.update?.(programId, {
        status: 'completed' as const,
        completedAt: new Date().toISOString(),
        metadata: {
          ...program.metadata,
          evaluationId: programEvaluation.id,
          completedAt: program.completedAt || new Date().toISOString()
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      evaluation: programEvaluation,
      debug: {
        updateReason,
        ...debugInfo
      }
    });
    
  } catch (error) {
    console.error('Error completing program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete program' },
      { status: 500 }
    );
  }
}

// Helper function for verification
async function verifyEvaluationStatus(
  program: { id: string },
  evaluation: { id: string; metadata?: Record<string, unknown> },
  taskRepo: { findByProgram: (id: string) => Promise<TaskWithEvaluation[]> }
): Promise<{ needsUpdate: boolean; reason: string; debug: Record<string, unknown> }> {
  const debug: Record<string, unknown> = {
    evaluationId: evaluation.id,
    isLatest: evaluation.metadata?.isLatest,
    lastSyncedAt: evaluation.metadata?.lastSyncedAt
  };
  
  // Layer 1: Flag check
  if (!evaluation.metadata?.isLatest) {
    return { 
      needsUpdate: true, 
      reason: 'flag_outdated',
      debug: { ...debug, flagCheck: 'failed' }
    };
  }
  
  // Layer 2: Task count check
  const tasks = await taskRepo.findByProgram(program.id);
  const currentEvaluatedCount = tasks.filter((t) => t.evaluationId).length;
  debug.taskCountCheck = {
    stored: evaluation.metadata?.evaluatedTaskCount,
    current: currentEvaluatedCount
  };
  
  if (currentEvaluatedCount !== evaluation.metadata?.evaluatedTaskCount) {
    return { 
      needsUpdate: true, 
      reason: 'task_count_mismatch',
      debug
    };
  }
  
  // Layer 3: Checksum verification (based on time since last sync)
  const lastSync = new Date((evaluation.metadata?.lastSyncedAt as string | number) || 0);
  const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
  debug.hoursSinceSync = hoursSinceSync;
  
  const shouldCheckChecksum = 
    hoursSinceSync > 48 ? true :
    hoursSinceSync > 24 ? Math.random() < 0.2 :
    Math.random() < 0.05;
  
  if (shouldCheckChecksum) {
    const currentChecksum = await generateSyncChecksum(tasks);
    debug.checksumVerification = {
      stored: evaluation.metadata?.syncChecksum,
      current: currentChecksum,
      match: currentChecksum === evaluation.metadata?.syncChecksum
    };
    
    if (currentChecksum !== evaluation.metadata?.syncChecksum) {
      return { 
        needsUpdate: true, 
        reason: 'checksum_mismatch',
        debug
      };
    }
  } else {
    debug.checksumVerification = 'skipped';
  }
  
  return { needsUpdate: false, reason: 'up_to_date', debug };
}

// GET - 獲取 Program Evaluation 並確保有指定語言的內容
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'en';
    
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Use unified architecture
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const programRepo = repositoryFactory.getProgramRepository();
    const evalRepo = repositoryFactory.getEvaluationRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    
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
    
    let evaluation = null;
    let verificationResult = null;
    
    const evaluationId = program.metadata?.evaluationId as string | undefined;
    if (evaluationId) {
      evaluation = await evalRepo.findById(evaluationId);
      
      if (evaluation) {
        // Verify evaluation status
        // Create a wrapper to adapt Task[] to TaskWithEvaluation[]
        const taskRepoAdapter = {
          findByProgram: async (id: string): Promise<TaskWithEvaluation[]> => {
            const tasks = await taskRepo.findByProgram(id);
            return tasks.map(t => ({
              id: t.id,
              score: t.score,
              completedAt: t.completedAt
            }));
          }
        };
        verificationResult = await verifyEvaluationStatus(program, evaluation, taskRepoAdapter);
        
        if (verificationResult.needsUpdate) {
          console.log('Evaluation verification failed:', verificationResult);
          
          // Trigger recalculation
          const recalcResponse = await POST(request, { params });
          const recalcData = await recalcResponse.json();
          
          if (recalcData.success) {
            evaluation = recalcData.evaluation;
          }
        }
      }
    } else {
      // No evaluation yet, trigger calculation
      const calcResponse = await POST(request, { params });
      const calcData = await calcResponse.json();
      
      if (calcData.success) {
        evaluation = calcData.evaluation;
      }
    }
    
    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: 'Failed to get or create evaluation' },
        { status: 500 }
      );
    }
    
    // Check if qualitative feedback exists for the requested language
    const langFeedback = evaluation.metadata?.qualitativeFeedback?.[language];
    const hasValidFeedback = langFeedback?.isValid;
    
    return NextResponse.json({
      success: true,
      evaluation,
      needsFeedbackGeneration: !hasValidFeedback && evaluation.metadata?.evaluatedTasks > 0,
      currentLanguage: language,
      debug: {
        verificationResult,
        feedbackStatus: {
          exists: !!langFeedback,
          isValid: langFeedback?.isValid,
          generatedAt: langFeedback?.generatedAt
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching program evaluation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch evaluation' },
      { status: 500 }
    );
  }
}