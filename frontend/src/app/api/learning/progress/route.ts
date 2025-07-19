/**
 * Learning Progress API Route
 * GET /api/learning/progress - Get user learning progress
 */

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { postgresqlLearningService } from '@/lib/services/postgresql-learning-service';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get learning progress
    const result = await postgresqlLearningService.getLearningProgress(session.user.email);

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error getting learning progress:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}