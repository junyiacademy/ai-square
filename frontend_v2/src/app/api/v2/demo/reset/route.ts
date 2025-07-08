/**
 * V2 Demo Reset API Route
 * Resets demo data for testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { resetDemoData } from '@/lib/v2/demo/init-demo';

// POST /api/v2/demo/reset
export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Demo reset only available in development' },
        { status: 403 }
      );
    }

    await resetDemoData();

    return NextResponse.json({
      message: 'Demo data reset successfully'
    });
  } catch (error) {
    console.error('Error resetting demo data:', error);
    return NextResponse.json(
      { error: 'Failed to reset demo data' },
      { status: 500 }
    );
  }
}