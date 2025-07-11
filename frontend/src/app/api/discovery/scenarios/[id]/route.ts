import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { googleCloudStorageService } from '@/services/googleCloudStorage';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check session token from header first
    const sessionToken = request.headers.get('x-session-token');
    
    const session = await getServerSession();
    if (!session?.user?.email) {
      console.log('No session found, token:', sessionToken ? 'present' : 'missing');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scenarioId = params.id;
    const userEmail = session.user.email;
    
    // Get career type from query params
    const { searchParams } = new URL(request.url);
    const careerType = searchParams.get('career');
    
    // First, check if this user has a scenario mapping
    const userScenarioMappingPath = `v2/users/${userEmail}/scenario-mappings.json`;
    let userScenarioMappings: Record<string, string> = {};
    
    try {
      const mappingData = await googleCloudStorageService.readFile(userScenarioMappingPath);
      userScenarioMappings = JSON.parse(mappingData);
    } catch (error) {
      // No mapping file exists yet, that's ok
      console.log('No user scenario mappings found, will create if needed');
    }
    
    // Check if scenario data exists in GCS (flat structure)
    const scenarioPath = `v2/scenarios/${scenarioId}.json`;
    
    let scenarioData;
    
    try {
      // Try to read existing scenario
      const existingData = await googleCloudStorageService.readFile(scenarioPath);
      scenarioData = JSON.parse(existingData);
      
      // If career type is provided in query params and different from stored, update it
      if (careerType && scenarioData.careerType !== careerType) {
        scenarioData.careerType = careerType;
        if (scenarioData.sourceRef?.metadata) {
          scenarioData.sourceRef.metadata.careerType = careerType;
        }
        await googleCloudStorageService.saveFile(
          scenarioPath,
          JSON.stringify(scenarioData, null, 2)
        );
      }
    } catch (error) {
      // If scenario doesn't exist, create initial structure
      console.log('Creating new scenario data for:', scenarioId);
      
      // Use career type from query params or try to get from user mapping
      const resolvedCareerType = careerType || userScenarioMappings[scenarioId] || undefined;
      
      // Following unified learning architecture
      scenarioData = {
        id: scenarioId,
        userEmail: userEmail,  // Add user ownership
        sourceType: 'discovery',  // As per unified architecture
        sourceRef: {
          type: 'career',
          sourceId: resolvedCareerType || 'unknown',
          metadata: {
            careerType: resolvedCareerType
          }
        },
        title: `Discovery Scenario - ${resolvedCareerType || 'Unknown'}`,
        description: `Learning scenario for ${resolvedCareerType} career path`,
        careerType: resolvedCareerType,  // Keep for backward compatibility
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      };
      
      // Save scenario
      await googleCloudStorageService.saveFile(
        scenarioPath,
        JSON.stringify(scenarioData, null, 2)
      );
    }
    
    // Update user scenario mapping if career type is provided
    if (careerType && userScenarioMappings[scenarioId] !== careerType) {
      userScenarioMappings[scenarioId] = careerType;
      await googleCloudStorageService.saveFile(
        userScenarioMappingPath,
        JSON.stringify(userScenarioMappings, null, 2)
      );
    }
    
    // If no career type in scenario data, try to get from user mapping
    if (!scenarioData.careerType && userScenarioMappings[scenarioId]) {
      scenarioData.careerType = userScenarioMappings[scenarioId];
    }
    
    // Load programs for this user using flat structure
    const userPrograms: any[] = [];
    
    // Query all programs belonging to this scenario and user
    try {
      // List all program files
      const programFiles = await googleCloudStorageService.listFiles('v2/programs/');
      
      // Filter and load programs for this scenario and user
      for (const fileName of programFiles) {
        if (fileName.endsWith('.json')) {
          try {
            const programData = await googleCloudStorageService.readFile(fileName);
            const program = JSON.parse(programData);
            
            // Check if program belongs to this scenario and user
            if (program.scenarioId === scenarioId && program.userEmail === userEmail) {
              // Calculate progress
              const progress = program.totalTasks > 0 
                ? Math.round((program.completedTasks / program.totalTasks) * 100)
                : 0;
              
              userPrograms.push({
                ...program,
                progress
              });
            }
          } catch (error) {
            console.error('Error loading program:', fileName, error);
          }
        }
      }
    } catch (error) {
      console.error('Error listing programs:', error);
      // Continue without programs if listing fails
    }
    
    // Sort programs by lastActiveAt (most recent first)
    userPrograms.sort((a, b) => 
      new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
    );
    
    return NextResponse.json({
      ...scenarioData,
      programs: userPrograms
    });
  } catch (error) {
    console.error('Error in GET /api/discovery/scenarios/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}