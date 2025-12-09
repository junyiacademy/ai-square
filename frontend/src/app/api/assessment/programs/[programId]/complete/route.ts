import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { AssessmentCompletionService } from '@/lib/services/assessment/assessment-completion.service';
import { DomainScoreAggregationService } from '@/lib/services/assessment/domain-score-aggregation.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    // Authentication
    const session = await getUnifiedAuth(request);

    let user: { email: string; id?: string } | null = null;

    if (session?.user) {
      user = session.user;
    } else {
      const { searchParams } = new URL(request.url);
      const emailParam = searchParams.get('userEmail');
      const idParam = searchParams.get('userId');

      if (emailParam) {
        user = { email: emailParam, id: idParam || undefined };
      } else {
        return createUnauthorizedResponse();
      }
    }

    try {
      await request.json();
    } catch {
      console.log('No JSON body provided for complete request');
    }

    const { programId } = await params;

    // Initialize repositories
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    const userRepo = repositoryFactory.getUserRepository();

    // Initialize services
    const completionService = new AssessmentCompletionService(
      taskRepo,
      programRepo,
      evaluationRepo,
      userRepo
    );
    const scoreService = new DomainScoreAggregationService();

    // Get program
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const userRecord = await userRepo.findByEmail(user.email);
    if (!userRecord || program.userId !== userRecord.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if already completed
    const existingCompletion = await completionService.validateCompletion(program);
    if (existingCompletion) {
      return NextResponse.json({
        success: true,
        evaluationId: existingCompletion.evaluationId,
        score: existingCompletion.score,
        alreadyCompleted: true
      });
    }

    // Get all tasks
    const tasks = await taskRepo.findByProgram(programId);

    // Check completion status
    const completionStatus = await completionService.checkAssessmentCompletion(tasks);
    if (!completionStatus.isComplete) {
      console.warn(`Incomplete assessment: ${completionStatus.answeredQuestions}/${completionStatus.totalQuestions} questions answered`);

      return NextResponse.json({
        success: false,
        error: 'Assessment incomplete',
        details: {
          totalQuestions: completionStatus.totalQuestions,
          answeredQuestions: completionStatus.answeredQuestions,
          missingQuestions: completionStatus.missingQuestions
        }
      }, { status: 400 });
    }

    // Complete all tasks
    await completionService.completeAllTasks(tasks);

    // Collect questions and answers
    const { questions, answers } = await completionService.collectQuestionsAndAnswers(tasks);

    console.log('Total collected:', {
      allAnswersCount: answers.length,
      allQuestionsCount: questions.length
    });

    // Calculate scores
    const totalQuestions = questions.length;
    const correctAnswers = answers.filter(a => a.context.isCorrect).length;
    const overallScore = scoreService.calculateOverallScore(totalQuestions, correctAnswers);

    // Calculate domain scores
    const domainScores = scoreService.calculateDomainScores(questions, answers);

    // Analyze KSA performance
    const ksaAnalysis = scoreService.analyzeKSAPerformance(questions, answers);

    // Determine level and generate feedback
    const level = scoreService.determineLevel(overallScore);
    const recommendations = scoreService.generateRecommendations(domainScores, overallScore);
    const feedbackText = scoreService.generateFeedback(overallScore, level);

    // Calculate completion time
    const completionTime = completionService.calculateCompletionTime(program);

    // Prepare KSA analysis metadata
    const ksaAnalysisMetadata = {
      knowledge: {
        score: ksaAnalysis.ksaScores.knowledge,
        strong: Array.from(ksaAnalysis.correctKSA.knowledge).slice(0, 3),
        weak: Array.from(ksaAnalysis.weakKSA.knowledge).slice(0, 3)
      },
      skills: {
        score: ksaAnalysis.ksaScores.skills,
        strong: Array.from(ksaAnalysis.correctKSA.skills).slice(0, 3),
        weak: Array.from(ksaAnalysis.weakKSA.skills).slice(0, 3)
      },
      attitudes: {
        score: ksaAnalysis.ksaScores.attitudes,
        strong: Array.from(ksaAnalysis.correctKSA.attitudes).slice(0, 3),
        weak: Array.from(ksaAnalysis.weakKSA.attitudes).slice(0, 3)
      }
    };

    // Create evaluation
    console.log('Creating evaluation with data:', {
      targetType: 'program',
      targetId: programId,
      evaluationType: 'assessment_complete',
      score: overallScore,
      totalQuestions,
      correctAnswers,
      level,
      completionTime
    });

    const evaluation = await completionService.createEvaluation({
      userId: userRecord.id,
      programId,
      score: overallScore,
      totalQuestions,
      correctAnswers,
      level,
      completionTime,
      recommendations,
      domainScores,
      ksaAnalysis: ksaAnalysisMetadata,
      feedbackText
    });

    console.log('Evaluation created successfully:', {
      evaluationId: evaluation.id,
      score: evaluation.score,
      programId: evaluation.programId || evaluation.id
    });

    // Update program completion
    await completionService.updateProgramCompletion(
      program,
      evaluation.id,
      overallScore,
      completionTime
    );

    return NextResponse.json({
      success: true,
      evaluationId: evaluation.id,
      score: overallScore
    });
  } catch (error) {
    console.error('Error completing assessment:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to complete assessment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
