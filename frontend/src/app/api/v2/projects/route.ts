import { NextRequest, NextResponse } from 'next/server';
import { TrackService } from '@/lib/v2/services/track-service';

/**
 * GET /api/v2/projects
 * Get all available projects (scenarios)
 */
export async function GET(request: NextRequest) {
  try {
    const service = new TrackService();
    const result = await service.getProjects();
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/v2/projects:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}