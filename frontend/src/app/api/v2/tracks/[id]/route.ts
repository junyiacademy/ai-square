/**
 * V2 Track by ID API
 * GET /api/v2/tracks/[id] - Get track with full hierarchy
 */

import { NextRequest, NextResponse } from 'next/server';
import { PBLServiceV2 } from '@/lib/v2/services/pbl-service';
import { getMockDatabase } from '@/lib/v2/utils/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trackId = params.id;
    
    const db = getMockDatabase();
    const service = new PBLServiceV2(db);
    
    const track = await service.getTrackWithHierarchy(trackId);
    
    if (!track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: track
    });
  } catch (error) {
    console.error('Error fetching track:', error);
    return NextResponse.json(
      { error: 'Failed to fetch track' },
      { status: 500 }
    );
  }
}