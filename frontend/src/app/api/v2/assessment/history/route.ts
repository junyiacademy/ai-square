import { NextRequest, NextResponse } from 'next/server';
import { AssessmentStorageService } from '@/lib/v2/services/assessment-storage.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get('assessmentId');
    
    // Get user email from session/auth (placeholder for now)
    const userEmail = 'demo@example.com'; // TODO: Get from auth
    
    const storageService = new AssessmentStorageService();
    
    // Get all assessments for the user
    const sessions = await storageService.getUserAssessments(userEmail);
    
    // Filter by assessment ID if provided
    const filteredSessions = assessmentId
      ? sessions.filter(s => {
          // Match by assessment type or ID pattern
          // Since we're using sessionType like 'comprehensive', we need to map it
          const assessmentTypeMap: Record<string, string> = {
            'comprehensive': 'comprehensive',
            'quick': 'quick-literacy',
            'domain': 'engaging-domain', // Could be any domain
            'adaptive': 'adaptive-personalized'
          };
          
          // Check if the session matches the requested assessment
          return s.sessionType === assessmentId || 
                 assessmentTypeMap[s.sessionType] === assessmentId ||
                 (s.config.domains && s.config.domains.length === 1 && assessmentId.includes('domain'));
        })
      : sessions;
    
    // Transform sessions to attempt format
    const attempts = filteredSessions
      .filter(s => s.status === 'completed' && s.results)
      .map(session => ({
        id: session.id,
        completedAt: session.completedAt!,
        score: session.results!.overallScore,
        correctAnswers: session.results!.correctAnswers,
        totalQuestions: session.results!.totalQuestions,
        timeSpent: session.results!.timeSpent,
        passed: session.results!.passed,
        performance: session.results!.performance,
        domainScores: session.results!.domainScores,
        ksaScores: session.results!.ksaScores
      }))
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    
    // Get user analytics
    const analytics = await storageService.getUserAnalytics(userEmail);
    
    return NextResponse.json({
      attempts,
      analytics,
      totalAttempts: attempts.length
    });
  } catch (error) {
    console.error('Error fetching assessment history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment history' },
      { status: 500 }
    );
  }
}