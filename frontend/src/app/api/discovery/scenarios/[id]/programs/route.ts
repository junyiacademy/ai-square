import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { googleCloudStorageService } from '@/services/googleCloudStorage';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check session token from header
    const sessionToken = request.headers.get('x-session-token');
    
    const session = await getServerSession();
    if (!session?.user?.email) {
      console.log('No session found in programs POST, token:', sessionToken ? 'present' : 'missing');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scenarioId = params.id;
    const userEmail = session.user.email;
    
    // Generate new program ID (no prefix needed per unified architecture)
    const programId = uuidv4();
    
    // Create program metadata
    const programData = {
      id: programId,
      scenarioId: scenarioId,
      userEmail: userEmail,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      status: 'active' as const,
      completedTasks: 0,
      totalTasks: 10, // Default number of tasks
      totalXP: 0,
      tasks: []
    };
    
    // Save program in flat structure
    await googleCloudStorageService.saveFile(
      `v2/programs/${programId}.json`,
      JSON.stringify(programData, null, 2)
    );
    
    // Update scenario's lastActiveAt (scenarios no longer store program arrays in flat structure)
    try {
      const scenarioPath = `v2/scenarios/${scenarioId}.json`;
      const scenarioDataStr = await googleCloudStorageService.readFile(scenarioPath);
      const scenarioData = JSON.parse(scenarioDataStr);
      
      scenarioData.lastActiveAt = new Date().toISOString();
      
      await googleCloudStorageService.saveFile(
        scenarioPath,
        JSON.stringify(scenarioData, null, 2)
      );
    } catch (error) {
      console.error('Error updating scenario lastActiveAt:', error);
      // Continue even if scenario update fails
    }
    
    // Also update user's v2 data to track this program
    try {
      const userPath = `v2/users/${userEmail}/discovery.json`;
      let userDiscoveryData;
      
      try {
        const existingData = await googleCloudStorageService.readFile(userPath);
        userDiscoveryData = JSON.parse(existingData);
      } catch {
        userDiscoveryData = {
          activePrograms: [],
          completedPrograms: [],
          totalXP: 0,
          achievements: []
        };
      }
      
      // Add to active programs
      if (!userDiscoveryData.activePrograms) {
        userDiscoveryData.activePrograms = [];
      }
      
      userDiscoveryData.activePrograms.push({
        programId: programId,
        scenarioId: scenarioId,
        startedAt: new Date().toISOString()
      });
      
      await googleCloudStorageService.saveFile(
        userPath,
        JSON.stringify(userDiscoveryData, null, 2)
      );
    } catch (error) {
      console.error('Error updating user discovery data:', error);
      // Continue even if user data update fails
    }
    
    return NextResponse.json(programData);
  } catch (error) {
    console.error('Error in POST /api/discovery/scenarios/[id]/programs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}