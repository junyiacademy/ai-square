import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getScenarioRepository, getProgramRepository } from '@/lib/implementations/gcs-v2';

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
    
    // In v2 architecture, we search scenarios by their metadata
    const scenarioRepo = getScenarioRepository();
    const programRepo = getProgramRepository();
    
    // Find all discovery scenarios
    const allScenarios = await scenarioRepo.listAll();
    const discoveryScenarios = allScenarios.filter(s => 
      s.sourceType === 'discovery' && 
      s.sourceRef.metadata?.careerType === careerType
    );
    
    // Check if user has an active program for any of these scenarios
    for (const scenario of discoveryScenarios) {
      const userPrograms = await programRepo.findByScenarioAndUser(scenario.id, userEmail);
      const activeProgram = userPrograms.find(p => p.status === 'active');
      
      if (activeProgram) {
        return NextResponse.json({ scenarioId: scenario.id });
      }
    }
    
    // No existing scenario found for this career type
    return NextResponse.json({ scenarioId: null });
  } catch (error) {
    console.error('Error in GET /api/discovery/scenarios/find-by-career:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}