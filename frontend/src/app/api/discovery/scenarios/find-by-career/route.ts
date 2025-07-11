import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { googleCloudStorageService } from '@/services/googleCloudStorage';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const { searchParams } = new URL(request.url);
    const careerType = searchParams.get('career');
    
    if (!careerType) {
      return NextResponse.json({ error: 'Career type required' }, { status: 400 });
    }
    
    // Check user's scenario mappings
    const userScenarioMappingPath = `v2/users/${userEmail}/scenario-mappings.json`;
    
    try {
      const mappingData = await googleCloudStorageService.readFile(userScenarioMappingPath);
      const userScenarioMappings = JSON.parse(mappingData);
      
      // Find scenario ID for this career type
      for (const [scenarioId, mappedCareerType] of Object.entries(userScenarioMappings)) {
        if (mappedCareerType === careerType) {
          // Verify the scenario still exists
          try {
            const scenarioPath = `v2/scenarios/${scenarioId}.json`;
            await googleCloudStorageService.readFile(scenarioPath);
            
            return NextResponse.json({ scenarioId });
          } catch (error) {
            // Scenario doesn't exist anymore, continue searching
            console.log(`Scenario ${scenarioId} not found, continuing search`);
          }
        }
      }
    } catch (error) {
      // No mapping file exists yet
      console.log('No user scenario mappings found');
    }
    
    // No existing scenario found
    return NextResponse.json({ scenarioId: null });
  } catch (error) {
    console.error('Error in GET /api/discovery/scenarios/find-by-career:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}