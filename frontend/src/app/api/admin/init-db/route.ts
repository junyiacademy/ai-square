import { NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { ScenarioType, ScenarioStatus } from '@/lib/repositories/interfaces';

// This endpoint is for staging environment only
export async function POST() {
  // Only allow in staging environment
  if (process.env.ENVIRONMENT !== 'staging') {
    return NextResponse.json(
      { success: false, error: 'This endpoint is only available in staging environment' },
      { status: 403 }
    );
  }

  try {
    // Check if using PostgreSQL
    if (!process.env.USE_POSTGRES) {
      return NextResponse.json(
        { success: false, error: 'PostgreSQL is not enabled' },
        { status: 400 }
      );
    }

    // Use repositories to create sample data
    const userRepo = repositoryFactory.getUserRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // Create sample test user
    try {
      await userRepo.create({
        email: 'staging-test@ai-square.com',
        name: 'Staging Test User',
        preferredLanguage: 'en'
      });
    } catch (error) {
      // User might already exist
      console.log('User creation skipped:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Create sample scenarios
    const scenarios: Array<{ type: ScenarioType; difficultyLevel: string; estimatedMinutes: number; metadata: Record<string, unknown> }> = [
      { type: 'pbl' as ScenarioType, difficultyLevel: 'intermediate', estimatedMinutes: 45, metadata: { id: 'marketing-crisis-management' } },
      { type: 'pbl' as ScenarioType, difficultyLevel: 'beginner', estimatedMinutes: 30, metadata: { id: 'social-media-strategy' } },
      { type: 'pbl' as ScenarioType, difficultyLevel: 'intermediate', estimatedMinutes: 40, metadata: { id: 'customer-service-automation' } },
      { type: 'pbl' as ScenarioType, difficultyLevel: 'advanced', estimatedMinutes: 60, metadata: { id: 'data-privacy-compliance' } },
      { type: 'assessment' as ScenarioType, difficultyLevel: 'intermediate', estimatedMinutes: 30, metadata: { id: 'ai-literacy-assessment' } },
      { type: 'assessment' as ScenarioType, difficultyLevel: 'beginner', estimatedMinutes: 20, metadata: { id: 'basic-ai-knowledge' } },
      { type: 'discovery' as ScenarioType, difficultyLevel: 'beginner', estimatedMinutes: 25, metadata: { id: 'career-exploration' } }
    ];

    for (const scenario of scenarios) {
      try {
        await scenarioRepo.create(scenario);
      } catch (error) {
        // Scenario might already exist
        console.log(`Scenario creation skipped:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Get counts
    const users = await userRepo.findAll({ limit: 1000 });
    const scenariosData = await scenarioRepo.findActive();

    return NextResponse.json({
      success: true,
      message: 'Staging database initialized successfully',
      data: {
        users: users.length,
        scenarios: scenariosData.length
      }
    });

  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}