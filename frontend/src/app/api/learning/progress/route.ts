/**
 * Learning Progress API Route
 * GET /api/learning/progress - Get user learning progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { UnifiedLearningService } from '@/lib/implementations/gcs-v2/services/unified-learning-service';

export async function GET(request: NextRequest) {
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
    const service = new UnifiedLearningService();
    const result = await service.getLearningProgress(session.user.email);

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