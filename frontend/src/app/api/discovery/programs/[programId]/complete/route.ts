import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    // Get authentication
    const session = await getUnifiedAuth(request);
    
    let user: { email: string; id?: string } | null = null;
    
    if (session?.user) {
      user = session.user;
    } else {
      return createUnauthorizedResponse();
    }
    
    // Await params before using
    const { programId } = await params;
    
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    const userId = user.id;
    if (!program || program.userId !== userId) {
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
      const interactions = (task as { interactions?: unknown[] }).interactions || [];
      // Find the last successful AI response for this task
      const successfulResponses = interactions.filter((i: unknown) => {
        const interaction = i as Record<string, unknown>;
        return interaction.type === 'ai_response' && (interaction.context as Record<string, unknown>)?.completed === true;
      });
      
      if (successfulResponses.length > 0) {
        const lastSuccess = successfulResponses[successfulResponses.length - 1] as Record<string, unknown>;
        const content = typeof lastSuccess.content === 'string' 
          ? JSON.parse(lastSuccess.content) 
          : lastSuccess.content as Record<string, unknown>;
        
        const xpEarned = (content?.xpEarned as number) || 0;
        const score = (content?.score as number) || (content?.completed ? 100 : 0);
        
        totalXP += xpEarned;
        totalScore += score;
        validScoreCount++;
      }
    });
    
    const avgScore = validScoreCount > 0 ? Math.round(totalScore / validScoreCount) : 0;
    
    // Calculate time spent
    const timeSpentSeconds = completedTasks.reduce((sum, task) => {
      const interactions = (task as { interactions?: unknown[] }).interactions || [];
      const timeSpent = interactions.reduce((taskTime: number, interaction) => {
        const i = interaction as Record<string, unknown>;
        // Check different possible locations for timeSpent
        const time = (i.metadata as Record<string, unknown>)?.timeSpent as number || 
                    (i.context as Record<string, unknown>)?.timeSpent as number || 
                    0;
        return taskTime + time;
      }, 0);
      return sum + timeSpent;
    }, 0);
    
    // Create task evaluations
    const taskEvaluations = completedTasks.map(task => {
      const interactions = (task as { interactions?: unknown[] }).interactions || [];
      const attempts = interactions.filter(i => (i as Record<string, unknown>).type === 'user_input').length;
      const aiResponses = interactions.filter(i => (i as Record<string, unknown>).type === 'ai_response');
      const passCount = aiResponses.filter(r => (r as Record<string, unknown>).context && ((r as Record<string, unknown>).context as Record<string, unknown>)?.completed === true).length;
      
      // Get the last successful response for XP and score
      let taskXP = 0;
      let taskScore = 0;
      let skillsImproved: string[] = [];
      
      const successfulResponses = aiResponses.filter(r => {
        const response = r as Record<string, unknown>;
        return response.context && ((response.context as Record<string, unknown>)?.completed === true);
      });
      if (successfulResponses.length > 0) {
        const lastSuccess = successfulResponses[successfulResponses.length - 1] as Record<string, unknown>;
        const content = typeof lastSuccess.content === 'string' 
          ? JSON.parse(lastSuccess.content) 
          : lastSuccess.content as Record<string, unknown>;
        
        taskXP = (content?.xpEarned as number) || 0;
        taskScore = (content?.score as number) || (content?.completed ? 100 : 0);
        skillsImproved = (content?.skillsImproved as string[]) || [];
      }
      
      // Extract language-specific title
      const getLocalizedTitle = (title: unknown) => {
        if (typeof title === 'string') return title;
        if (typeof title === 'object' && title !== null) {
          const titleObj = title as Record<string, string>;
          const acceptLang = request.headers.get('accept-language') || 'en';
          
          // Handle zh-TW -> zhTW mapping
          let lookupLang = acceptLang;
          if (acceptLang === 'zh-TW') lookupLang = 'zhTW';
          if (acceptLang === 'zh-CN') lookupLang = 'zhCN';
          
          // Try direct lookup
          if (titleObj[lookupLang]) {
            return titleObj[lookupLang];
          }
          
          // Fallback to English or first available
          return titleObj.en || titleObj.zhTW || Object.values(titleObj)[0] || 'Task';
        }
        return 'Task';
      };
      
      return {
        taskId: task.id,
        taskTitle: getLocalizedTitle(task.title), // Localize to string before saving
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
      userId: userId,
      programId: programId,
      mode: 'discovery',
      evaluationType: 'program',
      evaluationSubtype: 'discovery_complete',
      score: avgScore,
      maxScore: 100,
      timeTakenSeconds: timeSpentSeconds,
      domainScores: {},
      feedbackText: '',
      feedbackData: {},
      aiAnalysis: {},
      createdAt: new Date().toISOString(),
      pblData: {},
      discoveryData: {
        careerType,
        totalXP,
        totalTasks: tasks.length,
        completedTasks: completedTasks.length
      },
      assessmentData: {},
      metadata: {
        scenarioId: program.scenarioId,
        scenarioTitle: scenario?.title,
        overallScore: avgScore,
        taskEvaluations,
        completedAt: new Date().toISOString()
      }
    });
    
    console.log('Evaluation created successfully:', evaluation.id);
    
    // Update program to mark as completed
    await programRepo.update?.(programId, { 
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
    await programRepo.update?.(programId, { status: "completed" });
    
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