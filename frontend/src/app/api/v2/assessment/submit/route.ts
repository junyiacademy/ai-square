import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { AssessmentStorageService } from '@/lib/v2/services/assessment-storage.service';
import { AssessmentSession } from '@/lib/v2/schemas/assessment.schema';

interface SubmitRequest {
  sessionId?: string;
  assessmentId?: string;
  assessmentType?: string;
  responses: Array<{
    questionId: string;
    answer: string | null;
    timeSpent: number;
  }>;
  totalTimeSpent: number;
  completedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitRequest = await request.json();
    
    // Get user email from session/auth (placeholder for now)
    const userEmail = 'demo@example.com'; // TODO: Get from auth
    
    // Load questions to verify answers
    const yamlPath = path.join(process.cwd(), 'public', 'assessment_data', 'ai_literacy_questions.yaml');
    const yamlContent = await fs.readFile(yamlPath, 'utf8');
    const data = yaml.load(yamlContent) as any;
    
    const questions = data.questions;
    const questionsMap = new Map(questions.map((q: any) => [q.id, q]));
    
    // Calculate results
    let correctAnswers = 0;
    const detailedResults: any[] = [];
    const ksaDemonstrated = {
      knowledge: new Map<string, { correct: number; total: number; tasks: string[] }>(),
      skills: new Map<string, { correct: number; total: number; tasks: string[] }>(),
      attitudes: new Map<string, { correct: number; total: number; tasks: string[] }>()
    };
    
    // Domain scores
    const domainScores: Record<string, { correct: number; total: number }> = {
      engaging_with_ai: { correct: 0, total: 0 },
      creating_with_ai: { correct: 0, total: 0 },
      managing_with_ai: { correct: 0, total: 0 },
      designing_with_ai: { correct: 0, total: 0 }
    };
    
    // Process each response
    for (const response of body.responses) {
      const question = questionsMap.get(response.questionId);
      if (!question) continue;
      
      const isCorrect = response.answer === question.correct_answer;
      if (isCorrect) correctAnswers++;
      
      // Update domain scores
      if (domainScores[question.domain]) {
        domainScores[question.domain].total++;
        if (isCorrect) domainScores[question.domain].correct++;
      }
      
      // Update KSA mapping
      const ksaMapping = question.ksa_mapping;
      if (ksaMapping) {
        // Knowledge
        for (const code of ksaMapping.knowledge || []) {
          if (!ksaDemonstrated.knowledge.has(code)) {
            ksaDemonstrated.knowledge.set(code, { correct: 0, total: 0, tasks: [] });
          }
          const ksa = ksaDemonstrated.knowledge.get(code)!;
          ksa.total++;
          if (isCorrect) ksa.correct++;
          ksa.tasks.push(response.questionId);
        }
        
        // Skills
        for (const code of ksaMapping.skills || []) {
          if (!ksaDemonstrated.skills.has(code)) {
            ksaDemonstrated.skills.set(code, { correct: 0, total: 0, tasks: [] });
          }
          const ksa = ksaDemonstrated.skills.get(code)!;
          ksa.total++;
          if (isCorrect) ksa.correct++;
          ksa.tasks.push(response.questionId);
        }
        
        // Attitudes
        for (const code of ksaMapping.attitudes || []) {
          if (!ksaDemonstrated.attitudes.has(code)) {
            ksaDemonstrated.attitudes.set(code, { correct: 0, total: 0, tasks: [] });
          }
          const ksa = ksaDemonstrated.attitudes.get(code)!;
          ksa.total++;
          if (isCorrect) ksa.correct++;
          ksa.tasks.push(response.questionId);
        }
      }
      
      detailedResults.push({
        questionId: response.questionId,
        domain: question.domain,
        difficulty: question.difficulty,
        correct: isCorrect,
        userAnswer: response.answer,
        correctAnswer: question.correct_answer,
        explanation: question.explanation,
        timeSpent: response.timeSpent,
        ksa: ksaMapping
      });
    }
    
    // Calculate scores
    const totalQuestions = body.responses.length;
    const overallScore = Math.round((correctAnswers / totalQuestions) * 100);
    
    // Calculate domain percentages
    const domainScoresPercent: Record<string, number> = {};
    for (const [domain, scores] of Object.entries(domainScores)) {
      domainScoresPercent[domain] = scores.total > 0 
        ? Math.round((scores.correct / scores.total) * 100)
        : 0;
    }
    
    // Calculate KSA scores
    const ksaScores = {
      knowledge: 0,
      skills: 0,
      attitudes: 0
    };
    
    // Convert KSA maps to arrays and calculate scores
    const ksaArrays: any = {
      knowledge: [],
      skills: [],
      attitudes: []
    };
    
    for (const [type, ksaMap] of Object.entries(ksaDemonstrated)) {
      let totalCorrect = 0;
      let totalQuestions = 0;
      
      for (const [code, data] of ksaMap.entries()) {
        totalCorrect += data.correct;
        totalQuestions += data.total;
        
        // Get mastery level (0=red, 1=yellow, 2=green)
        const mastery = data.total === 0 ? 0 : 
                       data.correct === 0 ? 0 :
                       data.correct === data.total ? 2 : 1;
        
        ksaArrays[type].push({
          code,
          name: code, // TODO: Load from KSA codes YAML
          description: `Competency ${code}`,
          competencies: [],
          mastery,
          correct: data.correct,
          total: data.total,
          tasks: data.tasks
        });
      }
      
      ksaScores[type as keyof typeof ksaScores] = totalQuestions > 0 
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;
    }
    
