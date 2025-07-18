import { NextRequest, NextResponse } from 'next/server';
import { 
  getProgramRepository,
  getEvaluationRepository,
  getTaskRepository 
} from '@/lib/implementations/gcs-v2';
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
    
    const programRepo = getProgramRepository();
    const evaluationRepo = getEvaluationRepository();
    const taskRepo = getTaskRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== userEmail) {
      return NextResponse.json(
        { error: 'Program not found or access denied' },
        { status: 404 }
      );
    }
    
    // Get evaluations for this program
    const evaluations = await evaluationRepo.findByTarget('program', programId);
    console.log('Found evaluations for Discovery program', programId, {
      evaluationsCount: evaluations.length,
      evaluationTypes: evaluations.map(e => e.evaluationType),
      evaluationIds: evaluations.map(e => e.id)
    });
    
    // Find the discovery_complete evaluation
    const evaluation = evaluations.find(e => e.evaluationType === 'discovery_complete');
    
    if (!evaluation) {
      // If no evaluation exists yet, create a basic one from task data
      const tasks = await taskRepo.findByProgram(programId);
      const completedTasks = tasks.filter(t => t.status === 'completed');
      
      // Calculate basic metrics
      const totalXP = completedTasks.reduce((sum, task) => {
        const xp = task.metadata?.xpEarned || 0;
        return sum + xp;
      }, 0);
      
      const totalScore = completedTasks.reduce((sum, task) => {
        const score = task.metadata?.score || 0;
        return sum + score;
      }, 0);
      
      const avgScore = completedTasks.length > 0 ? Math.round(totalScore / completedTasks.length) : 0;
      
      // Create task evaluations
      const taskEvaluations = completedTasks.map(task => ({
        taskId: task.id,
        taskTitle: task.title || 'Task',
        taskType: task.metadata?.taskType || 'question',
        score: task.metadata?.score || 0,
        xpEarned: task.metadata?.xpEarned || 0,
        attempts: task.metadata?.attempts || 1,
        skillsImproved: task.metadata?.skillsImproved || []
      }));
      
      // Calculate time spent (sum of all task times)
      const timeSpentSeconds = completedTasks.reduce((sum, task) => {
        const time = task.metadata?.timeSpent || 0;
        return sum + time;
      }, 0);
      
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
          taskEvaluations,
          skillImprovements: [],
          achievementsUnlocked: [],
          createdAt: new Date().toISOString()
        },
        program
      });
    }
    
    return NextResponse.json({ 
      evaluation,
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