import { NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function GET() {
  try {
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // Test 1: Get active scenarios
    const activeScenarios = await scenarioRepo.findActive?.() || [];
    
    // Test 2: Get scenarios by mode
    const assessmentScenarios = await scenarioRepo.findByMode?.('assessment') || [];
    const pblScenarios = await scenarioRepo.findByMode?.('pbl') || [];
    const discoveryScenarios = await scenarioRepo.findByMode?.('discovery') || [];
    
    return NextResponse.json({
      success: true,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      usePostgres: process.env.USE_POSTGRES,
      counts: {
        active: activeScenarios.length,
        assessment: assessmentScenarios.length,
        pbl: pblScenarios.length,
        discovery: discoveryScenarios.length
      },
      scenarios: {
        active: activeScenarios,
        assessment: assessmentScenarios,
        pbl: pblScenarios,
        discovery: discoveryScenarios
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}