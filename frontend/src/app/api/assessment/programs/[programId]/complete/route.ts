import { NextRequest, NextResponse } from 'next/server';
import { 
  getProgramRepository, 
  getTaskRepository,
  getEvaluationRepository 
} from '@/lib/implementations/gcs-v2';
import { getAuthFromRequest } from '@/lib/auth/auth-utils';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    // Try to get user from authentication
    const authUser = await getAuthFromRequest(request);
    
    // If no auth, check if user info is in query params
    let user: { email: string; id?: string } | null = null;
    
    if (authUser) {
      user = authUser;
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
    
    let body = {};
    try {
      body = await request.json();
    } catch (error) {
      // No JSON body provided, that's fine
      console.log('No JSON body provided for complete request');
    }
    
    // Await params before using
    const { programId } = await params;
    
    const programRepo = getProgramRepository();
    const taskRepo = getTaskRepository();
    const evaluationRepo = getEvaluationRepository();
    
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
      
      // Return existing evaluation instead of creating a new one
      const existingEvaluation = await evaluationRepo.findById(program.metadata.evaluationId);
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
    const existingEvaluations = await evaluationRepo.findByTarget('program', programId);
    const existingAssessmentEval = existingEvaluations.find(e => e.evaluationType === 'assessment_complete');
    
    if (existingAssessmentEval) {
      console.log('Found existing evaluation for program:', existingAssessmentEval.id);
      
      // Update program to mark as completed if not already
      if (program.status !== 'completed') {
        await programRepo.update(programId, { 
          metadata: {
            ...program.metadata,
            evaluationId: existingAssessmentEval.id,
            score: existingAssessmentEval.score
          }
        });
        await programRepo.complete(programId);
      }
      
      return NextResponse.json({ 
        success: true,
        evaluationId: existingAssessmentEval.id,
        score: existingAssessmentEval.score,
        alreadyCompleted: true
      });
    }
    
    // Get all tasks for this program
    const tasks = await Promise.all(
      program.taskIds.map(id => taskRepo.findById(id))
    );
    
    // Filter out null tasks and complete all pending tasks
    const validTasks = tasks.filter(t => t !== null);
    for (const task of validTasks) {
      if (task.status !== 'completed') {
        await taskRepo.complete(task.id);
      }
    }
    
    // Collect all answers and questions from all tasks
    let allAnswers: any[] = [];
    let allQuestions: any[] = [];
    
    console.log('Collecting answers and questions from', validTasks.length, 'tasks');
    
    for (const task of validTasks) {
      const taskAnswers = task.interactions.filter(i => i.type === 'assessment_answer');
      const taskQuestions = task.content?.context?.questions || task.content?.questions || [];
      
      console.log(`Task ${task.title}:`, {
        taskId: task.id,
        answersCount: taskAnswers.length,
        questionsCount: taskQuestions.length,
        questionsKSA: taskQuestions.map((q: any) => ({
          id: q.id,
          domain: q.domain,
          ksa: q.ksa_mapping
        }))
      });
      
      allAnswers = [...allAnswers, ...taskAnswers];
      allQuestions = [...allQuestions, ...taskQuestions];
    }
    
    console.log('Total collected:', {
      allAnswersCount: allAnswers.length,
      allQuestionsCount: allQuestions.length,
      allKSAMappings: allQuestions.map((q: any) => q.ksa_mapping).filter(Boolean)
    });
    
    const totalQuestions = allQuestions.length;
    const correctAnswers = allAnswers.filter(a => a.content.isCorrect === true).length;
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
    allAnswers.forEach((answer: any) => {
      const questionId = answer.content.questionId;
      const question = allQuestions.find((q: any) => q.id === questionId);
      
      if (question && question.domain) {
        const domainScore = domainScores.get(question.domain);
        if (domainScore) {
          domainScore.totalQuestions++;
          if (answer.content.isCorrect) {
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
    const startTime = program.metadata?.startTime || Date.parse(program.startedAt);
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
    
    allAnswers.forEach((answer: any, index: number) => {
      const questionId = answer.content.questionId;
      const question = allQuestions.find((q: any) => q.id === questionId);
      
      console.log(`Answer ${index + 1}:`, {
        questionId,
        isCorrect: answer.content.isCorrect,
        hasQuestion: !!question,
        hasKSAMapping: !!(question?.ksa_mapping),
        ksa: question?.ksa_mapping
      });
      
      if (question && question.ksa_mapping) {
        const targetKSA = answer.content.isCorrect ? correctKSA : incorrectKSA;
        
        if (question.ksa_mapping.knowledge) {
          question.ksa_mapping.knowledge.forEach((k: string) => targetKSA.knowledge.add(k));
        }
        if (question.ksa_mapping.skills) {
          question.ksa_mapping.skills.forEach((s: string) => targetKSA.skills.add(s));
        }
        if (question.ksa_mapping.attitudes) {
          question.ksa_mapping.attitudes.forEach((a: string) => targetKSA.attitudes.add(a));
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
      targetType: 'program',
      targetId: programId,
      evaluationType: 'assessment_complete',
      score: overallScore,
      feedback: generateOverallFeedback(overallScore, level),
      dimensions: Array.from(domainScores.values()).map(ds => ({
        dimension: ds.domain,
        score: ds.score,
        maxScore: 100,
        feedback: generateDomainFeedback(ds.domain, ds.score),
        metadata: {
          knowledge: Array.from(ds.ksa.knowledge),
          skills: Array.from(ds.ksa.skills),
          attitudes: Array.from(ds.ksa.attitudes)
        }
      })),
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
      targetId: evaluation.targetId
    });
    
    // Update program score and complete it
    await programRepo.update(programId, { 
      metadata: {
        ...program.metadata,
        score: overallScore,
        completionTime,
        evaluationId: evaluation.id
      }
    });
    await programRepo.complete(programId);
    
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

function generateDomainFeedback(domain: string, score: number): string {
  const domainName = domain.replace(/_/g, ' ');
  if (score >= 80) {
    return `Excellent understanding of ${domainName}`;
  } else if (score >= 60) {
    return `Good grasp of ${domainName} concepts`;
  } else {
    return `${domainName} is an area for further development`;
  }
}

function generateRecommendations(domainScores: Map<string, DomainScore>, overallScore: number): string[] {
  const recommendations: string[] = [];
  
  // Find weak domains
  const weakDomains = Array.from(domainScores.entries())
    .filter(([_, ds]) => ds.score < 60)
    .sort((a, b) => a[1].score - b[1].score);
  
  if (weakDomains.length > 0) {
    weakDomains.forEach(([domain, _]) => {
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