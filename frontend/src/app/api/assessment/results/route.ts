import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { cachedGET, getPaginationParams, createPaginatedResponse } from '@/lib/api/optimization-utils';

interface AssessmentResult {
  assessment_id: string;
  user_id: string;
  user_email: string;
  timestamp: string;
  duration_seconds: number;
  language: string;
  scores: {
    overall: number;
    domains: {
      engaging_with_ai: number;
      creating_with_ai: number;
      managing_with_ai: number;
      designing_with_ai: number;
    };
  };
  summary: {
    total_questions: number;
    correct_answers: number;
    level: string;
  };
  answers: Array<{
    question_id: string;
    selected: string;
    correct: string;
    time_spent: number;
    ksa_mapping?: Record<string, unknown>;
  }>;
}

export async function POST(request: NextRequest) {
  console.log('=== Assessment Save API Called ===');
  
  try {
    const body = await request.json();
    console.log('Request body received:', {
      userId: body.userId,
      hasAnswers: !!body.answers,
      hasResult: !!body.result
    });
    
    // Simple validation
    if (!body.userId || !body.answers || !body.result) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const userRepo = repositoryFactory.getUserRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();

    // Get user
    const user = await userRepo.findByEmail(body.userEmail || body.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find or create assessment program
    const programs = await programRepo.findByUser(user.id);
    let assessmentProgram = programs.find(p => 
      p.scenarioId === body.scenarioId && 
      p.status === 'active'
    );

    if (!assessmentProgram) {
      // Create new assessment program
      assessmentProgram = await programRepo.create({
        userId: user.id,
        scenarioId: body.scenarioId || 'assessment-default',
        totalTaskCount: body.result.totalQuestions || body.answers.length,
        mode: 'assessment',
        status: 'active',
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        currentTaskIndex: 0,
        language: body.language || 'en',
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      });
    }

    // Create evaluation record
    const evaluation = await evaluationRepo.create({
      userId: user.id,
      programId: assessmentProgram.id,
      mode: 'assessment',
      evaluationType: 'assessment_complete',
      evaluationSubtype: undefined,
      score: body.result.overallScore,
      maxScore: 100,
      dimensionScores: body.result.domainScores || {},
      feedbackText: `Assessment completed. Level: ${body.result.level}`,
      feedbackData: {},
      aiAnalysis: {
        insights: [`You achieved ${body.result.level} level with ${body.result.correctAnswers}/${body.result.totalQuestions} correct answers`],
        strengths: body.result.domainScores ? Object.entries(body.result.domainScores)
          .filter(([, score]) => (score as number) >= 70)
          .map(([domain]) => `Strong performance in ${domain}`) : [],
        improvements: body.result.domainScores ? Object.entries(body.result.domainScores)
          .filter(([, score]) => (score as number) < 70)
          .map(([domain]) => `Could improve in ${domain}`) : []
      },
      timeTakenSeconds: body.result.timeSpentSeconds || 0,
      createdAt: new Date().toISOString(),
      pblData: {},
      discoveryData: {},
      assessmentData: {
        totalQuestions: body.result.totalQuestions,
        correctAnswers: body.result.correctAnswers,
        level: body.result.level
      },
      metadata: {
        language: body.language || 'en',
        answers: body.answers,
        completionTime: body.result.timeSpentSeconds || 0
      }
    });

    // Update program status
    await programRepo.update?.(assessmentProgram.id, {
      status: 'completed',
      completedTasks: body.result.totalQuestions,
      totalScore: body.result.overallScore,
      endTime: new Date(),
      metadata: {
        ...assessmentProgram.metadata,
        evaluationId: evaluation.id
      }
    });

    // Update user XP
    const xpReward = Math.round(body.result.overallScore * 10); // 10 XP per score point
    await userRepo.update(user.id, {
      totalXp: user.totalXp + xpReward
    });

    return NextResponse.json({
      success: true,
      assessmentId: evaluation.id,
      programId: assessmentProgram.id,
      message: 'Assessment result saved successfully',
      xpEarned: xpReward
    });
  } catch (error) {
    console.error('Error saving assessment result:', error);
    return NextResponse.json(
      { error: 'Failed to save assessment result' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const userEmail = searchParams.get('userEmail');
  const paginationParams = getPaginationParams(request);

  if (!userId && !userEmail) {
    return NextResponse.json(
      { error: 'userId or userEmail is required' },
      { status: 400 }
    );
  }

  return cachedGET(request, async () => {
    const userRepo = repositoryFactory.getUserRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();

    // Get user
    let user;
    if (userEmail) {
      user = await userRepo.findByEmail(userEmail);
    } else if (userId) {
      user = await userRepo.findById(userId);
    }

    if (!user) {
      return {
        data: [],
        total: 0,
        page: 1,
        totalPages: 1
      };
    }

    // Get all completed assessment programs
    const programs = await programRepo.getCompletedPrograms?.(user.id) || [];
    const assessmentPrograms = programs.filter(p => 
      p.scenarioId?.includes('assessment') || 
      p.metadata?.type === 'assessment'
    );

    // Get evaluations for assessment programs
    const assessmentResults: AssessmentResult[] = [];
    
    for (const program of assessmentPrograms) {
      const evaluations = await evaluationRepo.findByProgram(program.id);
      const assessmentEvaluation = evaluations.find(e => 
        e.evaluationType === 'assessment_complete'
      );

      if (assessmentEvaluation) {
        const result: AssessmentResult = {
          assessment_id: assessmentEvaluation.id,
          user_id: user.id,
          user_email: user.email,
          timestamp: assessmentEvaluation.createdAt,
          duration_seconds: assessmentEvaluation.timeTakenSeconds,
          language: (assessmentEvaluation.metadata?.language as string) || 'en',
          scores: {
            overall: assessmentEvaluation.score,
            domains: {
              engaging_with_ai: assessmentEvaluation.dimensionScores?.['Engaging_with_AI'] || 0,
              creating_with_ai: assessmentEvaluation.dimensionScores?.['Creating_with_AI'] || 0,
              managing_with_ai: assessmentEvaluation.dimensionScores?.['Managing_with_AI'] || 0,
              designing_with_ai: assessmentEvaluation.dimensionScores?.['Designing_with_AI'] || 0,
            }
          },
          summary: {
            total_questions: (assessmentEvaluation.metadata?.totalQuestions as number) || 0,
            correct_answers: (assessmentEvaluation.metadata?.correctAnswers as number) || 0,
            level: (assessmentEvaluation.metadata?.level as string) || 'beginner'
          },
          answers: (assessmentEvaluation.metadata?.answers as AssessmentResult['answers']) || []
        };

        assessmentResults.push(result);
      }
    }

    // Sort by timestamp (newest first)
    assessmentResults.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply pagination
    const paginatedResponse = createPaginatedResponse(
      assessmentResults,
      assessmentResults.length,
      paginationParams
    );

    return {
      ...paginatedResponse,
      storage: 'postgresql'
    };
  }, {
    ttl: 300, // 5 minutes cache
    staleWhileRevalidate: 1800 // 30 minutes
  });
}