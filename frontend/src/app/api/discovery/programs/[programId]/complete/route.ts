import { NextRequest, NextResponse } from 'next/server';
import { 
  getProgramRepository, 
  getTaskRepository,
  getEvaluationRepository,
  getScenarioRepository 
} from '@/lib/implementations/gcs-v2';
import { getServerSession } from '@/lib/auth/session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    // Get authentication
    const session = await getServerSession();
    
    let user: { email: string; id?: string } | null = null;
    
    if (session?.user) {
      user = session.user;
    } else {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Await params before using
    const { programId } = await params;
    
    const programRepo = getProgramRepository();
    const taskRepo = getTaskRepository();
    const evaluationRepo = getEvaluationRepository();
    const scenarioRepo = getScenarioRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== user.email) {
      return NextResponse.json(
        { error: 'Program not found or access denied' },
        { status: 404 }
      );
    }
    
    // Check if program is already completed
    if (program.status === 'completed' && program.metadata?.evaluationId) {
      console.log('Program already completed with evaluation:', program.metadata.evaluationId);
      
      // Return existing evaluation
      const existingEvaluation = await evaluationRepo.findById(program.metadata.evaluationId as string);
      if (existingEvaluation) {
        return NextResponse.json({ 
          success: true,
          evaluationId: existingEvaluation.id,
          alreadyCompleted: true
        });
      }
    }
    
    // Get all tasks for this program
    const tasks = await taskRepo.findByProgram(programId);
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    // Calculate metrics
    const totalXP = completedTasks.reduce((sum, task) => {
      return sum + (task.metadata?.xpEarned || 0);
    }, 0);
    
    const totalScore = completedTasks.reduce((sum, task) => {
      return sum + (task.metadata?.score || 0);
    }, 0);
    
    const avgScore = completedTasks.length > 0 ? Math.round(totalScore / completedTasks.length) : 0;
    
    // Calculate time spent
    const timeSpentSeconds = completedTasks.reduce((sum, task) => {
      const interactions = task.interactions || [];
      const timeSpent = interactions.reduce((taskTime, interaction) => {
        return taskTime + (interaction.metadata?.timeSpent || 0);
      }, 0);
      return sum + timeSpent;
    }, 0);
    
    // Create task evaluations
    const taskEvaluations = completedTasks.map(task => {
      const interactions = task.interactions || [];
      const attempts = interactions.filter(i => i.type === 'user_input').length;
      const passCount = interactions.filter(i => 
        i.type === 'ai_response' && i.content?.completed
      ).length;
      
      return {
        taskId: task.id,
        taskTitle: task.title || 'Task',
        taskType: task.metadata?.taskType || 'question',
        score: task.metadata?.score || 0,
        xpEarned: task.metadata?.xpEarned || 0,
        attempts,
        passCount,
        skillsImproved: task.metadata?.skillsImproved || []
      };
    });
    
    // Get scenario info for career type
    const scenario = await scenarioRepo.findById(program.scenarioId);
    const careerType = program.metadata?.careerType || scenario?.metadata?.careerType || 'general';
    
    // Create evaluation
    console.log('Creating Discovery evaluation with data:', {
      targetType: 'program',
      targetId: programId,
      evaluationType: 'discovery_complete',
      score: avgScore,
      totalXP,
      totalTasks: tasks.length,
      completedTasks: completedTasks.length
    });
    
    const evaluation = await evaluationRepo.create({
      targetType: 'program',
      targetId: programId,
      evaluationType: 'discovery_complete',
      score: avgScore,
      userId: user.email,
      metadata: {
        programId,
        scenarioId: program.scenarioId,
        scenarioTitle: scenario?.title,
        careerType,
        overallScore: avgScore,
        totalXP,
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        timeSpentSeconds,
        taskEvaluations,
        completedAt: new Date().toISOString()
      }
    });
    
    console.log('Evaluation created successfully:', evaluation.id);
    
    // Update program to mark as completed
    await programRepo.update(programId, { 
      status: 'completed',
      metadata: {
        ...program.metadata,
        evaluationId: evaluation.id,
        completedAt: new Date().toISOString(),
        totalXP,
        finalScore: avgScore
      }
    });
    
    // Mark program as completed
    await programRepo.complete(programId);
    
    return NextResponse.json({ 
      success: true,
      evaluationId: evaluation.id,
      score: avgScore,
      totalXP
    });
  } catch (error) {
    console.error('Error completing Discovery program:', error);
    return NextResponse.json(
      { error: 'Failed to complete program' },
      { status: 500 }
    );
  }
}