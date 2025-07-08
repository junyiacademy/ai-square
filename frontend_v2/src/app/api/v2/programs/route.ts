/**
 * V2 Programs API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/v2/utils/auth';
import { ProgramRepository } from '@/lib/v2/repositories/program.repository';
import { ScenarioRepository } from '@/lib/v2/repositories/scenario.repository';
import { StorageFactory } from '@/lib/v2/storage/storage.factory';

// GET /api/v2/programs - List programs for a scenario
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const scenarioId = searchParams.get('scenarioId');

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'scenarioId is required' },
        { status: 400 }
      );
    }

    const storage = await StorageFactory.getStorage();
    const scenarioRepo = new ScenarioRepository(storage);
    const programRepo = new ProgramRepository(storage);
    
    // Verify scenario ownership
    const scenario = await scenarioRepo.findById(scenarioId);
    if (!scenario || scenario.user_id !== user.email) {
      return NextResponse.json(
        { error: 'Scenario not found or access denied' },
        { status: 403 }
      );
    }

    const programs = await programRepo.findByScenario(scenarioId);

    return NextResponse.json({
      programs,
      count: programs.length,
      active: programs.find(p => p.status === 'active')
    });
  } catch (error) {
    console.error('Error fetching programs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch programs' },
      { status: 500 }
    );
  }
}