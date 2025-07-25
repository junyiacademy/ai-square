import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';

interface DomainScore {
  domain: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  competencies: Set<string>;
  ksa: {
    knowledge: Set<string>;
    skills: Set<string>;
    attitudes: Set<string>;
  };
}

interface AssessmentInteraction {
  type: string;
  content?: { eventType?: string };
  context?: { isCorrect?: boolean; questionId?: string; ksa_mapping?: unknown };
}

interface Question {
  id: string;
  domain: string;
  question: string;
  options: Record<string, string>;
  difficulty: string;
  correct_answer: string;
  explanation: string;
  ksa_mapping?: {
    knowledge?: string[];
    skills?: string[];
    attitudes?: string[];
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    // Try to get user from authentication
    const session = await getServerSession();
    
    // If no auth, check if user info is in query params
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
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }
    
    try {
      await request.json();
    } catch {
      // No JSON body provided, that's fine
      console.log('No JSON body provided for complete request');
    }
    
    // Await params before using
    const { programId } = await params;
    
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Verify ownership by getting user ID from email
    const userRepo = repositoryFactory.getUserRepository();
    const userRecord = await userRepo.findByEmail(user.email);
    if (!userRecord || program.userId !== userRecord.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Check if program is already completed
    if (program.status === 'completed' && program.metadata?.evaluationId) {
      console.log('Program already completed with evaluation:', program.metadata.evaluationId);
      
      // Return existing evaluation instead of creating a new one
      const existingEvaluation = await evaluationRepo.findById(program.metadata.evaluationId as string);
      if (existingEvaluation) {
        return NextResponse.json({ 
          success: true,
          evaluationId: existingEvaluation.id,
          score: existingEvaluation.score,
          alreadyCompleted: true
        });
      }
    }
    
    // Also check if there's already an evaluation for this program
    const existingEvaluations = await evaluationRepo.findByProgram(programId);
    const existingAssessmentEval = existingEvaluations.find(e => e.evaluationType === 'assessment_complete');
    
    if (existingAssessmentEval) {
      console.log('Found existing evaluation for program:', existingAssessmentEval.id);
      
      // Update program to mark as completed if not already
      if (program.status !== 'completed') {
        await programRepo.update?.(programId, { 
          metadata: {
            ...program.metadata,
            evaluationId: existingAssessmentEval.id,
            score: existingAssessmentEval.score
          }
        });
        await programRepo.update?.(programId, { status: "completed" });
      }
      
      return NextResponse.json({ 
        success: true,
        evaluationId: existingAssessmentEval.id,
        score: existingAssessmentEval.score,
        alreadyCompleted: true
      });
    }
    
    // Get all tasks for this program
    const tasks = await taskRepo.findByProgram(programId);
    
    // Check if all tasks have been attempted
    let totalExpectedQuestions = 0;
    let totalAnsweredQuestions = 0;
    
    for (const task of tasks) {
      const taskQuestions = (task.content as { questions?: Question[] })?.questions || 
                           (task.metadata as { questions?: Question[] })?.questions || [];
      totalExpectedQuestions += taskQuestions.length;
      
      const taskAnswers = task.interactions?.filter(i => 
        i.type === 'assessment_answer' || 
        (i.type === 'system_event' && (i.content as { eventType?: string })?.eventType === 'assessment_answer')
      ) || [];
      totalAnsweredQuestions += taskAnswers.length;
    }
    
    // If user hasn't answered all questions, consider this an incomplete assessment
    if (totalAnsweredQuestions < totalExpectedQuestions) {
      console.warn(`Incomplete assessment: ${totalAnsweredQuestions}/${totalExpectedQuestions} questions answered`);
      
      // Don't create evaluation for incomplete assessments
      return NextResponse.json({ 
        success: false,
        error: 'Assessment incomplete',
        details: {
          totalQuestions: totalExpectedQuestions,
          answeredQuestions: totalAnsweredQuestions,
          missingQuestions: totalExpectedQuestions - totalAnsweredQuestions
        }
      }, { status: 400 });
    }
    
    // Complete all pending tasks
    for (const task of tasks) {
      if (task.status !== 'completed') {
        await taskRepo.updateStatus?.(task.id, "completed");
      }
    }
    
    // Collect all answers and questions from all tasks
    let allAnswers: Array<{
      type: string;
      context: {
        questionId: string;
        selectedAnswer: string;
        timeSpent: number;
        isCorrect: boolean;
      };
    }> = [];
    let allQuestions: Array<{
      id: string;
      domain: string;
      question: string;
      options: Record<string, string>;
      difficulty: string;
      correct_answer: string;
      explanation: string;
      ksa_mapping: {
        knowledge?: string[];
        skills?: string[];
        attitudes?: string[];
      };
    }> = [];
    
    console.log('Collecting answers and questions from', tasks.length, 'tasks');
    
    for (const task of tasks) {
      // Handle both old format (system_event) and new format (assessment_answer)
      const taskAnswers = task.interactions
        .filter(i => 
          (i.type === 'system_event' && (i.content as { eventType?: string })?.eventType === 'assessment_answer') ||
          i.type === 'assessment_answer'
        )
        .map(i => {
          // Handle new format where context is already structured
          if (i.type === 'assessment_answer' && i.context) {
            return {
              type: i.type,
              context: {
                questionId: i.context.questionId || '',
                selectedAnswer: i.context.selectedAnswer || '',
                timeSpent: i.context.timeSpent || 0,
                isCorrect: i.context.isCorrect === true
              }
            };
          }
          // Handle old format for backward compatibility
          return {
            type: i.type,
            context: {
              questionId: (i.content as { questionId?: string })?.questionId || '',
              selectedAnswer: (i.content as { selectedAnswer?: string })?.selectedAnswer || '',
              timeSpent: (i.content as { timeSpent?: number })?.timeSpent || 0,
              isCorrect: (i.content as { isCorrect?: boolean })?.isCorrect || false
            }
          };
        });
      
      // Questions can be in task.content.questions or task.metadata.questions
      const taskQuestions = (task.content as { questions?: Question[] })?.questions || 
                           (task.metadata as { questions?: Question[] })?.questions || [];
      
      console.log(`Task ${task.title}:`, {
        taskId: task.id,
        answersCount: taskAnswers.length,
        questionsCount: taskQuestions.length,
        questionsKSA: taskQuestions.map((q) => ({
          id: q.id,
          domain: q.domain,
          ksa: q.ksa_mapping
        }))
      });
      
      allAnswers = [...allAnswers, ...taskAnswers];
      allQuestions = [...allQuestions, ...taskQuestions] as typeof allQuestions;
    }
    
    console.log('Total collected:', {
      allAnswersCount: allAnswers.length,
      allQuestionsCount: allQuestions.length,
      allKSAMappings: allQuestions.map((q) => q.ksa_mapping).filter(Boolean)
    });
    
    const totalQuestions = allQuestions.length;
    const correctAnswers = allAnswers.filter(a => (a.context as { isCorrect?: boolean })?.isCorrect === true).length;
    const overallScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    // Calculate domain scores based on actual questions and answers
    const domainScores: Map<string, DomainScore> = new Map();
    
    // Initialize four domains
    const domains = ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai'];
    domains.forEach(domain => {
      domainScores.set(domain, {
        domain,
        totalQuestions: 0,
        correctAnswers: 0,
        score: 0,
        competencies: new Set(),
        ksa: {
          knowledge: new Set(),
          skills: new Set(),
          attitudes: new Set()
        }
      });
    });
    
    // Process each answer to calculate domain scores and collect KSA mappings
    allAnswers.forEach((answer) => {
      const answerContent = answer.context as { questionId?: string; isCorrect?: boolean };
      const questionId = answerContent.questionId;
      const question = allQuestions.find((q) => q.id === questionId);
      
      if (question && question.domain) {
        const domainScore = domainScores.get(question.domain);
        if (domainScore) {
          domainScore.totalQuestions++;
          if (answerContent.isCorrect) {
            domainScore.correctAnswers++;
          }
          
          // Collect KSA mappings from question
          if (question.ksa_mapping) {
            if (question.ksa_mapping.knowledge) {
              question.ksa_mapping.knowledge.forEach((k: string) => domainScore.ksa.knowledge.add(k));
            }
            if (question.ksa_mapping.skills) {
              question.ksa_mapping.skills.forEach((s: string) => domainScore.ksa.skills.add(s));
            }
            if (question.ksa_mapping.attitudes) {
              question.ksa_mapping.attitudes.forEach((a: string) => domainScore.ksa.attitudes.add(a));
            }
          }
        }
      }
    });
    
    // Calculate domain scores
    domainScores.forEach(domainScore => {
      if (domainScore.totalQuestions > 0) {
        domainScore.score = Math.round((domainScore.correctAnswers / domainScore.totalQuestions) * 100);
      }
    });
    
    // Calculate time spent
    const startTime = program.metadata?.createdAt || program.metadata?.startTime || (program.startedAt ? Date.parse(program.startedAt.toString()) : (program.createdAt ? Date.parse(program.createdAt.toString()) : Date.now()));
    const completionTime = Math.floor((Date.now() - (startTime as number)) / 1000);
    
    // Determine level
    let level = 'beginner';
    if (overallScore >= 80) level = 'expert';
    else if (overallScore >= 70) level = 'advanced';
    else if (overallScore >= 50) level = 'intermediate';
    
    // Generate recommendations
    const recommendations = generateRecommendations(domainScores, overallScore);
    
    // KSA Analysis - track correct and incorrect KSA mappings
    const correctKSA = {
      knowledge: new Set<string>(),
      skills: new Set<string>(),
      attitudes: new Set<string>()
    };
    const incorrectKSA = {
      knowledge: new Set<string>(),
      skills: new Set<string>(),
      attitudes: new Set<string>()
    };
    
    // Analyze each answer to determine KSA performance
    console.log('Analyzing KSA performance for', allAnswers.length, 'answers');
    
    allAnswers.forEach((answer, index) => {
      const answerContent = (answer as AssessmentInteraction).context || {};
      const questionId = answerContent.questionId;
      const question = allQuestions.find((q) => q.id === questionId);
      
      console.log(`Answer ${index + 1}:`, {
        questionId,
        isCorrect: answerContent.isCorrect,
        hasQuestion: !!question,
        hasKSAMapping: !!(question?.ksa_mapping),
        ksa: question?.ksa_mapping
      });
      
      if (question && question.ksa_mapping) {
        const targetKSA = answerContent.isCorrect ? correctKSA : incorrectKSA;
        
        if (question.ksa_mapping.knowledge) {
          question.ksa_mapping.knowledge.forEach((k) => targetKSA.knowledge.add(k));
        }
        if (question.ksa_mapping.skills) {
          question.ksa_mapping.skills.forEach((s) => targetKSA.skills.add(s));
        }
        if (question.ksa_mapping.attitudes) {
          question.ksa_mapping.attitudes.forEach((a) => targetKSA.attitudes.add(a));
        }
      }
    });
    
    console.log('Final KSA analysis:', {
      correctKSA: {
        knowledge: Array.from(correctKSA.knowledge),
        skills: Array.from(correctKSA.skills),
        attitudes: Array.from(correctKSA.attitudes)
      },
      incorrectKSA: {
        knowledge: Array.from(incorrectKSA.knowledge),
        skills: Array.from(incorrectKSA.skills),
        attitudes: Array.from(incorrectKSA.attitudes)
      }
    });
    
    // Calculate KSA scores
    const allKnowledge = new Set([...correctKSA.knowledge, ...incorrectKSA.knowledge]);
    const allSkills = new Set([...correctKSA.skills, ...incorrectKSA.skills]);
    const allAttitudes = new Set([...correctKSA.attitudes, ...incorrectKSA.attitudes]);
    
    // Identify weak areas (more incorrect than correct)
    const weakKnowledge = new Set<string>();
    const weakSkills = new Set<string>();
    const weakAttitudes = new Set<string>();
    
    incorrectKSA.knowledge.forEach(k => {
      if (!correctKSA.knowledge.has(k)) weakKnowledge.add(k);
    });
    incorrectKSA.skills.forEach(s => {
      if (!correctKSA.skills.has(s)) weakSkills.add(s);
    });
    incorrectKSA.attitudes.forEach(a => {
      if (!correctKSA.attitudes.has(a)) weakAttitudes.add(a);
    });
    
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
    
    const evaluation = await evaluationRepo.create({
      userId: userRecord.id,
      programId: programId,
      mode: 'assessment',
      evaluationType: 'program',
      evaluationSubtype: 'assessment_complete',
      score: overallScore,
      maxScore: 100,
      timeTakenSeconds: completionTime,
      feedbackText: generateOverallFeedback(overallScore, level),
      feedbackData: {},
      dimensionScores: Array.from(domainScores.values()).reduce((acc, ds) => {
        acc[ds.domain] = ds.score;
        return acc;
      }, {} as Record<string, number>),
      aiAnalysis: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {
        totalQuestions,
        correctAnswers,
        domainScores: Array.from(domainScores.values()).map(ds => ({
          name: ds.domain,
          score: ds.score,
          maxScore: 100
        }))
      },
      metadata: {
        completionTime,
        totalQuestions,
        correctAnswers,
        level,
        recommendations,
        certificateEligible: overallScore >= 60,
        domainScores: Object.fromEntries(
          Array.from(domainScores.entries()).map(([domain, ds]) => [domain, ds.score])
        ),
        ksaAnalysis: {
          knowledge: {
            score: allKnowledge.size > 0 ? Math.round((correctKSA.knowledge.size / allKnowledge.size) * 100) : 0,
            strong: Array.from(correctKSA.knowledge).slice(0, 3),
            weak: Array.from(weakKnowledge).slice(0, 3)
          },
          skills: {
            score: allSkills.size > 0 ? Math.round((correctKSA.skills.size / allSkills.size) * 100) : 0,
            strong: Array.from(correctKSA.skills).slice(0, 3),
            weak: Array.from(weakSkills).slice(0, 3)
          },
          attitudes: {
            score: allAttitudes.size > 0 ? Math.round((correctKSA.attitudes.size / allAttitudes.size) * 100) : 0,
            strong: Array.from(correctKSA.attitudes).slice(0, 3),
            weak: Array.from(weakAttitudes).slice(0, 3)
          }
        }
      },
      createdAt: new Date().toISOString()
    });
    
    console.log('Evaluation created successfully:', {
      evaluationId: evaluation.id,
      score: evaluation.score,
      programId: evaluation.programId || evaluation.id
    });
    
    // Update program score and complete it
    await programRepo.update?.(programId, { 
      metadata: {
        ...program.metadata,
        score: overallScore,
        completionTime,
        evaluationId: evaluation.id
      }
    });
    await programRepo.update?.(programId, { status: "completed" });
    
    // REMOVED: Duplicate save to v2/assessments/
    // Following unified learning architecture, we only save to evaluations
    // The assessment results API (GET /api/assessment/results) already knows
    // how to fetch results from evaluations (see lines 162-213 of that file)
    
    return NextResponse.json({ 
      success: true,
      evaluationId: evaluation.id,
      score: overallScore
    });
  } catch (error) {
    console.error('Error completing assessment:', error);
    return NextResponse.json(
      { error: 'Failed to complete assessment' },
      { status: 500 }
    );
  }
}

