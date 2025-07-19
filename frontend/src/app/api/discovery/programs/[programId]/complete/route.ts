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
    
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
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
    
    // Calculate metrics from interactions
    let totalXP = 0;
    let totalScore = 0;
    let validScoreCount = 0;
    
    completedTasks.forEach(task => {
      const interactions = task.interactions || [];
      // Find the last successful AI response for this task
      const successfulResponses = interactions.filter(i => 
        i.type === 'ai_response' && i.context?.completed === true
      );
      
      if (successfulResponses.length > 0) {
        const lastSuccess = successfulResponses[successfulResponses.length - 1];
        const content = typeof lastSuccess.content === 'string' 
          ? JSON.parse(lastSuccess.content) 
          : lastSuccess.content;
        
        const xpEarned = content.xpEarned || 0;
        const score = content.score || (content.completed ? 100 : 0);
        
        totalXP += xpEarned;
        totalScore += score;
        validScoreCount++;
      }
    });
    
    const avgScore = validScoreCount > 0 ? Math.round(totalScore / validScoreCount) : 0;
    
    // Calculate time spent
    const timeSpentSeconds = completedTasks.reduce((sum, task) => {
      const interactions = task.interactions || [];
      const timeSpent = interactions.reduce((taskTime, interaction) => {
        // Check different possible locations for timeSpent
        const time = interaction.metadata?.timeSpent || 
                    interaction.context?.timeSpent || 
                    0;
        return taskTime + time;
      }, 0);
      return sum + timeSpent;
    }, 0);
    
    // Create task evaluations
    const taskEvaluations = completedTasks.map(task => {
      const interactions = task.interactions || [];
      const attempts = interactions.filter(i => i.type === 'user_input').length;
      const aiResponses = interactions.filter(i => i.type === 'ai_response');
      const passCount = aiResponses.filter(r => r.context?.completed === true).length;
      
      // Get the last successful response for XP and score
      let taskXP = 0;
      let taskScore = 0;
      let skillsImproved = [];
      
      const successfulResponses = aiResponses.filter(r => r.context?.completed === true);
      if (successfulResponses.length > 0) {
        const lastSuccess = successfulResponses[successfulResponses.length - 1];
        const content = typeof lastSuccess.content === 'string' 
          ? JSON.parse(lastSuccess.content) 
          : lastSuccess.content;
        
        taskXP = content.xpEarned || 0;
        taskScore = content.score || (content.completed ? 100 : 0);
        skillsImproved = content.skillsImproved || [];
      }
      
      return {
        taskId: task.id,
        taskTitle: task.title || 'Task',
        taskType: task.metadata?.taskType || 'question',
        score: taskScore,
        xpEarned: taskXP,
        attempts,
        passCount,
        skillsImproved
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
      completedTasks: completedTasks.length,
      timeSpentSeconds,
      taskEvaluationsCount: taskEvaluations.length,
      taskEvaluationsSample: taskEvaluations[0]
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