    // Prepare completion data
    const completionData = {
      completedAt: new Date(body.completedAt),
      timeSpent: body.totalTimeSpent,
      tasksCompleted: totalQuestions,
      totalTasks: totalQuestions,
      completionRate: 100,
      overallScore,
      performance: overallScore >= 80 ? 'excellent' as const : 
                  overallScore >= 60 ? 'good' as const : 
                  overallScore >= 40 ? 'satisfactory' as const : 
                  'needs-improvement' as const,
      domainScores: domainScoresPercent,
      ksaScores,
      ksaDemonstrated: ksaArrays,
      keyAchievements: [
        `Completed ${totalQuestions} assessment questions`,
        `Achieved ${overallScore}% overall score`,
        correctAnswers >= totalQuestions * 0.8 ? 'Demonstrated strong AI literacy' : 
        correctAnswers >= totalQuestions * 0.6 ? 'Showed good understanding of AI concepts' :
        'Identified areas for improvement'
      ],
      skillsDeveloped: [
        'AI Literacy Assessment',
        'Critical Thinking',
        'AI Ethics Understanding',
        'Practical AI Application'
      ],
      nextSteps: overallScore >= 80 ? [
        'Explore advanced AI topics',
        'Apply knowledge in real-world scenarios',
        'Consider mentoring others'
      ] : overallScore >= 60 ? [
        'Review incorrect answers',
        'Practice with more scenarios',
        'Strengthen weak domains'
      ] : [
        'Review fundamental concepts',
        'Take practice assessments',
        'Focus on understanding basic AI principles'
      ],
      recommendedActions: [
        {
          label: 'View Detailed Results',
          action: () => {},
          variant: 'primary' as const
        },
        {
          label: 'View All Results',
          action: () => {},
          variant: 'secondary' as const
        },
        {
          label: 'Retake Assessment',
          action: () => {},
          variant: 'secondary' as const
        }
      ],
      // Include assessment metadata for navigation
      assessmentId: body.assessmentId || 'comprehensive',
      sessionId: body.sessionId || sessionId,
      
      // Assessment-specific data
      level: overallScore >= 80 ? 'advanced' as const : 
             overallScore >= 60 ? 'intermediate' as const : 
             'beginner' as const,
      correctAnswers,
      totalQuestions,
      recommendations: [
        domainScoresPercent.engaging_with_ai < 60 ? 'Strengthen your understanding of engaging with AI systems' : '',
        domainScoresPercent.creating_with_ai < 60 ? 'Practice more with AI creative tools' : '',
        domainScoresPercent.managing_with_ai < 60 ? 'Learn more about managing AI risks and ethics' : '',
        domainScoresPercent.designing_with_ai < 60 ? 'Explore AI design principles and strategies' : ''
      ].filter(r => r),
      detailedAnalysis: {
        strengths: Object.entries(domainScoresPercent)
          .filter(([_, score]) => score >= 80)
          .map(([domain, score]) => `Strong performance in ${domain.replace(/_/g, ' ')} (${score}%)`),
        weaknesses: Object.entries(domainScoresPercent)
          .filter(([_, score]) => score < 60)
          .map(([domain, score]) => `Need improvement in ${domain.replace(/_/g, ' ')} (${score}%)`),
        opportunities: [
          'Take specialized courses in weak domains',
          'Practice with real-world AI scenarios',
          'Join AI learning communities'
        ]
      },
      
      // Include mock tasks for TaskReview
      tasks: detailedResults.map(result => ({
        id: result.questionId,
        title: `Question ${result.questionId}`,
        type: 'question' as const,
        content: questionsMap.get(result.questionId)?.question || '',
        options: questionsMap.get(result.questionId)?.options,
        correct_answer: result.correctAnswer,
        explanation: result.explanation,
        userResponse: result.userAnswer,
        isCorrect: result.correct,
        timestamp: new Date(body.completedAt)
      }))
    };
    
    // Save to GCS using storage service
    try {
      const storageService = new AssessmentStorageService();
      const sessionId = body.sessionId || `assessment_${Date.now()}`;
      
      // Create assessment session object
      const assessmentSession: AssessmentSession = {
        id: sessionId,
        userEmail,
        sessionType: 'comprehensive',
        startedAt: new Date(Date.now() - body.totalTimeSpent * 1000).toISOString(),
        completedAt: body.completedAt,
        status: 'completed',
        config: {
          totalQuestions,
          passingScore: 60,
          domains: ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai'],
          language: 'en'
        },
        responses: body.responses.map(r => ({
          ...r,
          timestamp: body.completedAt
        })),
        results: {
          overallScore,
          correctAnswers,
          totalQuestions,
          timeSpent: body.totalTimeSpent,
          performance: completionData.performance,
          passed: overallScore >= 60,
          domainScores: domainScoresPercent,
          ksaScores,
          ksaDemonstrated: ksaArrays,
          certificate: overallScore >= 80 ? {
            id: `cert_${Date.now()}`,
            issuedAt: body.completedAt,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
            verificationCode: storageService.generateVerificationCode()
          } : undefined
        },
        createdAt: body.completedAt,
        updatedAt: body.completedAt
      };
      
      await storageService.saveAssessmentSession(assessmentSession);
    } catch (storageError) {
      console.error('Failed to save to GCS:', storageError);
      // Continue without saving - don't fail the assessment
    }
    
    return NextResponse.json(completionData);
  } catch (error) {
    console.error('Error submitting assessment:', error);
    return NextResponse.json(
      { error: 'Failed to submit assessment' },
      { status: 500 }
    );
  }
}