function generateOverallFeedback(score: number, level: string): string {
  if (score >= 80) {
    return `Excellent performance! You've demonstrated ${level} level AI literacy with strong understanding across all domains.`;
  } else if (score >= 70) {
    return `Great job! You've shown ${level} level proficiency in AI literacy. Keep building on your strengths.`;
  } else if (score >= 60) {
    return `Good effort! You've achieved ${level} level AI literacy. Focus on the areas marked for improvement.`;
  } else {
    return `You've completed the assessment at ${level} level. This is a great starting point for your AI literacy journey.`;
  }
}

function generateRecommendations(domainScores: Map<string, DomainScore>, overallScore: number): string[] {
  const recommendations: string[] = [];
  
  // Find weak domains
  const weakDomains = Array.from(domainScores.entries())
    .filter(([, ds]) => ds.score < 60)
    .sort((a, b) => a[1].score - b[1].score);
  
  if (weakDomains.length > 0) {
    weakDomains.forEach(([domain]) => {
      const domainName = domain.replace(/_/g, ' ').toLowerCase();
      recommendations.push(`Focus on improving your ${domainName} skills through hands-on practice`);
    });
  }
  
  // General recommendations based on score
  if (overallScore < 60) {
    recommendations.push('Review the fundamental concepts of AI literacy');
    recommendations.push('Take introductory courses on AI basics');
  } else if (overallScore < 80) {
    recommendations.push('Practice with more advanced AI scenarios');
    recommendations.push('Explore real-world AI applications in your field');
  } else {
    recommendations.push('Consider mentoring others in AI literacy');
    recommendations.push('Stay updated with latest AI developments and best practices');
  }
  
  return recommendations.slice(0, 4); // Return top 4 recommendations
}