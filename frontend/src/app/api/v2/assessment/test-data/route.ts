import { NextRequest, NextResponse } from 'next/server';
import { AssessmentStorageService } from '@/lib/v2/services/assessment-storage.service';
import { AssessmentSession } from '@/lib/v2/schemas/assessment.schema';

// Generate mock assessment data for testing
export async function POST(request: NextRequest) {
  try {
    const { assessmentId = 'comprehensive', count = 3 } = await request.json();
    
    const userEmail = 'demo@example.com';
    const storageService = new AssessmentStorageService();
    
    // Generate mock sessions
    const sessions: AssessmentSession[] = [];
    
    for (let i = 0; i < count; i++) {
      const sessionId = `test_session_${Date.now()}_${i}`;
      const correctAnswers = Math.floor(Math.random() * 10) + 20; // 20-30
      const totalQuestions = 30;
      const overallScore = Math.round((correctAnswers / totalQuestions) * 100);
      
      const session: AssessmentSession = {
        id: sessionId,
        userEmail,
        sessionType: assessmentId,
        startedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000 - 45 * 60 * 1000).toISOString(), // Days ago
        completedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        config: {
          totalQuestions,
          passingScore: 60,
          domains: ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai'],
          language: 'en'
        },
        responses: Array.from({ length: totalQuestions }, (_, idx) => ({
          questionId: `q${idx + 1}`,
          answer: ['a', 'b', 'c', 'd'][Math.floor(Math.random() * 4)],
          timeSpent: Math.floor(Math.random() * 60) + 30,
          timestamp: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString()
        })),
        results: {
          overallScore,
          correctAnswers,
          totalQuestions,
          timeSpent: 2700 + Math.floor(Math.random() * 900), // 45-60 minutes
          performance: overallScore >= 80 ? 'excellent' : 
                      overallScore >= 60 ? 'good' : 
                      overallScore >= 40 ? 'satisfactory' : 
                      'needs-improvement',
          passed: overallScore >= 60,
          domainScores: {
            engaging_with_ai: Math.floor(Math.random() * 30) + 70,
            creating_with_ai: Math.floor(Math.random() * 30) + 60,
            managing_with_ai: Math.floor(Math.random() * 30) + 65,
            designing_with_ai: Math.floor(Math.random() * 30) + 55
          },
          ksaScores: {
            knowledge: Math.floor(Math.random() * 20) + 75,
            skills: Math.floor(Math.random() * 20) + 70,
            attitudes: Math.floor(Math.random() * 20) + 80
          },
          ksaDemonstrated: {
            knowledge: [
              { code: 'K1', name: 'AI Fundamentals', mastery: 2, correct: 5, total: 6, tasks: ['q1', 'q2'] },
              { code: 'K2', name: 'Machine Learning', mastery: 1, correct: 3, total: 5, tasks: ['q3', 'q4'] }
            ],
            skills: [
              { code: 'S1', name: 'Prompt Engineering', mastery: 2, correct: 4, total: 4, tasks: ['q5', 'q6'] },
              { code: 'S2', name: 'AI Tool Usage', mastery: 1, correct: 2, total: 3, tasks: ['q7', 'q8'] }
            ],
            attitudes: [
              { code: 'A1', name: 'Ethical Consideration', mastery: 2, correct: 3, total: 3, tasks: ['q9', 'q10'] },
              { code: 'A2', name: 'Critical Thinking', mastery: 0, correct: 1, total: 3, tasks: ['q11', 'q12'] }
            ]
          },
          certificate: overallScore >= 80 ? {
            id: `cert_${Date.now()}_${i}`,
            issuedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            verificationCode: storageService.generateVerificationCode()
          } : undefined
        },
        createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString()
      };
      
      sessions.push(session);
      
      // Save to storage
      await storageService.saveAssessmentSession(session);
    }
    
    return NextResponse.json({
      message: `Created ${count} test assessment sessions`,
      sessions: sessions.map(s => ({
        id: s.id,
        completedAt: s.completedAt,
        score: s.results?.overallScore,
        passed: s.results?.passed
      }))
    });
  } catch (error) {
    console.error('Error creating test data:', error);
    return NextResponse.json(
      { error: 'Failed to create test data' },
      { status: 500 }
    );
  }
}