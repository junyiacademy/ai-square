import { NextRequest, NextResponse } from 'next/server';
import { AssessmentStorageService } from '@/lib/v2/services/assessment-storage.service';

export async function GET(request: NextRequest) {
  try {
    // Check authentication using the same pattern as other API routes
    const authCheck = await fetch(new URL('/api/auth/check', request.url));
    if (!authCheck.ok) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const authData = await authCheck.json();
    if (!authData.authenticated || !authData.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userEmail = authData.user.email;
    const searchParams = request.nextUrl.searchParams;
    const assessmentId = searchParams.get('assessmentId');

    // Initialize storage service
    const storageService = new AssessmentStorageService();

    // Get all assessments for the user
    const allAssessments = await storageService.getUserAssessments(userEmail);

    // Filter by assessmentId if provided
    let filteredAssessments = allAssessments;
    if (assessmentId) {
      filteredAssessments = allAssessments.filter(
        session => session.assessmentId === assessmentId && session.status === 'completed'
      );
    }

    // Sort by completion date (most recent first)
    filteredAssessments.sort((a, b) => {
      const dateA = new Date(a.completedAt || a.updatedAt || a.startedAt);
      const dateB = new Date(b.completedAt || b.updatedAt || b.startedAt);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({
      success: true,
      data: filteredAssessments
    });

  } catch (error) {
    console.error('Error loading assessment history:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load assessment history',
        data: []
      },
      { status: 500 }
    );
  }
}