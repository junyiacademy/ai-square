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
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
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
    const answers = task.interactions.filter(i => i.type === 'assessment_answer');
    const totalQuestions = task.content.questions?.length || 0;
    const correctAnswers = answers.filter(a => a.content.isCorrect).length;
    const overallScore = Math.round((correctAnswers / totalQuestions) * 100);
    
    // Calculate domain scores
    const domainScores: Map<string, DomainScore> = new Map();
    
    answers.forEach(answer => {
      const domain = answer.content.domain;
      if (!domain) return;
      
      if (!domainScores.has(domain)) {
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
      }
      
      const domainScore = domainScores.get(domain)!;
      domainScore.totalQuestions++;
      if (answer.content.isCorrect) {
        domainScore.correctAnswers++;
      }
      
      // Track KSA
      if (answer.content.ksa_mapping) {
        answer.content.ksa_mapping.knowledge?.forEach((k: string) => domainScore.ksa.knowledge.add(k));
        answer.content.ksa_mapping.skills?.forEach((s: string) => domainScore.ksa.skills.add(s));
        answer.content.ksa_mapping.attitudes?.forEach((a: string) => domainScore.ksa.attitudes.add(a));
      }
    });
    
    // Calculate domain scores
    domainScores.forEach(domainScore => {
      domainScore.score = Math.round((domainScore.correctAnswers / domainScore.totalQuestions) * 100);
    });
    
    // Calculate time spent
    const startTime = program.metadata?.startTime || Date.parse(program.startedAt);
    const completionTime = Math.floor((Date.now() - startTime) / 1000);
    
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
        name: ds.domain,
        score: ds.score,
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
            score: Math.round((1 - weakKnowledge.size / allKnowledge.size) * 100),
            strong: Array.from(allKnowledge).filter(k => !weakKnowledge.has(k)).slice(0, 3),
            weak: Array.from(weakKnowledge).slice(0, 3)
          },
          skills: {
            score: Math.round((1 - weakSkills.size / allSkills.size) * 100),
            strong: Array.from(allSkills).filter(s => !weakSkills.has(s)).slice(0, 3),
            weak: Array.from(weakSkills).slice(0, 3)
          },
          attitudes: {
            score: Math.round((1 - weakAttitudes.size / allAttitudes.size) * 100),
            strong: Array.from(allAttitudes).filter(a => !weakAttitudes.has(a)).slice(0, 3),
            weak: Array.from(weakAttitudes).slice(0, 3)
          }
        }
      }
    });
    
    // Update program score and complete it
    await programRepo.update(programId, { 
      score: overallScore,
      metadata: {
        ...program.metadata,
        completionTime,
        evaluationId: evaluation.id
      }
    });
    await programRepo.complete(programId);
    
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