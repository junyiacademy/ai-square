/**
 * V2 Discovery Start API
 * POST /api/v2/discovery/start - Start a new discovery session
 */

import { NextRequest, NextResponse } from 'next/server';
import { DiscoveryServiceV2 } from '@/lib/v2/services/discovery-service';
import { DiscoveryStartOptions } from '@/lib/v2/types';
import { getMockDatabase } from '@/lib/v2/utils/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const options = body as DiscoveryStartOptions;

    // Validate required fields
    if (!options.topic || !options.language) {
      return NextResponse.json(
        { error: 'Topic and language are required' },
        { status: 400 }
      );
    }

    const db = getMockDatabase();
    const service = new DiscoveryServiceV2(db);
    
    // Start the discovery session
    const discovery = await service.startDiscovery(options);

    // Get the first task to start with
    const firstTask = discovery.programs[0]?.tasks[0];
    
    return NextResponse.json({
      success: true,
      data: {
        discovery,
        start_url: firstTask 
          ? `/v2/discovery/${discovery.id}/task/${firstTask.id}`
          : `/v2/discovery/${discovery.id}`,
        track_id: discovery.id,
        program_id: discovery.programs[0]?.id,
        first_task_id: firstTask?.id
      }
    });
  } catch (error) {
    console.error('Error starting discovery:', error);
    return NextResponse.json(
      { error: 'Failed to start discovery session' },
      { status: 500 }
    );
  }
}