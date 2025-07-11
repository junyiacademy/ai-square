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
    
    const body = await request.json();
    const { taskId } = body;
    
    // Await params before using
    const { programId } = await params;
    
    const programRepo = getProgramRepository();
    const taskRepo = getTaskRepository();
    const evaluationRepo = getEvaluationRepository();
    
    // Get program and task
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== user.email) {
      return NextResponse.json(
        { error: 'Program not found or access denied' },
        { status: 404 }
      );
    }
    
    const task = await taskRepo.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Complete the task
    await taskRepo.complete(taskId);
    
    // Calculate scores
    const answers = task.interactions.filter(i => i.type === 'user_input');
    const totalQuestions = 20; // Assessment has 20 questions
    const correctAnswers = answers.filter(a => (a.content as any).isCorrect).length;
    const overallScore = Math.round((correctAnswers / totalQuestions) * 100);
    
    // Calculate domain scores - simplified for now as assessment answers don't have domain info
    const domainScores: Map<string, DomainScore> = new Map();
    
    // Initialize four domains with equal distribution
    const domains = ['Engaging_with_AI', 'Creating_with_AI', 'Managing_with_AI', 'Designing_with_AI'];
    domains.forEach(domain => {
      domainScores.set(domain, {
        domain,
        totalQuestions: 5, // 20 questions / 4 domains
        correctAnswers: Math.floor(correctAnswers / 4),
        score: overallScore,
        competencies: new Set(),
        ksa: {
          knowledge: new Set(),
          skills: new Set(),
          attitudes: new Set()
        }
      });
    });
    
    // Calculate domain scores
    domainScores.forEach(domainScore => {
      domainScore.score = Math.round((domainScore.correctAnswers / domainScore.totalQuestions) * 100);
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
    
    // KSA Analysis
    const allKnowledge = new Set<string>();
    const allSkills = new Set<string>();
    const allAttitudes = new Set<string>();
    const weakKnowledge = new Set<string>();
    const weakSkills = new Set<string>();
    const weakAttitudes = new Set<string>();
    
    domainScores.forEach(ds => {
      ds.ksa.knowledge.forEach(k => allKnowledge.add(k));
      ds.ksa.skills.forEach(s => allSkills.add(s));
      ds.ksa.attitudes.forEach(a => allAttitudes.add(a));
      
      if (ds.score < 60) {
        ds.ksa.knowledge.forEach(k => weakKnowledge.add(k));
        ds.ksa.skills.forEach(s => weakSkills.add(s));
        ds.ksa.attitudes.forEach(a => weakAttitudes.add(a));
      }
    });
    
    // Create evaluation
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
            score: allKnowledge.size > 0 ? Math.round((1 - weakKnowledge.size / allKnowledge.size) * 100) : 0,
            strong: Array.from(allKnowledge).filter(k => !weakKnowledge.has(k)).slice(0, 3),
            weak: Array.from(weakKnowledge).slice(0, 3)
          },
          skills: {
            score: allSkills.size > 0 ? Math.round((1 - weakSkills.size / allSkills.size) * 100) : 0,
            strong: Array.from(allSkills).filter(s => !weakSkills.has(s)).slice(0, 3),
            weak: Array.from(weakSkills).slice(0, 3)
          },
          attitudes: {
            score: allAttitudes.size > 0 ? Math.round((1 - weakAttitudes.size / allAttitudes.size) * 100) : 0,
            strong: Array.from(allAttitudes).filter(a => !weakAttitudes.has(a)).slice(0, 3),
            weak: Array.from(weakAttitudes).slice(0, 3)
          }
        }
      },
      createdAt: new Date().toISOString()
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
    
    // Also save to assessment results for history page
    // Create assessment result data compatible with history
    const assessmentResult = {
      overallScore,
      domainScores: Object.fromEntries(
        Array.from(domainScores.entries()).map(([domain, ds]) => [domain, ds.score])
      ),
      totalQuestions,
      correctAnswers,
      level,
      recommendations,
      completedAt: new Date().toISOString(),
      timeSpentSeconds: completionTime
    };
    
    // Save to assessment results storage
    const assessmentId = `asmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const resultData = {
      assessment_id: assessmentId,
      user_id: user.id || user.email,
      user_email: user.email,
      timestamp: new Date().toISOString(),
      duration_seconds: completionTime,
      language: program.metadata?.language || 'en',
      scores: {
        overall: overallScore,
        domains: assessmentResult.domainScores,
      },
      summary: {
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        level: level,
      },
      answers: answers.map((answer: any) => ({
        question_id: answer.content.questionId,
        selected: answer.content.selectedAnswer,
        correct: answer.content.isCorrect ? answer.content.selectedAnswer : 'n/a',
        time_spent: answer.content.timeSpent || 0,
        ksa_mapping: answer.content.ksa_mapping || undefined,
      })),
    };
    
    // Save using the assessment results API
    const saveResponse = await fetch(`${request.nextUrl.origin}/api/assessment/results`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        userId: user.id || user.email,
        userEmail: user.email,
        language: program.metadata?.language || 'en',
        answers: answers.map((a: any) => ({
          questionId: a.content.questionId,
          selectedAnswer: a.content.selectedAnswer,
          isCorrect: a.content.isCorrect,
          timeSpent: a.content.timeSpent
        })),
        questions: [], // Assessment questions are dynamically generated
        result: assessmentResult
      })
    });
    
    if (!saveResponse.ok) {
      console.error('Failed to save assessment result:', await saveResponse.text());
    }
    
    return NextResponse.json({ 
      success: true,
      evaluationId: evaluation.id,
      score: overallScore,
      assessmentId
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