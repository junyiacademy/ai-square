import { NextRequest, NextResponse } from 'next/server';
import { getProgramRepository, getEvaluationRepository, getTaskRepository } from '@/lib/implementations/gcs-v2';
import { IEvaluation } from '@/types/unified-learning';

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

    // Get repositories
    const programRepo = getProgramRepository();
    const evaluationRepo = getEvaluationRepository();
    const taskRepo = getTaskRepository();
    
    // Get program to check if it exists
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Check if we already have a program-level evaluation
    const programEvaluations = await evaluationRepo.findByTarget('program', programId);
    let programEvaluation = programEvaluations.find(e => e.evaluationType === 'pbl_completion');
    
    // If no program evaluation exists, or if we need to update it
    if (!programEvaluation || !program.completedAt) {
      // Get all task evaluations
      const taskEvaluations = await evaluationRepo.findByProgram(programId);
      const taskEvaluationsFiltered = taskEvaluations.filter(e => e.targetType === 'task');
      
      // Get task details
      const taskDetails = await Promise.all(
        (program.taskIds || []).map(async (taskId) => {
          const task = await taskRepo.findById(taskId);
          const evaluation = taskEvaluationsFiltered.find(e => e.targetId === taskId);
          return {
            taskId,
            task,
            evaluation,
            completed: task?.status === 'completed'
          };
        })
      );
      
      // Calculate aggregated scores
      const evaluatedTasks = taskDetails.filter(t => t.evaluation).length;
      const completedTasks = taskDetails.filter(t => t.completed).length;
      const totalTasks = program.taskIds?.length || 0;
      
      if (evaluatedTasks > 0) {
        // Calculate averages from task evaluations
        let totalScore = 0;
        const domainScores: Record<string, number[]> = {};
        const ksaScores = { knowledge: [] as number[], skills: [] as number[], attitudes: [] as number[] };
        
        taskEvaluationsFiltered.forEach(evaluation => {
          if (evaluation.score !== undefined) {
            totalScore += evaluation.score;
          }
          
          // Collect domain scores
          if (evaluation.metadata?.domainScores) {
            Object.entries(evaluation.metadata.domainScores).forEach(([domain, score]) => {
              if (!domainScores[domain]) domainScores[domain] = [];
              domainScores[domain].push(score as number);
            });
          }
          
          // Collect KSA scores
          if (evaluation.metadata?.ksaScores) {
            const ksa = evaluation.metadata.ksaScores as any;
            if (ksa.knowledge !== undefined) ksaScores.knowledge.push(ksa.knowledge);
            if (ksa.skills !== undefined) ksaScores.skills.push(ksa.skills);
            if (ksa.attitudes !== undefined) ksaScores.attitudes.push(ksa.attitudes);
          }
        });
        
        // Calculate averages
        const avgScore = Math.round(totalScore / evaluatedTasks);
        const avgDomainScores: Record<string, number> = {};
        Object.entries(domainScores).forEach(([domain, scores]) => {
          avgDomainScores[domain] = scores.length > 0 
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;
        });
        
        const avgKsaScores = {
          knowledge: ksaScores.knowledge.length > 0 
            ? Math.round(ksaScores.knowledge.reduce((a, b) => a + b, 0) / ksaScores.knowledge.length)
            : 0,
          skills: ksaScores.skills.length > 0
            ? Math.round(ksaScores.skills.reduce((a, b) => a + b, 0) / ksaScores.skills.length)
            : 0,
          attitudes: ksaScores.attitudes.length > 0
            ? Math.round(ksaScores.attitudes.reduce((a, b) => a + b, 0) / ksaScores.attitudes.length)
            : 0
        };
        
        // Create or update program evaluation
        const newProgramEvaluation: Omit<IEvaluation, 'id'> = {
          targetType: 'program',
          targetId: programId,
          evaluationType: 'pbl_completion',
          score: avgScore,
          createdAt: new Date().toISOString(),
          metadata: {
            scenarioId,
            userId: userEmail,
            totalTasks,
            completedTasks,
            evaluatedTasks,
            domainScores: avgDomainScores,
            ksaScores: avgKsaScores,
            taskEvaluations: taskEvaluationsFiltered.map(e => e.id)
          }
        };
        
        // Save the program evaluation
        programEvaluation = await evaluationRepo.create(newProgramEvaluation);
      }
    }
    
    // Build response data
    const completionData = {
      programId,
      scenarioId,
      userEmail,
      status: program.completedAt ? 'completed' : 'in_progress',
      startedAt: program.startedAt,
      updatedAt: program.updatedAt || program.startedAt,
      completedAt: program.completedAt,
      totalTasks: program.taskIds?.length || 0,
      completedTasks: programEvaluation?.metadata?.completedTasks || 0,
      evaluatedTasks: programEvaluation?.metadata?.evaluatedTasks || 0,
      overallScore: programEvaluation?.score || 0,
      domainScores: programEvaluation?.metadata?.domainScores || {},
      ksaScores: programEvaluation?.metadata?.ksaScores || {},
      programEvaluationId: programEvaluation?.id
    };

    // If taskId is provided, add task-specific data
    if (taskId) {
      const taskEvaluations = await evaluationRepo.findByTarget('task', taskId);
      const taskEvaluation = taskEvaluations[0];
      
      return NextResponse.json({
        success: true,
        data: {
          task: {
            taskId,
            evaluation: taskEvaluation
          },
          program: completionData
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

// PUT - Trigger program completion evaluation
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

    // Get repositories
    const programRepo = getProgramRepository();
    const evaluationRepo = getEvaluationRepository();
    
    // Force recalculation of program evaluation
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Get all task evaluations
    const taskEvaluations = await evaluationRepo.findByProgram(programId);
    const taskEvaluationsFiltered = taskEvaluations.filter(e => e.targetType === 'task');
    
    if (taskEvaluationsFiltered.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No task evaluations to aggregate yet'
      });
    }
    
    // Calculate aggregated scores
    let totalScore = 0;
    const domainScores: Record<string, number[]> = {};
    const ksaScores = { knowledge: [] as number[], skills: [] as number[], attitudes: [] as number[] };
    
    taskEvaluationsFiltered.forEach(evaluation => {
      if (evaluation.score !== undefined) {
        totalScore += evaluation.score;
      }
      
      // Collect domain scores
      if (evaluation.metadata?.domainScores) {
        Object.entries(evaluation.metadata.domainScores).forEach(([domain, score]) => {
          if (!domainScores[domain]) domainScores[domain] = [];
          domainScores[domain].push(score as number);
        });
      }
      
      // Collect KSA scores
      if (evaluation.metadata?.ksaScores) {
        const ksa = evaluation.metadata.ksaScores as any;
        if (ksa.knowledge !== undefined) ksaScores.knowledge.push(ksa.knowledge);
        if (ksa.skills !== undefined) ksaScores.skills.push(ksa.skills);
        if (ksa.attitudes !== undefined) ksaScores.attitudes.push(ksa.attitudes);
      }
    });
    
    // Calculate averages
    const evaluatedTasks = taskEvaluationsFiltered.length;
    const avgScore = Math.round(totalScore / evaluatedTasks);
    const avgDomainScores: Record<string, number> = {};
    Object.entries(domainScores).forEach(([domain, scores]) => {
      avgDomainScores[domain] = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    });
    
    const avgKsaScores = {
      knowledge: ksaScores.knowledge.length > 0 
        ? Math.round(ksaScores.knowledge.reduce((a, b) => a + b, 0) / ksaScores.knowledge.length)
        : 0,
      skills: ksaScores.skills.length > 0
        ? Math.round(ksaScores.skills.reduce((a, b) => a + b, 0) / ksaScores.skills.length)
        : 0,
      attitudes: ksaScores.attitudes.length > 0
        ? Math.round(ksaScores.attitudes.reduce((a, b) => a + b, 0) / ksaScores.attitudes.length)
        : 0
    };
    
    // Create program evaluation
    const programEvaluation: Omit<IEvaluation, 'id'> = {
      targetType: 'program',
      targetId: programId,
      evaluationType: 'pbl_completion',
      score: avgScore,
      createdAt: new Date().toISOString(),
      metadata: {
        scenarioId,
        userId: userEmail,
        totalTasks: program.taskIds?.length || 0,
        completedTasks: program.taskIds?.length || 0,
        evaluatedTasks,
        domainScores: avgDomainScores,
        ksaScores: avgKsaScores,
        taskEvaluations: taskEvaluationsFiltered.map(e => e.id)
      }
    };
    
    // Save the program evaluation
    const saved = await evaluationRepo.create(programEvaluation);
    
    // Update program status to completed if all tasks are evaluated
    if (evaluatedTasks >= (program.taskIds?.length || 0)) {
      await programRepo.update(programId, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Program evaluation created successfully',
      evaluationId: saved.id
    });

  } catch (error) {
    console.error('Error updating completion data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update completion data' },
      { status: 500 }
    );
  }
}