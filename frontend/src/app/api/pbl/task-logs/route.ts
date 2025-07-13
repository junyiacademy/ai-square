import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { IInteraction } from '@/types/unified-learning';

// POST - Add interaction to task
export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { programId, taskId, interaction } = body;

    // Validate required fields
    if (!programId || !taskId || !interaction) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use unified architecture
    const { getTaskRepository } = await import('@/lib/implementations/gcs-v2');
    const taskRepo = getTaskRepository();

    // Create interaction in unified format
    const newInteraction: IInteraction = {
      timestamp: new Date().toISOString(),
      type: interaction.type === 'user' ? 'user_input' : 
            interaction.type === 'ai' ? 'ai_response' : 'system_event',
      content: interaction.content,
      metadata: {
        role: interaction.role || interaction.type,
        originalType: interaction.type
      }
    };

    // Add interaction to task
    await taskRepo.addInteraction(taskId, newInteraction);

    return NextResponse.json({
      success: true,
      message: 'Interaction saved successfully'
    });

  } catch (error) {
    console.error('Error saving task interaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save interaction' },
      { status: 500 }
    );
  }
}

// GET - Get task logs and evaluation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId is required' },
        { status: 400 }
      );
    }

    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Use unified architecture
    const { getTaskRepository, getEvaluationRepository } = await import('@/lib/implementations/gcs-v2');
    const taskRepo = getTaskRepository();
    const evalRepo = getEvaluationRepository();

    // Get task with interactions
    const task = await taskRepo.findById(taskId);
    if (!task) {
      return NextResponse.json({
        success: true,
        data: {
          log: { interactions: [] },
          evaluation: null
        }
      });
    }

    // Get evaluation if exists
    let evaluation = null;
    try {
      const evaluations = await evalRepo.findByTask(taskId);
      if (evaluations.length > 0) {
        // Get the latest evaluation
        evaluation = evaluations.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
      }
    } catch (error) {
      console.log('No evaluation found for task:', taskId);
    }

    // Transform interactions to match old format for compatibility
    const transformedInteractions = task.interactions.map(interaction => ({
      type: interaction.type === 'user_input' ? 'user' : 
            interaction.type === 'ai_response' ? 'ai' : 'system',
      content: interaction.content,
      timestamp: interaction.timestamp,
      role: interaction.metadata?.role || interaction.type
    }));

    return NextResponse.json({
      success: true,
      data: {
        log: {
          interactions: transformedInteractions
        },
        evaluation: evaluation
      }
    });

  } catch (error) {
    console.error('Error fetching task logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch task logs' },
      { status: 500 }
    );
  }
}

// PUT - Update task evaluation
export async function PUT(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { programId, taskId, evaluation } = body;

    if (!taskId || !evaluation) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use unified architecture
    const { getEvaluationRepository } = await import('@/lib/implementations/gcs-v2');
    const evalRepo = getEvaluationRepository();

    // Create evaluation
    await evalRepo.create({
      taskId,
      programId: programId || '',
      type: 'task',
      score: evaluation.score,
      rubric: evaluation,
      metadata: {
        ksaScores: evaluation.ksaScores,
        domainScores: evaluation.domainScores,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        conversationInsights: evaluation.conversationInsights,
        conversationCount: evaluation.conversationCount
      },
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Evaluation saved successfully'
    });

  } catch (error) {
    console.error('Error saving evaluation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save evaluation' },
      { status: 500 }
    );
  }
}