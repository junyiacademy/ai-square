import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    // Get authentication
    const session = await getServerSession();
    
    let userEmail: string | null = null;
    
    if (session?.user?.email) {
      userEmail = session.user.email;
    } else {
      // Check for user info from query params (for viewing history)
      const { searchParams } = new URL(request.url);
      const emailParam = searchParams.get('userEmail');
      
      if (emailParam) {
        userEmail = emailParam;
      } else {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }
    
    
    // Await params before using
    const { programId } = await params;
    
    const programRepo = repositoryFactory.getProgramRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== userEmail) {
      return NextResponse.json(
        { error: 'Program not found or access denied' },
        { status: 404 }
      );
    }
    
    // 1. 先追 program 底下的 task 有哪些
    const tasks = await taskRepo.findByProgram(programId);
    console.log(`1. Program ${programId} has ${tasks.length} tasks:`, tasks.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      hasEvaluation: !!(t as { evaluation?: unknown }).evaluation
    })));
    
    // 2. 這些 task 的 evaluation 有誰？
    const completedTasks = tasks.filter(t => t.status === 'completed');
    console.log(`2. Completed tasks (${completedTasks.length}):`, completedTasks.map(t => {
      const taskWithEval = t as { evaluation?: { id?: string; score?: number; metadata?: unknown } };
      return {
        taskId: t.id,
        evaluationId: taskWithEval.evaluation?.id,
        score: taskWithEval.evaluation?.score,
        metadata: taskWithEval.evaluation?.metadata
      };
    }));
    
    // Get evaluations for this program
    const evaluations = await evaluationRepo.findByProgram(programId);
    console.log('Existing program evaluations:', {
      count: evaluations.length,
      types: evaluations.map(e => e.evaluationType),
      ids: evaluations.map(e => e.id)
    });
    
    // Find the discovery_complete evaluation
    const evaluation = evaluations.find(e => e.evaluationType === 'discovery_complete');
    
    // If no evaluation exists
    if (!evaluation) {
      console.log('No evaluation found, creating synthetic one...');
      
      // 3. 根據這些 log 跟 evaluation 建立 completion evaluation
      // Calculate metrics from task evaluations
      let totalXP = 0;
      let totalScore = 0;
      let validScoreCount = 0;
      
      // Create task evaluations array
      const taskEvaluations = completedTasks.map(task => {
        const taskWithEval = task as { evaluation?: { score?: number; metadata?: { skillsImproved?: string[] } }; interactions?: { type: string }[] };
        const score = taskWithEval.evaluation?.score || 0;
        const xp = taskWithEval.evaluation?.score || 0; // Using score as XP
        const attempts = taskWithEval.interactions?.filter(i => i.type === 'user_input').length || 1;
        const skills = taskWithEval.evaluation?.metadata?.skillsImproved || [];
        
        if (score > 0) {
          totalXP += xp;
          totalScore += score;
          validScoreCount++;
        }
        
        console.log(`Task ${task.title}: score=${score}, xp=${xp}, attempts=${attempts}`);
        
        return {
          taskId: task.id,
          taskTitle: task.title || 'Task',
          taskType: task.type || 'question',
          score: score,
          xpEarned: xp,
          attempts: attempts,
          skillsImproved: skills
        };
      });
      
      const avgScore = validScoreCount > 0 ? Math.round(totalScore / validScoreCount) : 0;
      
      // Calculate time spent from interactions
      const timeSpentSeconds = completedTasks.reduce((sum, task) => {
        const taskWithInteractions = task as { interactions?: { context?: { timeSpent?: number } }[] };
        const interactions = taskWithInteractions.interactions || [];
        const time = interactions.reduce((taskTime, interaction) => {
          const t = interaction.context?.timeSpent || 0;
          return taskTime + t;
        }, 0);
        return sum + time;
      }, 0);
      
      // Calculate days used from program start to last task completion
      let daysUsed = 0;
      if ((program.createdAt || program.startedAt) && completedTasks.length > 0) {
        const startDate = new Date(program.createdAt || program.startedAt!);
        const lastCompletionDate = completedTasks.reduce((latest, task) => {
          if (task.completedAt) {
            const taskDate = new Date(task.completedAt);
            return taskDate > latest ? taskDate : latest;
          }
          return latest;
        }, startDate);
        
        const timeDiff = lastCompletionDate.getTime() - startDate.getTime();
        daysUsed = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Convert to days
      }
      
      console.log('Calculated metrics:', {
        totalXP,
        avgScore,
        timeSpentSeconds,
        daysUsed,
        taskEvaluations: taskEvaluations.length
      });
      
      // Return synthetic evaluation data
      return NextResponse.json({
        evaluation: {
          id: 'synthetic-' + programId,
          programId,
          evaluationType: 'discovery_complete',
          overallScore: avgScore,
          totalXP,
          totalTasks: tasks.length,
          completedTasks: completedTasks.length,
          timeSpentSeconds,
          daysUsed,
          taskEvaluations,
          skillImprovements: [],
          achievementsUnlocked: [],
          createdAt: new Date().toISOString(),
          isNew: true
        },
        program,
        debug: {
          tasksFound: tasks.length,
          completedTasks: completedTasks.length,
          taskDetails: taskEvaluations
        }
      });
    }
    
    // Return existing evaluation with metadata properly exposed
    const evaluationData = {
      ...evaluation,
      // Expose metadata fields at top level for compatibility
      overallScore: evaluation.metadata?.overallScore || evaluation.score || 0,
      totalXP: evaluation.metadata?.totalXP || 0,
      totalTasks: evaluation.metadata?.totalTasks || 0,
      completedTasks: evaluation.metadata?.completedTasks || 0,
      timeSpentSeconds: evaluation.metadata?.timeSpentSeconds || 0,
      daysUsed: evaluation.metadata?.daysUsed || 0,
      taskEvaluations: evaluation.metadata?.taskEvaluations || [],
      skillImprovements: evaluation.metadata?.skillImprovements || [],
      achievementsUnlocked: evaluation.metadata?.achievementsUnlocked || [],
      qualitativeFeedback: evaluation.metadata?.qualitativeFeedback || null,
      qualitativeFeedbackVersions: evaluation.metadata?.qualitativeFeedbackVersions || {}
    };
    
    return NextResponse.json({ 
      evaluation: evaluationData,
      program
    });
  } catch (error) {
    console.error('Error getting Discovery evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to load evaluation' },
      { status: 500 }
    );
  }
}