import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
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
        ksaScores.knowledge += evaluation.metadata.ksaScores.knowledge || 0;
        ksaScores.skills += evaluation.metadata.ksaScores.skills || 0;
        ksaScores.attitudes += evaluation.metadata.ksaScores.attitudes || 0;
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
    
    tasks.forEach(task => {
      // Calculate time from task interactions
      if (task.interactions && task.interactions.length > 0) {
        const firstInteraction = task.interactions[0];
        const lastInteraction = task.interactions[task.interactions.length - 1];
        const taskTime = Math.floor(
          (new Date(lastInteraction.timestamp).getTime() - new Date(firstInteraction.timestamp).getTime()) / 1000
        );
        totalTimeSeconds += taskTime;
        
        // Count user interactions
        conversationCount += task.interactions.filter(i => i.type === 'user_input').length;
      }
    });
    
    // Generate checksum for verification
    const syncChecksum = await generateSyncChecksum(tasks);
    
    // Debug information
    const debugInfo = {
      programId,
      totalTasks: tasks.length,
      evaluatedTasks: evaluatedTasks.length,
      taskDetails: tasks.map(t => ({
        id: t.id,
        hasEvaluation: !!t.evaluationId,
        status: t.status,
        interactionCount: t.interactions?.length || 0
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
    
    if (program.evaluationId) {
      // Update existing evaluation
      const existing = await evalRepo.findById(program.evaluationId);
      if (existing) {
        updateReason = 'score_update';
        programEvaluation = await evalRepo.update(program.evaluationId, {
          score: overallScore,
          metadata: {
            ...existing.metadata,
            taskEvaluationIds: evaluatedTasks.map(te => te.evaluation!.id),
            overallScore,
            domainScores,
            ksaScores,
            evaluatedTasks: evaluatedTasks.length,
            totalTasks,
            totalTimeSeconds,
            conversationCount,
            // Verification fields
            isLatest: true,
            syncChecksum,
            evaluatedTaskCount: evaluatedTasks.length,
            lastSyncedAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
            // Preserve qualitative feedback but mark as potentially invalid
            qualitativeFeedback: existing.metadata?.qualitativeFeedback ? 
              Object.entries(existing.metadata.qualitativeFeedback).reduce((acc, [lang, feedback]) => ({
                ...acc,
                [lang]: { ...feedback as any, isValid: false }
              }), {}) : {}
          }
        });
      }
    }
    
    if (!programEvaluation) {
      // Create new evaluation
      programEvaluation = await evalRepo.create({
        targetType: 'program',
        targetId: program.id,
        evaluationType: 'pbl_completion',
        score: overallScore,
        metadata: {
          taskEvaluationIds: evaluatedTasks.map(te => te.evaluation!.id),
          overallScore,
          domainScores,
          ksaScores,
          evaluatedTasks: evaluatedTasks.length,
          totalTasks,
          totalTimeSeconds,
          conversationCount,
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
      await programRepo.update(programId, {
        evaluationId: programEvaluation.id,
        status: 'completed' as const,
        completedAt: program.completedAt || new Date().toISOString()
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
  program: any,
  evaluation: any,
  taskRepo: any
): Promise<{ needsUpdate: boolean; reason: string; debug: any }> {
  const debug: any = {
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
  const currentEvaluatedCount = tasks.filter((t: any) => t.evaluationId).length;
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
  const lastSync = new Date(evaluation.metadata?.lastSyncedAt || 0);
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
    const { getProgramRepository, getEvaluationRepository, getTaskRepository } = await import('@/lib/implementations/gcs-v2');
    const programRepo = getProgramRepository();
    const evalRepo = getEvaluationRepository();
    const taskRepo = getTaskRepository();
    
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
    
    if (program.evaluationId) {
      evaluation = await evalRepo.findById(program.evaluationId);
      
      if (evaluation) {
        // Verify evaluation status
        verificationResult = await verifyEvaluationStatus(program, evaluation, taskRepo);
        
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