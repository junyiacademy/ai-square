/**
 * V2 Tracks API
 * POST /api/v2/tracks - Create a new track with flexible structure
 * GET /api/v2/tracks - Get all tracks
 */

import { NextRequest, NextResponse } from 'next/server';
import { PBLServiceV2 } from '@/lib/v2/services/pbl-service';
import { DiscoveryServiceV2 } from '@/lib/v2/services/discovery-service';
import { AssessmentServiceV2 } from '@/lib/v2/services/assessment-service';
import { CreateTrackOptions } from '@/lib/v2/types';
import { getMockDatabase } from '@/lib/v2/utils/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackData, options } = body as {
      trackData: any;
      options?: CreateTrackOptions;
    };

    // Validate required fields
    if (!trackData.title || !trackData.code) {
      return NextResponse.json(
        { error: 'Title and code are required' },
        { status: 400 }
      );
    }

    // Get the appropriate service based on structure type
    const db = getMockDatabase();
    let service;
    
    const structureType = options?.structure_type || trackData.structure_type || 'standard';
    
    switch (structureType) {
      case 'standard':
        service = new PBLServiceV2(db);
        break;
      case 'single_program':
        service = new DiscoveryServiceV2(db);
        break;
      case 'direct_task':
        service = new AssessmentServiceV2(db);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid structure type' },
          { status: 400 }
        );
    }

    // Create the track
    const track = await service.createTrack(trackData, options);

    return NextResponse.json({
      success: true,
      data: track
    });
  } catch (error) {
    console.error('Error creating track:', error);
    return NextResponse.json(
      { error: 'Failed to create track' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const structureType = searchParams.get('structure_type');
    
    const db = getMockDatabase();
    const pblService = new PBLServiceV2(db);
    
    let tracks;
    if (structureType) {
      tracks = await pblService.getTracksByStructureType(
        structureType as 'standard' | 'direct_task' | 'single_program'
      );
    } else {
      // Get all tracks
      const trackRepo = pblService['trackRepo'];
      tracks = await trackRepo.findAll();
    }

    return NextResponse.json({
      success: true,
      data: tracks
    });
  } catch (error) {
    console.error('Error fetching tracks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracks' },
      { status: 500 }
    );
  }
}