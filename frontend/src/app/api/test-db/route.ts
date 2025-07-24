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
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        ENVIRONMENT: process.env.ENVIRONMENT,
        USE_POSTGRES: process.env.USE_POSTGRES,
        DB_HOST: process.env.DB_HOST,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        DB_PORT: process.env.DB_PORT
      },
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
      stack: error instanceof Error ? error.stack : undefined,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        ENVIRONMENT: process.env.ENVIRONMENT,
        USE_POSTGRES: process.env.USE_POSTGRES,
        DB_HOST: process.env.DB_HOST,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        DB_PORT: process.env.DB_PORT
      }
    }, { status: 500 });
  }
}