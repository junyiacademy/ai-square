import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function GET(request: NextRequest) {
  try {
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    const userEmail = session.user.email;
    const { searchParams } = new URL(request.url);
    const careerType = searchParams.get('career');
    
    if (!careerType) {
      return NextResponse.json({ error: 'Career type required' }, { status: 400 });
    }
    
    // In v2 architecture, we search scenarios by their metadata
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    
    // Find all discovery scenarios
    const rawScenarios = await scenarioRepo.findByMode?.('discovery');
    const allScenarios = rawScenarios || [];
    const discoveryScenarios = allScenarios.filter((s) => {
      const metadata = s.metadata as Record<string, unknown>;
      return metadata?.careerType === careerType;
    });
    
    // Check if user has an active program for any of these scenarios
    for (const scenario of discoveryScenarios) {
      const rawPrograms = await programRepo.findByScenario(scenario.id);
      const allPrograms = rawPrograms || [];
      const userPrograms = allPrograms.filter((p) => p.userId === userEmail);
      const activeProgram = userPrograms.find((p) => p.status === 'active');
      
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