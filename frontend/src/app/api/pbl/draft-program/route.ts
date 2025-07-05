import { NextRequest, NextResponse } from 'next/server';
import { ensureServices } from '@/lib/core/services/api-helpers';
import { TrackType } from '@/lib/core/track/types';
import { ProgramType, ProgramStatus } from '@/lib/core/program/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');
    
    if (!scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Scenario ID is required' },
        { status: 400 }
      );
    }
    
    // Get user info from cookie
    let userEmail: string | undefined;
    try {
      const userCookie = request.cookies.get('user')?.value;
      if (userCookie) {
        const user = JSON.parse(userCookie);
        userEmail = user.email;
      }
    } catch {
      console.log('No user cookie found');
    }
    
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }
    
    // Use new architecture
    const services = await ensureServices();
    
    console.log('[draft-program] Looking for tracks with:', {
      userId: userEmail,
      type: TrackType.PBL,
      projectId: scenarioId
    });
    
    // Find PBL tracks for this scenario
    // Make sure to pass userId to avoid the unimplemented index query
    const tracks = await services.trackService.queryTracks({
      userId: userEmail,
      type: TrackType.PBL,
      projectId: scenarioId
    });
    
    console.log('[draft-program] Found tracks:', tracks.length);
    if (tracks.length > 0) {
      console.log('[draft-program] First track:', {
        id: tracks[0].id,
        projectId: tracks[0].projectId,
        type: tracks[0].type,
        metadata: tracks[0].metadata
      });
    }
    
    // Find draft programs in these tracks
    for (const track of tracks) {
      console.log('[draft-program] Querying programs for track:', track.id);
      
      const programs = await services.programService.queryPrograms({
        trackId: track.id,
        userId: userEmail,
        type: ProgramType.PBL,
        status: ProgramStatus.NOT_STARTED  // Draft status (NOT_STARTED = draft)
      });
      
      console.log('[draft-program] Found programs:', programs.length);
      if (programs.length > 0) {
        console.log('[draft-program] First program:', {
          id: programs[0].id,
          status: programs[0].status,
          type: programs[0].type,
          trackId: programs[0].trackId
        });
      }
      
      // Return the most recent draft program
      if (programs.length > 0) {
        const draftProgram = programs.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
        
        // Get tasks count
        const tasks = await services.taskService.queryTasks({
          programId: draftProgram.id,
          userId: userEmail
        });
        
        return NextResponse.json({
          success: true,
          program: {
            id: draftProgram.id,
            scenarioId: draftProgram.config?.scenarioId || scenarioId,
            scenarioTitle: draftProgram.title,
            status: 'draft',
            startedAt: draftProgram.startedAt?.toISOString() || draftProgram.createdAt.toISOString(),
            updatedAt: draftProgram.updatedAt.toISOString(),
            totalTasks: tasks.length,
            language: draftProgram.metadata?.language || 'en'
          }
        });
      }
    }
    
    // No draft program found
    return NextResponse.json({
      success: false,
      error: 'No draft program found'
    });
    
  } catch (error) {
    console.error('Error checking draft program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check draft program' },
      { status: 500 }
    );
  }
}